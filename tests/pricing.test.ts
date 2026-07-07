import { describe, expect, it } from "vitest";
import { calculateTotalCents } from "../src/lib/pricing";

describe("calculateTotalCents", () => {
  it("returns the base price when no options are selected", () => {
    expect(calculateTotalCents(1000, [])).toBe(1000);
  });

  it("adds a single option's adjustment", () => {
    expect(calculateTotalCents(1000, [{ priceAdjustmentCents: 200 }])).toBe(1200);
  });

  it("sums adjustments across multiple categories", () => {
    expect(
      calculateTotalCents(1000, [
        { priceAdjustmentCents: 200 },
        { priceAdjustmentCents: 150 },
        { priceAdjustmentCents: 0 },
      ]),
    ).toBe(1350);
  });

  it("applies a negative adjustment (e.g. a children's-sizing discount)", () => {
    expect(calculateTotalCents(1000, [{ priceAdjustmentCents: -400 }])).toBe(600);
  });
});
