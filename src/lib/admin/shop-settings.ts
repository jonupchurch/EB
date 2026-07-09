// shop_settings is a single-row table (research.md's "single-row
// table" decision) — id is always 1. Kept separate from the admin
// Server Action (which gates on requireAdminSession) so feature 3's
// checkout can read the same row without an admin session — checkout
// is public, unauthenticated.

import { db } from "@/db";
import { shopSettings } from "@/db/schema";

const SHOP_SETTINGS_ID = 1;

export interface ShopSettingsData {
  flatRateShippingCents: number | null;
}

export async function getShopSettingsRow(): Promise<ShopSettingsData> {
  const row = await db.query.shopSettings.findFirst({
    where: (fields, { eq }) => eq(fields.id, SHOP_SETTINGS_ID),
  });
  return { flatRateShippingCents: row?.flatRateShippingCents ?? null };
}

export async function setFlatRateShippingCents(cents: number): Promise<void> {
  await db
    .insert(shopSettings)
    .values({ id: SHOP_SETTINGS_ID, flatRateShippingCents: cents })
    .onConflictDoUpdate({
      target: shopSettings.id,
      set: { flatRateShippingCents: cents, updatedAt: new Date() },
    });
}
