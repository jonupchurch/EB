# Implementation Plan: Cart & Checkout

**Branch**: `003-cart-checkout` | **Date**: 2026-07-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-cart-checkout/spec.md`

## Summary

An anonymous, session-based cart (client-held reference, always server-recomputed pricing) feeding a checkout flow that collects shipping information, computes a real tax figure (TaxJar) and a real shipping rate (flat or Shippo carrier-rate), applies at most one promotion, and completes payment via PayPal's Orders API — an order is only ever marked paid once PayPal's webhook signature is verified server-side. This is the third MVP feature and the first one that actually takes real money: everything here exists to make Principle II's "never trust the client for a final price" guarantee real, not aspirational.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22.18.0 LTS (per `.nvmrc`)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Drizzle ORM + `postgres` driver (per `docs/adr/0001`, `docs/adr/0002`, `docs/adr/0008`), Zod, Tailwind CSS v4; `taxjar` (official Node client — tax calculation has enough surface area, per-line-item taxability and nexus handling, that hand-rolling the request/response shape isn't worth it); `shippo` (official Node client, same reasoning); PayPal's Orders v2 and Webhooks REST APIs called directly via `fetch` — deliberately **no** PayPal SDK (see `research.md`)

**Storage**: PostgreSQL — same Neon (Production/Preview) / local (dev) database as features 1–2. This feature adds `promotions`, `orders`, and `order_items`. **No `cart` table** — the cart itself is not persisted server-side (see `research.md`'s Cart architecture decision)

**Testing**: Vitest (promotion discount calculation; cart re-validation/re-pricing logic) and Playwright (browse → cart → checkout → pay, using this project's established fake-provider pattern — one deterministic fake each for PayPal, TaxJar, and Shippo, never real sandbox credentials in automated tests)

**Target Platform**: Web, deployed to Vercel (Node.js runtime / Fluid Compute) — same target as features 1–2

**Project Type**: Web application — extends the existing single Next.js app; adds `/cart` and `/checkout` routes to the `(storefront)` route group, a PayPal webhook Route Handler, and three new tables

**Performance Goals**: Each checkout step transition (cart → shipping/tax/promo → review → pay) completes in under 1.5s, including one live tax or shipping-rate API call — the first concrete number for `docs/non-functional.md`'s previously-TBD "Checkout step transition" row, worth folding back into that doc once this feature ships

**Constraints**: The cart is never a source of truth for price — every view of it, and checkout itself, recomputes fresh from canonical product/option data (extends Principle II's "never trust the client" from features 1–2's admin/storefront pricing to the pre-purchase flow). The final charged total is computed and validated server-side at the moment of payment, from canonical data plus whatever promotion/shipping/tax applies then — never a total carried over from an earlier step. An order's line items, once paid, are a frozen historical snapshot — deliberately not re-derived from live data the way the cart is. PayPal's webhook signature MUST be verified before any order is marked paid (Principle II, ADR-0005). Checkout's mutating endpoints (add to cart, apply promo, create/pay order) MUST enforce a sensible rate limit, per Principle II — sized for public traffic, not the admin area's "two trusted users" tuning

**Scale/Scope**: Same single-business scale as features 1–2 — expect low order volume; no need to engineer for high checkout throughput

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS, with task obligations | This feature makes four new architectural calls, each owed its own ADR during `/speckit-tasks`/implementation: (1) cart architecture — a client-held reference, never a server-persisted table (`docs/adr/0011-client-side-cart-reference.md`); (2) TaxJar as the tax-calculation provider, finalizing the constitution's long-open follow-up (`docs/adr/0012-taxjar-for-sales-tax.md`); (3) Shippo as the calculated/carrier-rate shipping provider, finalizing the other long-open follow-up (`docs/adr/0013-shippo-for-carrier-shipping-rates.md`); (4) PayPal's Orders/Webhooks REST APIs called directly, no SDK (`docs/adr/0014-paypal-direct-rest-integration.md`). Two ADRs remain owed from earlier features (`0007`, `0010`) — unrelated to this feature, not re-litigated here. |
| II. Full-Stack Substance & Trustworthy Commerce | PASS | This is the principle's proving ground: every price shown is server-computed from canonical data, never a client-submitted or stale figure (FR-003, FR-011); PayPal's webhook signature is verified before any order is marked paid (FR-012); order status is an explicit, validated field (FR-013), never inferred; every checkout mutation is Zod-validated; checkout's mutating endpoints get a real rate limit (unlike features 1–2, which either didn't need one or scoped it to two trusted admin accounts). |
| III. Designed, Accessible Experience | PASS | Built from the already-reviewed `Resources/wireframes/Checkout & Confirmation.html` — its one real conflict (a Stripe-first payment section) was already resolved via ADR-0005's Update section: this feature builds PayPal-only. Contrast issues already tracked (ADR-0003/0004). Every state (empty cart, invalid promo, unavailable item, payment failure) gets designed, not just the happy path. WCAG 2.1 AA is the target per the softened Principle III. |
| IV. Product Judgment & Scope Discipline | PASS | Scope matches spec.md exactly: cart, checkout pricing, and PayPal payment only. No admin promotion/shipping/tax configuration UI, no order queue, no confirmation page, no Stripe, no refunds/cancellation, no customer accounts — all explicitly deferred to later features per spec.md. |
| V. Test Discipline | PASS | Vitest covers the promotion discount calculation and cart re-validation logic. One Playwright e2e covers the full browse → cart → checkout → pay flow using deterministic fakes for PayPal, TaxJar, and Shippo (this project's established pattern for external paid/nondeterministic dependencies) — never real sandbox credentials in CI. |
| VI. Legible History | PASS | Conventional Commits, `CHANGELOG.md` entry on push, per the confirmed per-unit-of-work discipline. |

No unjustified violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-cart-checkout/
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
│   │   ├── (storefront)/
│   │   │   ├── cart/
│   │   │   │   ├── page.tsx             # NEW — Cart view (US1)
│   │   │   │   └── actions.ts           # NEW — addToCart, updateCartItemQuantity,
│   │   │   │                            #       removeCartItem (mutate the cart cookie only)
│   │   │   └── checkout/
│   │   │       ├── page.tsx             # NEW — Checkout flow: shipping, promo, breakdown,
│   │   │       │                        #       pay (US2 + initiates US3)
│   │   │       └── actions.ts           # NEW — getCheckoutSummary, applyPromoCode,
│   │   │                                #       createOrderAndPayment
│   │   └── api/
│   │       └── webhooks/
│   │           └── paypal/
│   │               └── route.ts         # NEW — verifies PayPal's webhook signature, marks
│   │                                    #       the matching order paid (idempotent)
│   ├── lib/
│   │   ├── pricing.ts                    # unchanged, reused from feature 1 for per-line pricing
│   │   └── checkout/
│   │       ├── cart-cookie.ts            # NEW — read/write the cart reference cookie
│   │       │                            #       (productId + selected option IDs + quantity;
│   │       │                            #       never a price)
│   │       ├── cart.ts                   # NEW — getCart(): re-derives every line item fresh
│   │       │                            #       from canonical data (price, availability),
│   │       │                            #       flags/excludes anything no longer valid
│   │       ├── promotions.ts             # NEW — validatePromoCode, resolveApplicablePromotion,
│   │       │                            #       applyPromotion (discount calculation)
│   │       ├── tax.ts                    # NEW — TaxJar-backed tax calculation behind a small
│   │       │                            #       interface, with a deterministic fake for tests
│   │       ├── shipping.ts               # NEW — flat rate + Shippo-backed calculated rate
│   │       │                            #       behind one interface (research.md), with a
│   │       │                            #       deterministic fake for tests
│   │       ├── paypal.ts                 # NEW — createOrder/captureOrder/verifyWebhookSignature
│   │       │                            #       via direct REST calls, with a deterministic
│   │       │                            #       fake for tests
│   │       └── rate-limit.ts             # NEW — checkout mutation rate limiter (public-traffic
│   │                                    #       tuning, distinct from admin's)
│   └── db/
│       └── schema.ts                    # extended — adds promotions, orders, order_items
├── tests/
│   └── checkout/
│       ├── promotions.test.ts           # NEW — Vitest: discount calculation, all 5 types
│       └── cart.test.ts                 # NEW — Vitest: re-validation/re-pricing, unavailable
│                                        #       items, stale-price handling
├── e2e/
│   └── cart-checkout.spec.ts            # NEW — Playwright: browse → cart → checkout → pay
│                                        #       (fake PayPal/TaxJar/Shippo), webhook-verified
└── drizzle/
    └── 0002_*.sql                       # NEW — migration for promotions/orders/order_items
```

**Structure Decision**: Single existing Next.js app, extended — no new project/package boundary needed. Cart and checkout routes live under the existing `(storefront)` route group; a new `src/lib/checkout/` module holds every external-integration boundary (tax, shipping, payment) each behind its own small interface with a deterministic test fake, matching this project's established fake-provider pattern. The PayPal webhook lives under `src/app/api/`, outside the route group, matching feature 1's Auth.js route convention. Three new tables extend `src/db/schema.ts`; no cart table (see `research.md`).

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations. The
four ADR obligations above are documentation commitments stemming from real
decisions, not complexity violations requiring justification.*
