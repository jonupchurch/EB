"use server";

import { z } from "zod";
import { requireAdminSession } from "@/auth";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { getShopSettingsRow, setFlatRateShippingCents, type ShopSettingsData } from "@/lib/admin/shop-settings";

type ActionError = {
  ok: false;
  error: "not_authorized" | "validation_error";
  fieldErrors?: Record<string, string>;
};

type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionError;

const NOT_AUTHORIZED: ActionError = { ok: false, error: "not_authorized" };

/** Powers the shipping & fees screen (US3) — feature 3's checkout reads the same row via getShopSettingsRow directly, no admin session needed. */
export async function getShopSettings(): Promise<ActionResult<ShopSettingsData>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  return { ok: true, data: await getShopSettingsRow() };
}

const centsSchema = z.number().int().min(0, "Must be zero or more");

export async function setFlatRateShipping(
  cents: unknown,
): Promise<ActionResult<{ flatRateShippingCents: number }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = centsSchema.safeParse(cents);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { flatRateShippingCents: "Must be zero or more" },
    };
  }

  await setFlatRateShippingCents(parsed.data);
  return { ok: true, data: { flatRateShippingCents: parsed.data } };
}
