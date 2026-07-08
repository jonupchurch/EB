// The shop's own address — used as the tax nexus origin (tax.ts) and
// the ship-from address (shipping.ts). Configured directly via env
// vars, per spec.md's Assumption that shipping/tax settings are
// "configured directly" until feature 5's admin settings UI exists.

export interface ShopOriginAddress {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function getShopOriginAddress(): ShopOriginAddress {
  return {
    name: process.env.SHOP_ORIGIN_NAME ?? "",
    street1: process.env.SHOP_ORIGIN_STREET1 ?? "",
    city: process.env.SHOP_ORIGIN_CITY ?? "",
    state: process.env.SHOP_ORIGIN_STATE ?? "",
    zip: process.env.SHOP_ORIGIN_ZIP ?? "",
    country: process.env.SHOP_ORIGIN_COUNTRY ?? "US",
  };
}
