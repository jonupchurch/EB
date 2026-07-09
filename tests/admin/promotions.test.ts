import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../src/db";
import { orders, promotions } from "../../src/db/schema";
import {
  createPromotionRow,
  deletePromotionRow,
  updatePromotionRow,
} from "../../src/lib/admin/promotion-crud";
import type { PromotionInput } from "../../src/lib/admin/schemas";

function promoInput(overrides: Partial<PromotionInput> = {}): PromotionInput {
  return {
    type: "flat",
    active: true,
    discountAmountCents: 500,
    ...overrides,
  };
}

async function insertTestOrder(promotionId: number | null) {
  const [order] = await db
    .insert(orders)
    .values({
      status: "paid",
      subtotalCents: 2000,
      discountCents: 500,
      promotionId,
      shippingMethod: "flat",
      shippingCents: 500,
      taxCents: 160,
      totalCents: 2160,
      shippingName: "Test Buyer",
      shippingLine1: "123 Test St",
      shippingCity: "Cleveland",
      shippingState: "OH",
      shippingZip: "44101",
      shippingCountry: "US",
      customerEmail: "buyer@example.com",
      paypalOrderId: `TEST-${crypto.randomUUID()}`,
      confirmationToken: crypto.randomUUID(),
    })
    .returning();
  return order;
}

describe("promotion CRUD", () => {
  const insertedPromotionIds: number[] = [];
  const insertedOrderIds: number[] = [];

  afterEach(async () => {
    for (const id of insertedOrderIds.splice(0)) {
      await db.delete(orders).where(eq(orders.id, id));
    }
    for (const id of insertedPromotionIds.splice(0)) {
      await db.delete(promotions).where(eq(promotions.id, id));
    }
  });

  it("rejects a second active promo-code promotion reusing an existing code, any casing (FR-010)", async () => {
    const code = `WELCOME${Date.now()}`;

    const first = await createPromotionRow(
      promoInput({ type: "promo_code", promoCode: code, discountAmountCents: 500 }),
    );
    expect(first.ok).toBe(true);
    if (first.ok) insertedPromotionIds.push(first.data.id);

    const second = await createPromotionRow(
      promoInput({ type: "promo_code", promoCode: code.toLowerCase(), discountAmountCents: 300 }),
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("duplicate_code");
  });

  it("requires type-specific fields before ever reaching the database (FR-006)", async () => {
    const result = await createPromotionRow(promoInput({ type: "flat", discountAmountCents: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok && result.error === "validation_error") {
      expect(result.fieldErrors.discountAmountCents).toBeTruthy();
    } else {
      throw new Error("expected a validation_error");
    }
  });

  it("deactivating, then deleting, a promotion already applied to a real order leaves that order's recorded discount unchanged both times (FR-009)", async () => {
    const created = await createPromotionRow(promoInput({ discountAmountCents: 500 }));
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("setup failed");
    insertedPromotionIds.push(created.data.id);

    const order = await insertTestOrder(created.data.id);
    insertedOrderIds.push(order.id);

    // Deactivate — the order's own recorded discount must be untouched.
    const deactivated = await updatePromotionRow(created.data.id, promoInput({ active: false }));
    expect(deactivated.ok).toBe(true);

    const afterDeactivate = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, order.id) });
    expect(afterDeactivate?.discountCents).toBe(500);
    expect(afterDeactivate?.promotionId).toBe(created.data.id);

    // Delete — the FK's ON DELETE SET NULL clears the reference, but
    // the order's own discountCents (the actually-charged amount)
    // stays exactly as it was.
    const deleted = await deletePromotionRow(created.data.id);
    expect(deleted.ok).toBe(true);
    insertedPromotionIds.length = 0; // already gone — nothing left to clean up

    const afterDelete = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, order.id) });
    expect(afterDelete?.discountCents).toBe(500);
    expect(afterDelete?.promotionId).toBeNull();
  });
});
