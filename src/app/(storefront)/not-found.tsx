import Link from "next/link";

// Shared by any storefront URL that doesn't resolve — including a
// Draft or nonexistent product id (FR-002/FR-009): both cases render
// identically, with no product data ever shown.
export default function StorefrontNotFound() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-muted">
        We couldn&apos;t find what you&apos;re looking for. It may have been removed or the link
        may be incorrect.
      </p>
      <Link href="/" className="mt-6 font-medium text-teal hover:underline">
        Back to shop
      </Link>
    </div>
  );
}
