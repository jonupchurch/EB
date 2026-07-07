import { describe, expect, it } from "vitest";
import { productSchema } from "../../src/lib/admin/schemas";

const validProduct = {
  name: "Classic Tee",
  basePriceCents: 1800,
  processingOptions: [{ label: "Standard Printed", priceAdjustmentCents: 0 }],
  stylingOptions: [],
  materialOptions: [],
  sizeOptions: [{ label: "M" }],
  colorOptions: [],
  designLocationOptions: [],
};

describe("productSchema", () => {
  it("accepts a valid full product", () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const rest: Record<string, unknown> = { ...validProduct };
    delete rest.name;
    const result = productSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects a missing basePriceCents", () => {
    const rest: Record<string, unknown> = { ...validProduct };
    delete rest.basePriceCents;
    const result = productSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects a negative basePriceCents", () => {
    const result = productSchema.safeParse({ ...validProduct, basePriceCents: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects an option row missing its label", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      sizeOptions: [{ priceAdjustmentCents: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("defaults an option row's priceAdjustmentCents to 0 when omitted (never blocks the save)", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      sizeOptions: [{ label: "L" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sizeOptions[0].priceAdjustmentCents).toBe(0);
    }
  });
});
