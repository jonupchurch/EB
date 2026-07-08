import { db } from "@/db";
import { capturePayPalOrder } from "@/lib/checkout/paypal";

// Where PayPal redirects the customer back to after approval. Capture
// finalizes payment on PayPal's side, but never marks our Order paid
// directly (FR-012) — only the verified webhook does that
// (src/app/api/webhooks/paypal/route.ts). This page's job is limited
// to a minimal acknowledgment; the real confirmation experience
// (order details, status timeline, email) is a separate, later
// feature that reads the paid order this feature creates.
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-muted">
          We couldn&apos;t find your payment. Please contact us if you were charged.
        </p>
      </div>
    );
  }

  await capturePayPalOrder(token);

  const order = await db.query.orders.findFirst({
    where: (orders, { eq }) => eq(orders.paypalOrderId, token),
  });

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-xl font-bold text-ink">
        {order?.status === "paid" ? "Payment confirmed!" : "Thank you for your order!"}
      </h1>
      <p className="mt-2 text-muted">
        {order?.status === "paid"
          ? "Your payment has been verified and your order is on its way to being made."
          : "We're confirming your payment now — this only takes a moment. You'll receive a confirmation email once it's complete."}
      </p>
    </div>
  );
}
