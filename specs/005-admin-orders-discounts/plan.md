# Implementation Plan: Admin: Orders, Discounts, Shipping & Fees

**Branch**: `005-admin-orders-discounts` | **Date**: 2026-07-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-admin-orders-discounts/spec.md`

## Summary

The last MVP feature: an authenticated admin order queue and detail view (read-only order data plus a one-forward-step-at-a-time fulfillment state machine — `paid` → `in production` → `shipped`), full CRUD over feature 3's `promotions` table, and one admin-editable shop setting (the flat-rate shipping amount). No new external integration and no new ADR — this feature composes infrastructure already decided by features 1 (Auth.js admin gate, admin rate limiter) and 3 (`orders`, `promotions` schemas, amended alongside this plan to add the `in production`/`shipped` enum values and `promotionId`'s `ON DELETE SET NULL` behavior, since feature 3 isn't implemented yet).

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22.18.0 LTS (per `.nvmrc`)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Drizzle ORM + `postgres` driver, Zod, Tailwind CSS v4, Auth.js (existing admin gate from feature 1) — no new external service or npm dependency

**Storage**: PostgreSQL — same Neon/local database as features 1–4. Reads/writes feature 3's `orders`/`promotions` tables (amended alongside this plan) and adds one new table: `shop_settings` (a single-row table — see `research.md`)

**Testing**: Vitest (order-status transition validation: reject skip/reverse; promotion CRUD: unique code enforcement, deactivation/deletion never touching a past order's recorded discount) and Playwright (admin order-status flow, promotion create → apply at checkout, shipping-setting change → reflected at checkout)

**Target Platform**: Web, deployed to Vercel (Node.js runtime / Fluid Compute) — same target as features 1–4

**Project Type**: Web application — extends the existing single Next.js app; adds three new routes under the existing `src/app/admin/` route group (already gated by feature 1's Auth.js layout)

**Performance Goals**: No new target — this is a low-traffic, two-known-admin-user surface, same tuning as feature 1's admin rate limiter (not public-storefront tuning)

**Constraints**: Order status transitions MUST be validated against an explicit allowed-transition map (Principle II: "explicit, validated state machine — never inferred") — `placed`→`paid` stays exclusively webhook-driven (feature 3); this feature's mutation is solely `paid`→`in production`→`shipped`, one step at a time, rejecting any skip or reverse attempt. Deleting or deactivating a promotion MUST NOT alter any order that already used it — enforced at the schema level (`promotionId`'s `ON DELETE SET NULL`, amended into feature 3) plus at the application level (an order's `discountCents` is never recomputed after the fact). Every mutation in this feature reuses feature 1's existing admin rate limiter and Auth.js gate — no new auth or rate-limiting mechanism.

**Scale/Scope**: Same single-business scale as features 1–4; the order queue is expected to hold, at most, low hundreds of rows at this business's scale — no pagination-performance concern justifies anything beyond a simple sorted list

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS | No new ADR owed — every technology choice here (database, Auth.js, admin rate limiter) was already decided by features 1/3; this feature composes them, it doesn't introduce a new one. |
| II. Full-Stack Substance & Trustworthy Commerce | PASS | This feature is what actually implements Principle II's own "explicit, validated state machine" requirement for order status. Every mutation (status advance, promotion CRUD, shipping setting) is Zod-validated server-side and rate-limited per feature 1's admin pattern. Promotion deletion/deactivation is proven not to corrupt order history via the `ON DELETE SET NULL` FK plus a Vitest case. |
| III. Designed, Accessible Experience | PASS | Built from the already-reviewed `Resources/wireframes/Admin Screens.html`'s orders queue/detail, discounts, and shipping & fees screens. WCAG 2.1 AA is the target per the softened Principle III. |
| IV. Product Judgment & Scope Discipline | PASS | Scope matches spec.md exactly: order fulfillment status, promotion CRUD, and one shipping setting. No refunds/cancellation, no order-content editing, no multi-role admin, no per-product promotion scoping, no shipping-label/tracking integration — all explicitly out of scope. |
| V. Test Discipline | PASS | Vitest covers the state-machine and promotion-CRUD logic. This feature's Polish phase also finally satisfies Principle V's own long-standing requirement for "one Playwright happy-path end-to-end test [covering] the full vertical slice (browse → cart → checkout → confirmation → order visible in the admin queue)" — no earlier feature could complete this, since the admin queue didn't exist until now. |
| VI. Legible History | PASS | Conventional Commits, `CHANGELOG.md` entry on push, per the confirmed per-unit-of-work discipline. |

No unjustified violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-admin-orders-discounts/
├── spec.md               # Feature specification (complete)
├── plan.md               # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── actions.md        # Phase 1 output — Server Action contracts
├── quickstart.md         # Phase 1 output
└── tasks.md               # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
PrintingSite/
├── src/
│   ├── app/
│   │   └── admin/                        # EXISTING (feature 1) — Auth.js-gated layout
│   │       ├── orders/
│   │       │   ├── page.tsx              # NEW — order queue (US1)
│   │       │   ├── [id]/
│   │       │   │   └── page.tsx          # NEW — order detail + status-advance control (US1)
│   │       │   └── actions.ts            # NEW — listOrders, getOrderDetail, advanceOrderStatus
│   │       ├── discounts/
│   │       │   ├── page.tsx              # NEW — promotion list + create/edit form (US2)
│   │       │   └── actions.ts            # NEW — listPromotions, createPromotion,
│   │       │                             #       updatePromotion, deletePromotion
│   │       └── settings/
│   │           ├── page.tsx              # NEW — shipping & fees settings (US3)
│   │           └── actions.ts            # NEW — getShopSettings, setFlatRateShipping
│   ├── db/
│   │   └── schema.ts                     # EXTENDED — adds shop_settings (this feature's only
│   │                                      #       new table); orders/promotions already amended
│   │                                      #       in feature 3's schema task for this feature's sake
│   └── lib/
│       └── admin/
│           └── order-status.ts           # NEW — the allowed-transition map + validation
│                                          #       (paid → in production → shipped, one step,
│                                          #       never skipped/reversed)
├── tests/
│   └── admin/
│       ├── order-status.test.ts          # NEW — Vitest: valid/invalid transitions
│       └── promotions.test.ts            # NEW — Vitest: unique code enforcement,
│                                          #       deactivation/deletion isolation from past orders
└── e2e/
    ├── admin-orders.spec.ts              # NEW — Playwright: sign in, view queue, advance
    │                                      #       an order's status, reject an invalid transition
    ├── admin-discounts.spec.ts           # NEW — Playwright: create a promotion, confirm it
    │                                      #       applies at checkout
    └── full-vertical-slice.spec.ts       # NEW — Playwright: the one happy-path e2e Principle V
                                          #       requires — browse → cart → checkout → pay
                                          #       (fake PayPal) → confirmation page → order
                                          #       visible in the admin queue → advance its status
```

**Structure Decision**: Single existing Next.js app, extended — no new project/package boundary needed. Three new route segments under feature 1's existing `src/app/admin/` group, inheriting its Auth.js gate without any change to that gate itself. `shop_settings` is the only new table; `orders`/`promotions` were extended directly in feature 3's (not-yet-implemented) schema definition rather than via a second migration later.

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations, and
this feature owes no new ADR (every underlying technology choice was
already made by features 1 and 3).*
