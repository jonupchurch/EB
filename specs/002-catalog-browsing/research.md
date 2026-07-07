# Research: Catalog & Browsing

Phase 0 output for `specs/002-catalog-browsing/plan.md`. No
`[NEEDS CLARIFICATION]` markers remained in the Technical Context — the
ratified constitution, feature 1's accepted decisions, and the
already-reviewed wireframe already settled the surrounding
infrastructure. The decisions below are specific to this feature.

## Rendering strategy for catalog/product pages

- **Decision**: render dynamically (SSR) — every browse and product
  detail request queries the database fresh; no static generation or
  time-based revalidation (ISR) for these pages.
- **Rationale**: FR-002/SC-002 require that a Draft product is *never*
  reachable, under any circumstance — including the moment right after
  an admin flips a product from Active to Draft. A cached/statically
  generated page could keep serving that now-Draft product's data for
  the length of its revalidation window, a real correctness gap, not
  just a staleness annoyance. Traffic scale here is one small business's
  storefront, not a high-traffic site — the performance cost of always
  querying fresh is negligible at this scale, so there's no real reason
  to accept the correctness risk for a caching benefit that isn't
  needed yet.
- **Alternatives considered**: ISR with a short revalidation window
  (e.g., 60s) — rejected for the reason above; the Draft-hiding
  guarantee is a hard requirement (FR-002), not a nice-to-have, and
  "usually fresh within a minute" isn't the same as "never." Full
  static generation at build time — rejected outright; this catalog
  changes whenever the owner edits a product, which static generation
  can't reflect without a rebuild.
- **This is a real, project-visible tradeoff** — `docs/adr/0010-catalog-rendering-strategy.md`
  MUST be authored during `/speckit-tasks`/implementation.

## Reused pricing logic

- **Decision**: the product detail page's live price preview calls the
  same `src/lib/pricing.ts` function feature 1's admin editor uses —
  no second implementation.
- **Rationale**: feature 1's own success criterion (SC-005) exists
  specifically so the admin's displayed total never drifts from the
  true sum; reusing the identical function guarantees the customer-facing
  preview can't disagree with it either. Feature 1's plan already
  places this function outside `admin/` for exactly this reuse.
- **Alternatives considered**: reimplementing the same sum in a
  storefront-specific module — rejected; two implementations of the
  same arithmetic is exactly the kind of drift risk SC-005 exists to
  prevent, for no benefit.

## Route structure: a separate storefront layout

- **Decision**: a new `(storefront)` route group with its own
  `layout.tsx`, kept separate from `/admin`'s existing layout.
- **Rationale**: Next.js App Router nests layouts by directory. If the
  real branded storefront shell were placed in the true root
  `src/app/layout.tsx`, it would wrap `/admin` too, visually colliding
  with the admin shell feature 1 already built. A route group avoids
  this without needing a URL prefix (the group's segment name doesn't
  appear in the URL).
- **Alternatives considered**: put the storefront nav directly in the
  root layout and have `/admin` override/hide it via CSS — rejected;
  fragile, and relies on the admin layout suppressing something it
  never asked to render, rather than the two shells being cleanly
  independent.

## Processing-option customer-selectability

- **Decision**: filter out any processing option where
  `requiresCustomerUpload = true` (feature 1's `docs/adr/0007`-covered
  schema, amended to add this flag) via a small pure function,
  `isCustomerSelectable(option)`, called from the query layer
  (`src/lib/catalog/queries.ts`) — never a client-side/UI-only filter.
- **Rationale**: string-matching on a processing option's label (e.g.,
  checking for "bring your own design") would be fragile — the owner
  could rename or rephrase a label at any time via feature 1's editor,
  silently breaking the filter. A boolean flag the owner explicitly
  sets is unambiguous and doesn't depend on wording. Filtering
  server-side (in the query, not just hiding the choice in the UI)
  matches this project's "never trust the client" discipline applied
  to what's exposed, not just what's priced.
- **Alternatives considered**: a hardcoded list of "known deferred"
  option labels — rejected for the fragility reason above; this was
  the actual gap caught while planning this feature, leading to
  amending feature 1's spec/data-model (FR-016) rather than working
  around it here.

## Reused infrastructure (not re-decided)

- **Database, ORM**: unchanged from ADR-0001/0002/0008 — Neon Postgres
  in Production/Preview, local Postgres in dev, Drizzle for queries.
- **File storage**: unchanged from ADR-0009 — product images already
  live in Vercel Blob; this feature only reads their URLs, no new
  upload path.
- **Accessibility bar**: unchanged from Principle III as amended — WCAG
  2.1 AA is the target, not a hard CI-blocking gate; the wireframe
  exceptions already tracked in ADR-0003/0004 carry forward into the
  real storefront built from this feature.

## Architecture Decision Records

- `docs/adr/0010-catalog-rendering-strategy.md` (new, per "Rendering
  strategy for catalog/product pages" above) — the only new ADR this
  feature owes. Everything else (database, ORM, file storage,
  accessibility bar, pricing logic, the processing-option flag) is
  inherited from feature 1's decisions and not re-litigated.
