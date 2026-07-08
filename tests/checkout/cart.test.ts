import { describe, expect, it } from "vitest";
import { resolveCartLine, summarizeCart } from "../../src/lib/checkout/cart";
import type { ActiveProductDetail } from "../../src/lib/catalog/queries";
import type { CartLineReference } from "../../src/lib/checkout/cart-cookie";

function makeProduct(overrides: Partial<ActiveProductDetail> = {}): ActiveProductDetail {
  return {
    id: 1,
    name: "Test Shirt",
    description: null,
    basePriceCents: 2000,
    weightOz: null,
    lengthIn: null,
    widthIn: null,
    heightIn: null,
    images: [],
    processingOptions: [],
    stylingOptions: [],
    materialOptions: [],
    sizeOptions: [{ id: 10, label: "Large", priceAdjustmentCents: 500 }],
    colorOptions: [],
    designLocationOptions: [],
    ...overrides,
  };
}

function makeReference(overrides: Partial<CartLineReference> = {}): CartLineReference {
  return {
    productId: 1,
    designLocationOptionIds: [],
    quantity: 1,
    ...overrides,
  };
}

describe("resolveCartLine", () => {
  it("prices a line using the product's current base price and selected options", () => {
    const line = resolveCartLine(makeReference({ sizeOptionId: 10, quantity: 2 }), makeProduct());
    expect(line.unavailable).toBe(false);
    expect(line.unitPriceCents).toBe(2500);
    expect(line.lineTotalCents).toBe(5000);
    expect(line.selectedOptions).toEqual([
      { category: "Size", label: "Large", priceAdjustmentCents: 500 },
    ]);
  });

  it("reflects a changed product price fresh, never a stale add-time value", () => {
    const reference = makeReference({ sizeOptionId: 10 });
    const originalPriceLine = resolveCartLine(reference, makeProduct({ basePriceCents: 2000 }));
    const changedPriceLine = resolveCartLine(reference, makeProduct({ basePriceCents: 3000 }));
    expect(originalPriceLine.unitPriceCents).toBe(2500);
    expect(changedPriceLine.unitPriceCents).toBe(3500);
  });

  it("flags a line unavailable when the product is no longer Active or doesn't exist", () => {
    const line = resolveCartLine(makeReference(), null);
    expect(line.unavailable).toBe(true);
    expect(line.unitPriceCents).toBe(0);
    expect(line.lineTotalCents).toBe(0);
  });

  it("flags a line unavailable when a selected option no longer exists on the product", () => {
    const line = resolveCartLine(
      makeReference({ sizeOptionId: 999 }),
      makeProduct(), // sizeOptions only contains id 10
    );
    expect(line.unavailable).toBe(true);
  });
});

describe("summarizeCart", () => {
  it("returns a zero subtotal for an empty cart", () => {
    expect(summarizeCart([])).toEqual({ items: [], subtotalCents: 0 });
  });

  it("excludes unavailable lines from the subtotal while still listing them", () => {
    const available = resolveCartLine(makeReference({ sizeOptionId: 10 }), makeProduct());
    const unavailable = resolveCartLine(makeReference(), null);
    const summary = summarizeCart([available, unavailable]);
    expect(summary.items).toHaveLength(2);
    expect(summary.subtotalCents).toBe(available.lineTotalCents);
  });
});
