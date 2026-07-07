# Implementation Plan: Catalog & Browsing

**Branch**: `002-catalog-browsing` | **Date**: 2026-07-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-catalog-browsing/spec.md`

## Summary

A public, unauthenticated storefront — replacing the current placeholder homepage — where anyone can browse Active products by category and open a product's detail view to configure its options and see an accurate live price. This is a read-only layer over feature 1's data model: no cart, no checkout, no new persisted entities. It's the second feature in the MVP build order specifically so real products (loaded via feature 1) become visible to a customer for the first time.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22.18.0 LTS (per `.nvmrc`)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Drizzle ORM + `postgres` driver (read-only queries against feature 1's schema, per `docs/adr/0001`, `docs/adr/0002`, `docs/adr/0008`), Tailwind CSS v4, Next.js's built-in `<Image>` component for product photos (served from Vercel Blob, per `docs/adr/0009-vercel-blob-for-product-images.md`)

**Storage**: PostgreSQL — same Neon (Production/Preview) / local (dev) database as feature 1. This feature adds **no new tables** — it queries `categories`, `products`, the six option tables, and `product_images`, always filtered to `status = 'active'`

**Testing**: Vitest (the processing-option customer-selectability filter) and Playwright (browse → open a product → configure options → see an accurate price; a direct request for a Draft product's URL returns not-found)

**Target Platform**: Web, deployed to Vercel (Node.js runtime / Fluid Compute) — same target as feature 1

**Project Type**: Web application — extends the existing single Next.js app; adds a `(storefront)` route group with its own layout, distinct from `/admin`'s

**Performance Goals**: Storefront pages (browse + product detail) target Largest Contentful Paint under 2.5s on a typical broadband connection (the Core Web Vitals "Good" threshold) — the first concrete number for `docs/non-functional.md`'s previously-TBD "product/catalog pages" LCP row, worth folding back into that doc once this feature ships. No blocking main-thread work over 50ms (matches that doc's existing Interaction responsiveness row)

**Constraints**: Every query enforces `status = 'active'` (and, for processing options, `requiresCustomerUpload = false`) server-side in the query layer itself — never as a client-side/UI-only filter, so a Draft product or an unbuildable option can never leak regardless of how a route is reached (mirrors Principle II's "never trust the client" applied to the read side, and feature 1's FR-007/FR-002 guarantees). No admin mutation exists in this feature, so Principle II's rate-limit requirement (scoped to "checkout and admin endpoints") doesn't apply here — this is ordinary public read traffic

**Scale/Scope**: Same single-business scale as feature 1 — an initial catalog of ~22 products across 5 categories; no pagination/infinite-scroll complexity needed at this size (a plain list per category is sufficient)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS, with a task obligation | This feature makes one new architectural call: whether catalog/product pages render dynamically (SSR, always fresh) or statically with revalidation (ISR, cached). `docs/adr/0010-catalog-rendering-strategy.md` MUST be authored during `/speckit-tasks`/implementation. |
| II. Full-Stack Substance & Trustworthy Commerce | PASS | Real Server Components querying the real Postgres data layer — no mocked/static catalog. No payment/checkout in this feature. Draft-hiding and processing-option exclusion are enforced in the query layer, never client-side only (see Constraints above). Rate limiting doesn't apply — Principle II scopes it to "checkout and admin endpoints," and this feature is neither. |
| III. Designed, Accessible Experience | PASS | Built from the already-reviewed `Resources/wireframes/Store Pages.html` (browse, product, cart — this feature builds browse + product only). Contrast issues in that reference are already tracked (ADR-0003/0004). Every state (empty category, product with no images, loading) gets designed, not just the happy path. WCAG 2.1 AA is the target per the softened Principle III. |
| IV. Product Judgment & Scope Discipline | PASS | Scope matches spec.md exactly: browse + product detail/pricing only. No cart, no checkout, no accounts, no search, no live customizer, no inventory display — all explicitly out of scope per spec.md. |
| V. Test Discipline | PASS | Vitest covers the one genuinely new piece of logic (the processing-option customer-selectability filter). The running-total calculation itself is reused, not reinvented (already tested in feature 1). One Playwright e2e covers browse → product detail → configure → price, plus a Draft-product-not-found check (FR-002/SC-002). |
| VI. Legible History | PASS | Conventional Commits, `CHANGELOG.md` entry on push, per the confirmed per-unit-of-work discipline. |

No unjustified violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-catalog-browsing/
├── spec.md               # Feature specification (complete)
├── plan.md               # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── queries.md        # Phase 1 output — read-only query contracts (no mutations exist)
├── quickstart.md         # Phase 1 output
└── tasks.md               # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
PrintingSite/
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # stays minimal (html/body shell only) — unchanged
│   │   ├── page.tsx                     # REMOVED — superseded by (storefront)/page.tsx
│   │   ├── (storefront)/                # NEW route group — its own layout, so /admin's
│   │   │   │                            #   separate shell is never affected
│   │   │   ├── layout.tsx               # NEW — real storefront nav/branding/footer
│   │   │   │                            #   (Resources/wireframes/Store Pages.html)
│   │   │   ├── page.tsx                 # NEW — Browse view (US1); this is the new homepage
│   │   │   └── products/
│   │   │       └── [id]/
│   │   │           └── page.tsx         # NEW — Product Detail + configure view (US2)
│   │   └── admin/                        # unchanged from feature 1 — untouched by this feature
│   ├── lib/
│   │   ├── pricing.ts                    # unchanged, reused from feature 1 (already moved
│   │   │                                 #   outside admin/ in that feature's plan for this
│   │   │                                 #   exact reason)
│   │   └── catalog/
│   │       ├── queries.ts               # NEW — getActiveCategories, getActiveProductsByCategory,
│   │       │                            #   getActiveProduct — each hard-filters status='active'
│   │       │                            #   and excludes requiresCustomerUpload processing options
│   │       │                            #   server-side (never a client-side-only filter)
│   │       └── processing-options.ts    # NEW — isCustomerSelectable(option) pure filter
│   └── db/
│       └── schema.ts                    # unchanged — reads feature 1's tables, no new ones
├── tests/
│   └── catalog/
│       └── processing-options.test.ts   # NEW — Vitest: isCustomerSelectable filter
└── e2e/
    └── catalog-browsing.spec.ts         # NEW — Playwright: browse + product detail + configure
                                          #   + price; Draft product direct URL → not found
```

**Structure Decision**: Single existing Next.js app, extended — no new project/package boundary needed. A new `(storefront)` route group carries its own layout so the real customer-facing shell never wraps `/admin`'s separate admin shell (Next.js nests layouts by directory, so without this split the two would visually collide). No schema changes — this feature is purely a query/presentation layer over feature 1's existing tables.

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations. The
ADR obligation above is a documentation commitment stemming from a real
decision, not a complexity violation requiring justification.*
