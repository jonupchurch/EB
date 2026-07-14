// Validates and applies at most one promotion per order
// (research.md's "Promotion resolution rule"): a valid, applicable
// promo code wins if entered; otherwise the single best-value active
// automatic (codeless) promotion applies, if any qualify. Never
// stacked. Feature 5 (not yet built) owns creating/editing these rows
// — this feature only reads and applies them.

import { db } from "@/db";
import { promotions } from "@/db/schema";

export type PromotionType = "flat" | "bogo" | "promo_code" | "cart_threshold" | "free_shipping";

// Feature 7: orthogonal to `type` — only meaningful for "flat"/"promo_code",
// which have a computed dollar value; every other type ignores this.
export type PromotionValueMode = "flat" | "percentage";

export interface PromotionRecord {
  id: number;
  type: PromotionType;
  promoCode: string | null;
  discountAmountCents: number | null;
  thresholdCents: number | null;
  valueMode: PromotionValueMode;
  discountPercent: number | null;
  maxDiscountCents: number | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface CartItemForPromotion {
  unitPriceCents: number;
  quantity: number;
}

export interface DiscountCalculation {
  discountCents: number;
  freeShipping: boolean;
  applicable: boolean;
}

export type PromoCodeError = "not_found" | "inactive" | "not_yet_active" | "expired" | "not_applicable";

export interface ApplicablePromotionResult {
  promotion: PromotionRecord | null;
  discountCents: number;
  freeShipping: boolean;
}

/** Pure: is `promotion` currently within its optional active window? */
export function isWithinWindow(promotion: PromotionRecord, now: Date): boolean {
  if (promotion.startsAt && now < promotion.startsAt) return false;
  if (promotion.endsAt && now > promotion.endsAt) return false;
  return true;
}

/**
 * Pure: the dollar value of a "flat" or "promo_code" promotion, honoring
 * `valueMode` — a stored flat cents amount, or a percentage of the
 * subtotal (rounded to the nearest cent, then clamped to any configured
 * `maxDiscountCents` cap). Always clamped to `subtotalCents` last, so a
 * discount can never exceed the cart itself.
 */
function discountForFlatOrPercentage(promotion: PromotionRecord, subtotalCents: number): number {
  if (promotion.valueMode === "percentage") {
    const raw = Math.round((subtotalCents * (promotion.discountPercent ?? 0)) / 100);
    const capped =
      promotion.maxDiscountCents !== null ? Math.min(raw, promotion.maxDiscountCents) : raw;
    return Math.min(capped, subtotalCents);
  }
  return Math.min(promotion.discountAmountCents ?? 0, subtotalCents);
}

/**
 * Pure: computes what `promotion` would discount for a given cart,
 * without deciding whether it's the one that ultimately applies.
 */
export function calculateDiscount(
  promotion: PromotionRecord,
  cartItems: CartItemForPromotion[],
  subtotalCents: number,
): DiscountCalculation {
  switch (promotion.type) {
    case "flat":
      return {
        discountCents: discountForFlatOrPercentage(promotion, subtotalCents),
        freeShipping: false,
        applicable: true,
      };

    case "promo_code": {
      const meetsThreshold =
        promotion.thresholdCents === null || subtotalCents >= promotion.thresholdCents;
      if (!meetsThreshold) {
        return { discountCents: 0, freeShipping: false, applicable: false };
      }
      return {
        discountCents: discountForFlatOrPercentage(promotion, subtotalCents),
        freeShipping: false,
        applicable: true,
      };
    }

    case "cart_threshold": {
      const meetsThreshold = subtotalCents >= (promotion.thresholdCents ?? Infinity);
      if (!meetsThreshold) {
        return { discountCents: 0, freeShipping: false, applicable: false };
      }
      return {
        discountCents: Math.min(promotion.discountAmountCents ?? 0, subtotalCents),
        freeShipping: false,
        applicable: true,
      };
    }

    case "free_shipping":
      return { discountCents: 0, freeShipping: true, applicable: true };

    case "bogo": {
      // No per-product scoping exists on Promotion yet (feature 5's
      // admin UI doesn't exist), so BOGO is interpreted cart-wide: with
      // 2+ total units in the cart, the single cheapest unit is free.
      const unitPrices = cartItems.flatMap((item) => Array(item.quantity).fill(item.unitPriceCents));
      if (unitPrices.length < 2) {
        return { discountCents: 0, freeShipping: false, applicable: false };
      }
      return { discountCents: Math.min(...unitPrices), freeShipping: false, applicable: true };
    }
  }
}

function toPromotionRecord(row: typeof promotions.$inferSelect): PromotionRecord {
  return {
    id: row.id,
    type: row.type,
    promoCode: row.promoCode,
    discountAmountCents: row.discountAmountCents,
    thresholdCents: row.thresholdCents,
    valueMode: row.valueMode,
    discountPercent: row.discountPercent,
    maxDiscountCents: row.maxDiscountCents,
    active: row.active,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}

export async function validatePromoCode(
  code: string,
  cartItems: CartItemForPromotion[],
  subtotalCents: number,
): Promise<{ ok: true; promotion: PromotionRecord; discountCents: number } | { ok: false; error: PromoCodeError }> {
  const row = await db.query.promotions.findFirst({
    where: (promotions, { and, eq, sql }) =>
      and(eq(promotions.type, "promo_code"), sql`lower(${promotions.promoCode}) = lower(${code})`),
  });

  if (!row) return { ok: false, error: "not_found" };

  const promotion = toPromotionRecord(row);
  if (!promotion.active) return { ok: false, error: "inactive" };

  const now = new Date();
  if (promotion.startsAt && now < promotion.startsAt) return { ok: false, error: "not_yet_active" };
  if (promotion.endsAt && now > promotion.endsAt) return { ok: false, error: "expired" };

  const result = calculateDiscount(promotion, cartItems, subtotalCents);
  if (!result.applicable) return { ok: false, error: "not_applicable" };

  return { ok: true, promotion, discountCents: result.discountCents };
}

async function getActiveAutomaticPromotions(now: Date): Promise<PromotionRecord[]> {
  const rows = await db.query.promotions.findMany({
    where: (promotions, { and, eq, ne }) => and(eq(promotions.active, true), ne(promotions.type, "promo_code")),
  });
  return rows.map(toPromotionRecord).filter((p) => isWithinWindow(p, now));
}

export async function resolveApplicablePromotion(
  cartItems: CartItemForPromotion[],
  subtotalCents: number,
  shippingCents: number,
  promoCode?: string,
): Promise<ApplicablePromotionResult> {
  if (promoCode) {
    const result = await validatePromoCode(promoCode, cartItems, subtotalCents);
    if (!result.ok) {
      throw new PromoCodeInvalidError(result.error);
    }
    return { promotion: result.promotion, discountCents: result.discountCents, freeShipping: false };
  }

  const automatic = await getActiveAutomaticPromotions(new Date());
  return pickBestPromotion(automatic, cartItems, subtotalCents, shippingCents);
}

/**
 * Pure: given every currently-active, in-window automatic promotion,
 * picks the single highest-value one for this cart — never stacked
 * (FR-010). Extracted from `resolveApplicablePromotion` so this
 * comparison (which must correctly weigh a percentage promotion against
 * a flat one, FR-009) is unit-testable without touching the database.
 */
export function pickBestPromotion(
  automatic: PromotionRecord[],
  cartItems: CartItemForPromotion[],
  subtotalCents: number,
  shippingCents: number,
): ApplicablePromotionResult {
  const candidates = automatic
    .map((promotion) => ({ promotion, ...calculateDiscount(promotion, cartItems, subtotalCents) }))
    .filter((c) => c.applicable && (c.discountCents > 0 || c.freeShipping));

  if (candidates.length === 0) {
    return { promotion: null, discountCents: 0, freeShipping: false };
  }

  const effectiveValue = (c: (typeof candidates)[number]) =>
    c.discountCents + (c.freeShipping ? shippingCents : 0);

  const best = candidates.reduce((max, c) => (effectiveValue(c) > effectiveValue(max) ? c : max));

  return { promotion: best.promotion, discountCents: best.discountCents, freeShipping: best.freeShipping };
}

export class PromoCodeInvalidError extends Error {
  constructor(public readonly reason: PromoCodeError) {
    super(`Promo code invalid: ${reason}`);
    this.name = "PromoCodeInvalidError";
  }
}
