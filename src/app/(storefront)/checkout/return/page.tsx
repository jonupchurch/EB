import { redirect } from "next/navigation";
import { db } from "@/db";
import { capturePayPalOrder } from "@/lib/checkout/paypal";

// Where PayPal redirects the customer back to after approval. Capture
// finalizes payment on PayPal's side, but never marks our Order paid
// directly (FR-012) — only the verified webhook does that
// (src/app/api/webhooks/paypal/route.ts). This page's only job is to
// resolve the PayPal-side token back to our order's own
// confirmationToken and hand off to the real confirmation experience
// (feature 4, FR-001) — it renders nothing of its own on the happy path.
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

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-muted">
          We couldn&apos;t find your order. Please contact us if you were charged.
        </p>
      </div>
    );
  }

  redirect(`/orders/${order.confirmationToken}`);
}
