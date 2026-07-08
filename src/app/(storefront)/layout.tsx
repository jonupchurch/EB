import Link from "next/link";

// Real branded storefront shell (spec.md FR-010), kept in its own route
// group so it never wraps /admin's separate layout (research.md's
// "Route structure" decision — Next.js nests layouts by directory).
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-cream-deeper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/ebt-logo-primary.svg"
              alt="Erica Burns Things"
              className="h-16 w-auto"
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
