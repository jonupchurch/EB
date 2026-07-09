import { notFound } from "next/navigation";
import { getOrderConfirmation } from "./actions";
import { ConfirmationStatus } from "./confirmation-status";

// Every visit re-fetches fresh — never a stale confirmation for a
// bookmarked or emailed link (FR-010, US3), and never a cached
// snapshot that could miss a status change.
export const dynamic = "force-dynamic";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getOrderConfirmation(token);

  if (!result.ok) {
    // Never partial or placeholder data for an unmatched token (FR-011)
    // — the same branded not-found page as an unreachable product.
    notFound();
  }

  const confirmation = result.data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-ink">Thank you for your order!</h1>
      <p className="mt-1 text-sm text-muted">Order #{confirmation.confirmationId}</p>

      <ConfirmationStatus token={token} initialStatus={confirmation.status} />

      <div className="mt-8 flex flex-col gap-4">
        {confirmation.items.map((item, index) => (
          <div key={index} className="rounded border border-cream-deeper p-4">
            <p className="font-medium text-ink">{item.name}</p>
            {item.selectedOptions.length > 0 && (
              <p className="text-sm text-muted">{item.selectedOptions.map((o) => o.label).join(", ")}</p>
            )}
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">Qty {item.quantity}</span>
              <span className="text-ink">{formatPrice(item.lineTotalCents)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-cream-deeper pt-6">
        <h2 className="text-sm font-semibold text-ink">Shipping to</h2>
        <p className="mt-1 text-sm text-muted">{confirmation.shippingAddress.name}</p>
        <p className="text-sm text-muted">
          {confirmation.shippingAddress.street1}
          {confirmation.shippingAddress.street2 ? `, ${confirmation.shippingAddress.street2}` : ""}
        </p>
        <p className="text-sm text-muted">
          {confirmation.shippingAddress.city}, {confirmation.shippingAddress.state}{" "}
          {confirmation.shippingAddress.zip}
        </p>
        <p className="text-sm text-muted">{confirmation.shippingAddress.country}</p>
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-cream-deeper pt-6 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="text-ink">{formatPrice(confirmation.subtotalCents)}</span>
        </div>
        {confirmation.discountCents > 0 && (
          <div className="flex justify-between">
            <span className="text-muted">Discount</span>
            <span className="text-ink">-{formatPrice(confirmation.discountCents)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted">Shipping</span>
          <span className="text-ink">{formatPrice(confirmation.shippingCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Tax</span>
          <span className="text-ink">{formatPrice(confirmation.taxCents)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-cream-deeper pt-2 text-base font-semibold">
          <span className="text-ink">Total</span>
          <span className="text-ink">{formatPrice(confirmation.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
