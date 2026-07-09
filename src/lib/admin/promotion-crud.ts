// Promotion CRUD logic (feature 5), kept separate from the Server
// Action that calls it (which depends on next/headers via
// requireAdminSession, so isn't directly unit-testable itself) —
// mirrors this project's established pattern (order-status.ts,
// src/lib/confirmation/email.ts).

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { promotions } from "@/db/schema";
import type { PromotionType } from "@/lib/checkout/promotions";
import type { PromotionInput } from "./schemas";

export interface PromotionListItem {
  id: number;
  type: PromotionType;
  promoCode: string | null;
  discountAmountCents: number | null;
  thresholdCents: number | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

export type PromotionCrudResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "validation_error"; fieldErrors: Record<string, string> }
  | { ok: false; error: "duplicate_code"; fieldErrors: Record<string, string> };

export async function listPromotionRows(): Promise<PromotionListItem[]> {
  return db.query.promotions.findMany({ orderBy: (fields, { desc }) => [desc(fields.createdAt)] });
}

/**
 * Pure: which fields are actually required for `data.type`
 * (data-model.md's per-type rules — matches
 * src/lib/checkout/promotions.ts's real evaluation logic exactly, not
 * the wireframe's aspirational fields like a percentage discount or a
 * usage limit, neither of which this schema or checkout supports).
 */
export function typeSpecificFieldError(data: PromotionInput): Record<string, string> | null {
  switch (data.type) {
    case "flat":
      return data.discountAmountCents === undefined
        ? { discountAmountCents: "A discount amount is required" }
        : null;
    case "promo_code": {
      const errors: Record<string, string> = {};
      if (!data.promoCode) errors.promoCode = "A promo code is required";
      if (data.discountAmountCents === undefined) {
        errors.discountAmountCents = "A discount amount is required";
      }
      return Object.keys(errors).length > 0 ? errors : null;
    }
    case "cart_threshold": {
      const errors: Record<string, string> = {};
      if (data.thresholdCents === undefined) errors.thresholdCents = "A cart threshold is required";
      if (data.discountAmountCents === undefined) {
        errors.discountAmountCents = "A discount amount is required";
      }
      return Object.keys(errors).length > 0 ? errors : null;
    }
    case "bogo":
    case "free_shipping":
      return null;
  }
}

// A promo_code type stores its code; every other type never sets one
// (promotions_promo_code_lower_idx is a global, case-insensitive
// unique index — not scoped to active rows — so this also guards
// against a DB constraint violation surfacing as a raw 500).
function promoCodeForType(data: PromotionInput): string | null {
  return data.type === "promo_code" ? (data.promoCode ?? null) : null;
}

export async function createPromotionRow(data: PromotionInput): Promise<PromotionCrudResult<{ id: number }>> {
  const fieldErrors = typeSpecificFieldError(data);
  if (fieldErrors) return { ok: false, error: "validation_error", fieldErrors };

  try {
    const [row] = await db
      .insert(promotions)
      .values({
        type: data.type,
        promoCode: promoCodeForType(data),
        discountAmountCents: data.discountAmountCents ?? null,
        thresholdCents: data.thresholdCents ?? null,
        active: data.active,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
      })
      .returning({ id: promotions.id });
    return { ok: true, data: { id: row.id } };
  } catch {
    return {
      ok: false,
      error: "duplicate_code",
      fieldErrors: { promoCode: "A promotion with this code already exists" },
    };
  }
}

export async function updatePromotionRow(
  id: number,
  data: PromotionInput,
): Promise<PromotionCrudResult<{ id: number }>> {
  const fieldErrors = typeSpecificFieldError(data);
  if (fieldErrors) return { ok: false, error: "validation_error", fieldErrors };

  try {
    const [row] = await db
      .update(promotions)
      .set({
        type: data.type,
        promoCode: promoCodeForType(data),
        discountAmountCents: data.discountAmountCents ?? null,
        thresholdCents: data.thresholdCents ?? null,
        active: data.active,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
      })
      .where(eq(promotions.id, id))
      .returning({ id: promotions.id });
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true, data: { id: row.id } };
  } catch {
    return {
      ok: false,
      error: "duplicate_code",
      fieldErrors: { promoCode: "A promotion with this code already exists" },
    };
  }
}

/**
 * Deliberately thin (FR-008, FR-009): no lookup into `orders` at all.
 * Safety comes entirely from `orders.promotionId`'s `ON DELETE SET
 * NULL` foreign key — an order's own `discountCents` was already the
 * frozen, actually-charged amount, so it's unaffected either way.
 */
export async function deletePromotionRow(id: number): Promise<PromotionCrudResult<null>> {
  const deleted = await db.delete(promotions).where(eq(promotions.id, id)).returning({ id: promotions.id });
  if (deleted.length === 0) return { ok: false, error: "not_found" };
  return { ok: true, data: null };
}
