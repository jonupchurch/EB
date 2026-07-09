import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../src/db";
import { orders } from "../../src/db/schema";
import { sendConfirmationEmail } from "../../src/lib/confirmation/email";

async function insertTestOrder(overrides: Partial<typeof orders.$inferInsert> = {}) {
  const [order] = await db
    .insert(orders)
    .values({
      status: "paid",
      subtotalCents: 2000,
      discountCents: 0,
      shippingMethod: "flat",
      shippingCents: 500,
      taxCents: 160,
      totalCents: 2660,
      shippingName: "Test Buyer",
      shippingLine1: "123 Test St",
      shippingCity: "Cleveland",
      shippingState: "OH",
      shippingZip: "44101",
      shippingCountry: "US",
      customerEmail: "buyer@example.com",
      paypalOrderId: `TEST-${crypto.randomUUID()}`,
      confirmationToken: crypto.randomUUID(),
      ...overrides,
    })
    .returning();
  return order;
}

describe("sendConfirmationEmail", () => {
  const insertedOrderIds: number[] = [];

  afterEach(async () => {
    for (const id of insertedOrderIds.splice(0)) {
      await db.delete(orders).where(eq(orders.id, id));
    }
  });

  it("sends and marks confirmationEmailSentAt for a paid, not-yet-sent order (FR-006)", async () => {
    const order = await insertTestOrder();
    insertedOrderIds.push(order.id);

    const result = await sendConfirmationEmail(order.id);
    expect(result.sent).toBe(true);

    const refreshed = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, order.id) });
    expect(refreshed?.confirmationEmailSentAt).not.toBeNull();
  });

  it("never sends a second time once already sent, regardless of how many times it's processed (FR-008)", async () => {
    const order = await insertTestOrder();
    insertedOrderIds.push(order.id);

    const first = await sendConfirmationEmail(order.id);
    expect(first.sent).toBe(true);
    const afterFirst = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, order.id) });

    const second = await sendConfirmationEmail(order.id);
    expect(second.sent).toBe(false);
    const afterSecond = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, order.id) });

    expect(afterSecond?.confirmationEmailSentAt).toEqual(afterFirst?.confirmationEmailSentAt);
  });

  it("never sends for an order that isn't verified paid yet (FR-007)", async () => {
    const order = await insertTestOrder({ status: "placed" });
    insertedOrderIds.push(order.id);

    const result = await sendConfirmationEmail(order.id);
    expect(result.sent).toBe(false);

    const refreshed = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, order.id) });
    expect(refreshed?.confirmationEmailSentAt).toBeNull();
  });

  it("catches a provider delivery failure without throwing or affecting the order's paid status (FR-009)", async () => {
    const order = await insertTestOrder();
    insertedOrderIds.push(order.id);

    // Force the real (non-fake) delivery path, with no API key
    // configured — a deterministic way to trigger a provider failure
    // without depending on Resend's actual API being reachable.
    const originalFakeFlag = process.env.CHECKOUT_FAKE_PROVIDERS;
    const originalApiKey = process.env.RESEND_API_KEY;
    process.env.CHECKOUT_FAKE_PROVIDERS = "false";
    delete process.env.RESEND_API_KEY;

    try {
      await expect(sendConfirmationEmail(order.id)).resolves.toEqual({ sent: false });
    } finally {
      process.env.CHECKOUT_FAKE_PROVIDERS = originalFakeFlag;
      process.env.RESEND_API_KEY = originalApiKey;
    }

    const refreshed = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, order.id) });
    expect(refreshed?.status).toBe("paid");
  });
});
