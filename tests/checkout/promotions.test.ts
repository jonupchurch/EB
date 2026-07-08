import { describe, expect, it } from "vitest";
import {
  calculateDiscount,
  isWithinWindow,
  type CartItemForPromotion,
  type PromotionRecord,
} from "../../src/lib/checkout/promotions";

function makePromotion(overrides: Partial<PromotionRecord> = {}): PromotionRecord {
  return {
    id: 1,
    type: "flat",
    promoCode: null,
    discountAmountCents: null,
    thresholdCents: null,
    active: true,
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

const oneItem: CartItemForPromotion[] = [{ unitPriceCents: 2000, quantity: 1 }];
const twoDifferentItems: CartItemForPromotion[] = [
  { unitPriceCents: 3000, quantity: 1 },
  { unitPriceCents: 1500, quantity: 1 },
];

describe("calculateDiscount", () => {
  it("flat: discounts a fixed amount, capped at the subtotal", () => {
    const promo = makePromotion({ type: "flat", discountAmountCents: 500 });
    expect(calculateDiscount(promo, oneItem, 2000)).toEqual({
      discountCents: 500,
      freeShipping: false,
      applicable: true,
    });
    // Never discounts below zero, even if the discount exceeds the subtotal.
    expect(calculateDiscount(promo, oneItem, 300).discountCents).toBe(300);
  });

  it("bogo: the cheapest unit is free once 2+ units are in the cart", () => {
    const promo = makePromotion({ type: "bogo" });
    expect(calculateDiscount(promo, twoDifferentItems, 4500)).toEqual({
      discountCents: 1500,
      freeShipping: false,
      applicable: true,
    });
  });

  it("bogo: not applicable with fewer than 2 units", () => {
    const promo = makePromotion({ type: "bogo" });
    expect(calculateDiscount(promo, oneItem, 2000)).toEqual({
      discountCents: 0,
      freeShipping: false,
      applicable: false,
    });
  });

  it("promo_code: applies its discount when the cart meets an optional threshold", () => {
    const promo = makePromotion({
      type: "promo_code",
      promoCode: "SAVE5",
      discountAmountCents: 500,
      thresholdCents: 1000,
    });
    expect(calculateDiscount(promo, oneItem, 2000).applicable).toBe(true);
  });

  it("promo_code: rejected as inapplicable when the cart doesn't meet its threshold", () => {
    const promo = makePromotion({
      type: "promo_code",
      promoCode: "SAVE5",
      discountAmountCents: 500,
      thresholdCents: 5000,
    });
    expect(calculateDiscount(promo, oneItem, 2000)).toEqual({
      discountCents: 0,
      freeShipping: false,
      applicable: false,
    });
  });

  it("cart_threshold: applies only once the subtotal meets the threshold", () => {
    const promo = makePromotion({ type: "cart_threshold", thresholdCents: 4000, discountAmountCents: 1000 });
    expect(calculateDiscount(promo, twoDifferentItems, 3900).applicable).toBe(false);
    expect(calculateDiscount(promo, twoDifferentItems, 4000)).toEqual({
      discountCents: 1000,
      freeShipping: false,
      applicable: true,
    });
  });

  it("free_shipping: never discounts the subtotal, only flags free shipping", () => {
    const promo = makePromotion({ type: "free_shipping" });
    expect(calculateDiscount(promo, oneItem, 2000)).toEqual({
      discountCents: 0,
      freeShipping: true,
      applicable: true,
    });
  });
});

describe("isWithinWindow", () => {
  it("is within window when no start/end dates are set", () => {
    expect(isWithinWindow(makePromotion(), new Date("2026-01-01"))).toBe(true);
  });

  it("rejects a promotion whose end date has already passed (expired)", () => {
    const promo = makePromotion({ endsAt: new Date("2026-01-01") });
    expect(isWithinWindow(promo, new Date("2026-06-01"))).toBe(false);
  });

  it("rejects a promotion that hasn't started yet", () => {
    const promo = makePromotion({ startsAt: new Date("2026-12-01") });
    expect(isWithinWindow(promo, new Date("2026-06-01"))).toBe(false);
  });

  it("accepts a promotion inside its active window", () => {
    const promo = makePromotion({ startsAt: new Date("2026-01-01"), endsAt: new Date("2026-12-31") });
    expect(isWithinWindow(promo, new Date("2026-06-01"))).toBe(true);
  });
});
