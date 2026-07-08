import Link from "next/link";
import { notFound } from "next/navigation";

// Stands in for PayPal's real approval screen during automated tests
// (research.md's fake-provider pattern) — never reachable unless
// CHECKOUT_FAKE_PROVIDERS is explicitly set, so it can never exist in
// a real deployment.
export default async function FakePayPalApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; returnUrl?: string; cancelUrl?: string }>;
}) {
  if (process.env.CHECKOUT_FAKE_PROVIDERS !== "true") {
    notFound();
  }

  const { orderId, returnUrl, cancelUrl } = await searchParams;
  if (!orderId || !returnUrl) {
    notFound();
  }

  const approveHref = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(orderId)}`;

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-xl font-bold text-ink">Fake PayPal (test mode)</h1>
      <p className="mt-2 text-muted">
        This stands in for PayPal&apos;s real approval screen during automated tests.
      </p>
      <p className="mt-4 text-sm text-muted">Order: {orderId}</p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={approveHref}
          className="rounded bg-teal px-6 py-3 text-sm font-medium text-white"
        >
          Approve Payment (test)
        </Link>
        {cancelUrl && (
          <Link href={cancelUrl} className="text-sm text-muted underline">
            Cancel
          </Link>
        )}
      </div>
    </div>
  );
}
