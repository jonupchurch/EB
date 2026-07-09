import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { shouldMarkOrderPaid } from "@/lib/checkout/order-math";
import { verifyPayPalWebhook } from "@/lib/checkout/paypal";
import { sendConfirmationEmail } from "@/lib/confirmation/email";

// The only place an Order is ever marked paid (FR-012, FR-013) — never
// the client-side redirect/capture call alone. PayPal retries on any
// non-2xx response, which is the intended fallback for a delayed
// webhook (FR-015): this handler always returns 200 once an event is
// either applied or deliberately not acted on, and only 401 on a
// signature it can't verify.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headerEntries = Object.fromEntries(request.headers.entries());

  const result = await verifyPayPalWebhook(headerEntries, rawBody);
  if (!result.verified) {
    console.error("PayPal webhook: signature verification failed");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { eventType, paypalOrderId } = result.event;
  if (eventType !== "PAYMENT.CAPTURE.COMPLETED" || !paypalOrderId) {
    // A verified event this app doesn't act on — acknowledge so
    // PayPal doesn't keep retrying it.
    return NextResponse.json({ ok: true });
  }

  const order = await db.query.orders.findFirst({
    where: (orders, { eq }) => eq(orders.paypalOrderId, paypalOrderId),
  });
  if (!order) {
    console.error(`PayPal webhook: no order found for paypalOrderId ${paypalOrderId}`);
    return NextResponse.json({ ok: true });
  }

  if (!shouldMarkOrderPaid(order.status)) {
    // Already paid (or beyond) — idempotent no-op, not an error
    // (FR-015: a repeated delivery must never double-process).
    return NextResponse.json({ ok: true });
  }

  await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(orders.id, order.id));

  // Never throws (feature 4) — a delivery failure must not affect this
  // handler's own paid-status guarantee (FR-009).
  await sendConfirmationEmail(order.id);

  return NextResponse.json({ ok: true });
}
