// The one-time order confirmation email, via Resend
// (docs/adr/0015-resend-for-transactional-email.md). Called from
// src/app/api/webhooks/paypal/route.ts immediately after an order is
// marked paid. The send-eligibility check and the send-once flag are
// set atomically, in one conditional UPDATE, so a redelivered webhook
// can never race past it and send twice (FR-008). Behind this
// interface sits a deterministic fake, used whenever
// CHECKOUT_FAKE_PROVIDERS is set (every automated test) — real Resend
// credentials are never exercised in CI.

import { and, eq, isNull } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { buildConfirmationView } from "./view";

function usesFakeProviders(): boolean {
  return process.env.CHECKOUT_FAKE_PROVIDERS === "true";
}

export interface SendConfirmationEmailResult {
  sent: boolean;
}

type ClaimedOrder = typeof orders.$inferSelect;

/**
 * Atomically claims the right to send: only succeeds if the order is
 * paid and hasn't been claimed before. Returns null for every other
 * case (not yet paid, already sent) — a no-op, never an error.
 */
async function claimSend(orderId: number): Promise<ClaimedOrder | null> {
  const [claimed] = await db
    .update(orders)
    .set({ confirmationEmailSentAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "paid"), isNull(orders.confirmationEmailSentAt)))
    .returning();
  return claimed ?? null;
}

async function deliverEmail(order: ClaimedOrder): Promise<void> {
  const items = await db.query.orderItems.findMany({
    where: (fields, { eq }) => eq(fields.orderId, order.id),
    orderBy: (fields, { asc }) => [asc(fields.id)],
  });
  const confirmation = buildConfirmationView(order, items);

  if (usesFakeProviders()) {
    // Deterministic no-op — tests assert against this function's return
    // value and the order's own confirmationEmailSentAt column, never
    // against a real Resend delivery.
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set — cannot send confirmation email.");
  }

  const itemLines = confirmation.items
    .map((item) => `${item.name} x${item.quantity} — ${(item.lineTotalCents / 100).toFixed(2)}`)
    .join("\n");
  const address = [
    order.shippingName,
    `${order.shippingLine1}${order.shippingLine2 ? `, ${order.shippingLine2}` : ""}`,
    `${order.shippingCity}, ${order.shippingState} ${order.shippingZip}`,
    order.shippingCountry,
  ].join("\n");

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "Erica Burns Things <orders@ericaburnsthings.com>",
    to: order.customerEmail,
    subject: `Order confirmation #${confirmation.confirmationId}`,
    text: `Thanks for your order!\n\nOrder #${confirmation.confirmationId}\n\n${itemLines}\n\nTotal: $${(confirmation.totalCents / 100).toFixed(2)}\n\nShipping to:\n${address}`,
  });
}

/**
 * Sends the confirmation email exactly once per order (FR-006, FR-008).
 * Never throws — a delivery failure is caught and logged, and must
 * never affect the order's paid status or the confirmation page's own
 * correctness (FR-009).
 */
export async function sendConfirmationEmail(orderId: number): Promise<SendConfirmationEmailResult> {
  try {
    const claimed = await claimSend(orderId);
    if (!claimed) {
      return { sent: false };
    }

    await deliverEmail(claimed);
    return { sent: true };
  } catch (error) {
    console.error(`sendConfirmationEmail: failed for order ${orderId}`, error);
    return { sent: false };
  }
}
