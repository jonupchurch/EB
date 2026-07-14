# Implementation Plan: Percentage-Off Discounts

**Branch**: `007-percentage-discounts` | **Date**: 2026-07-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-percentage-discounts/spec.md`

## Summary

Adds a percentage-of-subtotal discount calculation to the existing promotion system (feature 5), usable both as a standalone automatic (codeless) promotion and as the mechanic behind a promo code, with an optional per-promotion maximum-discount cap. Implemented as a new orthogonal `valueMode` ("flat" | "percentage") on the existing `promotions` table rather than new `type` enum values — matching the feature description's own framing ("a value-calculation mode alongside the existing flat one") and avoiding a real `ALTER TYPE ... ADD VALUE` migration against a table that (unlike every prior cross-feature schema amendment in this project) is already live in Production with real rows.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22.18.0 LTS (per `.nvmrc`) — unchanged

**Primary Dependencies**: Next.js 16.2.10 (App Router), React 19.2.7, Drizzle ORM 0.45.2 + `postgres` driver, Zod 4.4.3, Tailwind CSS v4 — no new external service or npm dependency

**Storage**: PostgreSQL (Neon in Production/Preview, local for dev) — extends the existing, already-live `promotions` table (feature 3/5) with three new nullable-or-defaulted columns; no new table

**Testing**: Vitest (percentage calculation math — rounding, cap enforcement, boundary values; type-specific validation for the new fields) and Playwright (extends `e2e/admin-discounts.spec.ts`: create a percentage promo code through the real admin UI, confirm it discounts checkout by the exact expected amount)

**Target Platform**: Web, deployed to Vercel (Node.js runtime / Fluid Compute) — same target as every prior feature

**Project Type**: Web application — extends the existing single Next.js app; no new route, only new UI within the existing `/admin/discounts` page and new logic within existing checkout/admin-lib modules

**Performance Goals**: No new target — same low-traffic, two-known-admin-user admin surface and per-checkout-request storefront path as before

**Constraints**: The discount calculation MUST stay server-side and non-client-trusted (Principle II) — unchanged trust boundary, just a new arithmetic branch. The new schema change touches a table with real Production data for the first time in this project (every earlier cross-feature schema amendment happened before the table was implemented) — the migration MUST be additive-only (new nullable/defaulted columns, no `ALTER TYPE` on the existing `promotion_type` enum) so it's safe to run via the existing `/api/admin/migrate` endpoint against a live database with existing rows.

**Scale/Scope**: Same single-business scale as feature 5 — a handful of promotions at most; no performance concern here.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS | No new ADR owed — this reuses the database/ORM/schema-shape decisions made by ADR-0001/0002/0007, and doesn't introduce a new architectural pattern, just a new field on an existing entity. `research.md` documents the one real design decision (orthogonal `valueMode` vs. new `type` enum values) with rationale. |
| II. Full-Stack Substance & Trustworthy Commerce | PASS | The percentage calculation is added to `calculateDiscount()`, the same server-side, canonical-subtotal function every other promotion type already uses — never a client-submitted amount. Zod validates the new fields (range, required-when-percentage) before any write. |
| III. Designed, Accessible Experience | PASS | Extends the existing, already-designed discounts admin form with one additional control (a value-mode toggle) rather than a new screen — no new accessibility surface beyond what feature 5 already passed (zero axe violations). |
| IV. Product Judgment & Scope Discipline | PASS | Scope matches spec.md exactly: percentage as an additional value-calculation mode for `flat`/`promo_code` types only, with an optional cap. Explicitly not doing: product/category-scoped percentages, percentage on `cart_threshold`, usage-limit tracking — all match `docs/future-work.md`'s existing scope boundary for promotions. |
| V. Test Discipline | PASS | New Vitest cases cover the percentage math (rounding, cap, 100% edge, invalid range) alongside the existing promotion test suite; the existing `e2e/admin-discounts.spec.ts` gains a percentage-promo-code scenario rather than a whole new spec file. |
| VI. Legible History | PASS | Conventional Commits, `CHANGELOG.md`/`status.md` entry on push, per the established discipline. |

No unjustified violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/007-percentage-discounts/
├── spec.md               # Feature specification (complete)
├── plan.md               # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── actions.md        # Phase 1 output — Server Action contract changes
├── quickstart.md         # Phase 1 output
└── tasks.md               # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
PrintingSite/
├── drizzle/
│   └── 0007_*.sql                          # NEW — additive migration: promotion_value_mode
│                                            #       enum + 3 new nullable/defaulted columns
│                                            #       on the existing `promotions` table
├── src/
│   ├── db/
│   │   └── schema.ts                       # EXTENDED — promotions gains valueMode,
│   │                                       #       discountPercent, maxDiscountCents
│   ├── lib/
│   │   ├── checkout/
│   │   │   └── promotions.ts               # EXTENDED — calculateDiscount() branches on
│   │   │                                   #       valueMode for flat/promo_code types
│   │   └── admin/
│   │       ├── schemas.ts                  # EXTENDED — promotionInputSchema gains
│   │       │                               #       valueMode/discountPercent/maxDiscountCents
│   │       │                               #       + cross-field validation
│   │       └── promotion-crud.ts           # EXTENDED — typeSpecificFieldError covers the
│   │                                       #       new percentage-required-fields case
│   └── app/
│       └── admin/
│           └── discounts/
│               └── discounts-manager.tsx   # EXTENDED — a value-mode toggle (Flat/Percentage)
│                                           #       for flat/promo_code types, with percent +
│                                           #       optional cap inputs
├── tests/
│   └── checkout/
│       └── promotions.test.ts              # EXTENDED — percentage calculation, cap
│                                           #       enforcement, rounding, boundary/invalid
│                                           #       range cases
└── e2e/
    └── admin-discounts.spec.ts             # EXTENDED — a percentage promo code created via
                                            #       the real admin UI applies correctly at
                                            #       the next checkout
```

**Structure Decision**: No new route, table, or project boundary — this feature extends four existing files (schema, checkout promotion logic, admin validation, admin UI) plus one additive migration. Matches feature 5's own "compose existing infrastructure, no new ADR" pattern, but is the first feature to migrate a table that already holds real Production rows, which is why the migration's additive-only shape (Phase 0) is the one genuinely new technical concern.

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations, and
this feature owes no new ADR.*
