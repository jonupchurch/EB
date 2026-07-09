import Link from "next/link";
import { readCart } from "@/lib/checkout/cart-cookie";

// Real branded storefront shell (spec.md FR-010), kept in its own route
// group so it never wraps /admin's separate layout (research.md's
// "Route structure" decision — Next.js nests layouts by directory).
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cookie-only read (no DB round trip) — just enough to show a live
  // item count in the header on every storefront page.
  const cartLines = await readCart();
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-cream-deeper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-1.5">
          <Link href="/" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/ebt-logo-primary.svg"
              alt="Erica Burns Things"
              className="h-24 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-ink">
            <Link href="/" className="hover:text-teal">
              Shop
            </Link>
            {/* Intentional non-functional placeholder for the deferred
                custom-design-upload feature — see docs/future-work.md.
                Not a link: nothing exists yet for it to open. */}
            <span
              className="cursor-not-allowed text-muted"
              title="Coming soon"
              aria-disabled="true"
            >
              Custom
            </span>
            <Link href="/cart" className="flex items-center gap-1.5 hover:text-teal">
              Cart
              {cartCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal px-1.5 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-cream-deeper">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-8 text-sm text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/ebt-icon-seal.svg" alt="" className="h-8 w-8" />
          <p>&copy; {new Date().getFullYear()} Erica Burns Things. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
