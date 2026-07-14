import { describe, expect, it } from "vitest";
import { suggestProductDescription } from "../../src/lib/admin/description-writer";
import { descriptionRequestSchema } from "../../src/lib/admin/schemas";

// vitest.setup.ts forces CHECKOUT_FAKE_PROVIDERS=true, so every call here
// exercises the fake path — no real model call, no cost, deterministic.

describe("suggestProductDescription (fake path)", () => {
  it("generate mode (no currentDescription) reflects the given product fields", async () => {
    const result = await suggestProductDescription({
      name: "Engraved Oak Sign",
      categoryName: "Home & Decor",
      stylingLabels: ["Rustic"],
      materialLabels: ["Oak"],
      basePriceCents: 4500,
    });

    expect(result.description).toContain("Engraved Oak Sign");
    expect(result.description).toContain("Home & Decor");
    expect(result.description).toContain("Rustic");
    expect(result.description).toContain("Oak");
    expect(result.description).toContain("$45.00");
  });

  it("improve mode (currentDescription present) reflects both the current text and product fields", async () => {
    const result = await suggestProductDescription({
      name: "Family Name Sign",
      currentDescription: "A nice sign for your family.",
    });

    expect(result.description).toContain("Family Name Sign");
    expect(result.description).toContain("A nice sign for your family.");
  });

  it("omits fields that weren't provided rather than rendering them blank", async () => {
    const result = await suggestProductDescription({ name: "Plain Mug" });

    expect(result.description).toContain("Plain Mug");
    expect(result.description).not.toContain("undefined");
    expect(result.description).not.toContain("null");
  });
});

describe("descriptionRequestSchema — name required (FR-011)", () => {
  it("rejects a blank or whitespace-only name", () => {
    expect(descriptionRequestSchema.safeParse({ name: "" }).success).toBe(false);
    expect(descriptionRequestSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("accepts a real name with no other fields", () => {
    expect(descriptionRequestSchema.safeParse({ name: "Tote Bag" }).success).toBe(true);
  });
});
