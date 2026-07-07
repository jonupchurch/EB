# Implementation Plan: Admin Product Management

**Branch**: `001-admin-product-management` | **Date**: 2026-07-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-admin-product-management/spec.md`

## Summary

An Auth.js-gated admin area (restricted to the two authorized Google
accounts, per ADR-0006) where the business owner creates and manages
products: a Products list, and a Product Editor that configures a
product's base details plus optional, additively-priced configuration
(processing, styling, material, size, color, and design-location
options). This is feature 1 of the MVP build order specifically so the
real ~22-item launch catalog can be loaded before any storefront work
begins. No customer-facing surface exists yet — this feature owns the
product data model that later features (catalog/browse, cart/checkout)
will read.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22.18.0 LTS (per `.nvmrc`)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Auth.js (Google provider, per `docs/adr/0006-authjs-for-google-sso.md`), Drizzle ORM + `postgres` driver (per `docs/adr/0001`, `docs/adr/0002`), Zod, Tailwind CSS v4, `@vercel/blob` (product images, per `docs/adr/0008-neon-for-hosted-postgres.md`'s sibling Blob provisioning and `docs/adr/0009-vercel-blob-for-product-images.md`)

**Storage**: PostgreSQL — local instance for development, Neon for Production/Preview (`docs/adr/0001-postgres-persistence.md`, `docs/adr/0008-neon-for-hosted-postgres.md`) — this feature adds the `categories`, `products`, per-option-type, and `product_images` tables (see `data-model.md`). Product image files themselves live in Vercel Blob, not Postgres.

**Testing**: Vitest (pricing-calculation logic, Zod schema validation) and Playwright (sign-in + create-product-and-see-it-in-list happy path)

**Target Platform**: Web, deployed to Vercel (Node.js runtime / Fluid Compute)

**Project Type**: Web application — extends the existing single Next.js app; adds an `/admin` route group and extends the Drizzle schema

**Performance Goals**: Admin pages interactive within ~2s on a broadband connection; no blocking main-thread work over 50ms (matches `docs/non-functional.md`'s general Performance section — this is the first feature to give it a concrete admin-specific number, worth folding back into that doc)

**Constraints**: All product mutations run server-side only, Zod-validated before persisting (Principle II); the displayed running-total price is a client-side convenience computed from the same logic the server uses to validate on save — the server is always the authority, never a trusted client-submitted total; admin routes and mutations are Google-SSO-gated (Auth.js) restricted to exactly two accounts; admin mutation endpoints enforce a rate limit per Principle II, sized for two trusted, known users rather than public traffic

**Scale/Scope**: One business owner, an initial catalog of ~22 products (`Resources/products/Launch Catalog.html`); the schema should comfortably hold low hundreds of products without redesign — not built for multi-tenant or multi-seller scale

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS, with task obligations | This feature makes two new architectural calls: (1) how the flexible per-product-type option/pricing model is represented in the schema (relational tables per option category vs. a generic key-value model vs. a JSON blob) — `docs/adr/0007-product-options-schema.md` owed; (2) how product images are uploaded (server-side `put()` via a Server Action vs. a client-direct-upload token flow) — `docs/adr/0009-vercel-blob-for-product-images.md` owed. Both MUST be authored during `/speckit-tasks`/implementation. |
| II. Full-Stack Substance & Trustworthy Commerce | PASS | Real Server Actions, real persistent Postgres/Drizzle data layer, Zod validation at every write. No payment/checkout in this feature, but its version of "never trust the client" is: the server recomputes and validates the total price from the submitted option selections on save, never trusting a client-submitted total figure. Rate limiting applies to admin mutation endpoints. |
| III. Designed, Accessible Experience | PASS | Built from the already-reviewed `Resources/wireframes/Admin Screens.html` (Products List, Product Editor screens) — contrast issues in that reference are already tracked (ADR-0003/0004). Every state (empty list, loading, validation error, save success) gets designed, not just the happy path. WCAG 2.1 AA is the target per the softened Principle III. |
| IV. Product Judgment & Scope Discipline | PASS | Scope matches spec.md exactly: product data + admin CRUD only. No storefront, no customer-facing upload flow, no discounts/shipping/orders — those are later features per the confirmed build order. |
| V. Test Discipline | PASS | Vitest covers the pricing-calculation function and Zod schema validation (including the repair/rejection path for invalid input). One Playwright e2e covers sign-in → create a product with at least one priced option → see it in the list, the P1+P2 slice. |
| VI. Legible History | PASS | Conventional Commits, `CHANGELOG.md` entry on push, per the confirmed per-unit-of-work discipline. |

No unjustified violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-product-management/
├── spec.md               # Feature specification (complete)
├── plan.md               # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── actions.md        # Phase 1 output — Server Action contracts
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
PrintingSite/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── layout.tsx              # NEW — admin shell (sidebar nav per the wireframe),
│   │   │   │                            #       session-gated: redirects to sign-in if
│   │   │   │                            #       unauthenticated or not an authorized account
│   │   │   ├── page.tsx                # NEW — redirects to /admin/products
│   │   │   └── products/
│   │   │       ├── page.tsx            # NEW — Products list (US2)
│   │   │       ├── new/
│   │   │       │   └── page.tsx        # NEW — Product Editor, create mode (US1)
│   │   │       ├── [id]/
│   │   │       │   └── page.tsx        # NEW — Product Editor, edit mode (US3); duplicate
│   │   │       │                        #       action (US4) lives here too
│   │   │       └── actions.ts          # NEW — createProduct, updateProduct, duplicateProduct,
│   │   │                                #       addProductImage, removeProductImage,
│   │   │                                #       reorderProductImages Server Actions
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts        # NEW — Auth.js route handler
│   ├── auth.ts                          # NEW — Auth.js config: Google provider, signIn
│   │                                    #       callback enforcing the two-account allow-list
│   ├── db/
│   │   ├── index.ts                    # unchanged (existing Drizzle client)
│   │   └── schema.ts                    # extended — adds categories, products, the
│   │                                    #       per-option-type tables, and product_images
│   │                                    #       (health_check untouched)
│   └── lib/
│       ├── pricing.ts                   # NEW — running-total calculation; lives outside
│       │                                #       admin/ because feature 2 (catalog & browsing)
│       │                                #       reuses it for the customer-facing price preview
│       └── admin/
│           ├── rate-limit.ts            # NEW — admin mutation rate limiter
│           └── product-images.ts        # NEW — Vercel Blob put()/delete() helpers used by
│                                         #       the addProductImage/removeProductImage actions
├── tests/
│   ├── pricing.test.ts                 # NEW — Vitest: running-total calculation (matches
│   │                                    #       src/lib/pricing.ts's shared, non-admin location)
│   └── admin/
│       └── product-schema.test.ts      # NEW — Vitest: Zod validation (valid + rejected input)
├── e2e/
│   └── admin-products.spec.ts          # NEW — Playwright: sign-in + create + list flow
└── drizzle/
    └── 0001_*.sql                      # NEW — migration for categories/products/option tables
```

**Structure Decision**: Single existing Next.js app, extended — no new project/package boundary needed. Admin routes live under a new `src/app/admin/` route group gated at the layout level; the product data model extends the existing `src/db/schema.ts` (the `health_check` table from project setup is untouched). This mirrors fitt.d's own convention of adding one route group and one schema extension per feature rather than introducing parallel structure.

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations. The
ADR obligation above is a documentation commitment stemming from a real
decision, not a complexity violation requiring justification.*
