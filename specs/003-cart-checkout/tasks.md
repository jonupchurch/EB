# Tasks: Cart & Checkout

**Input**: Design documents from `specs/003-cart-checkout/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/actions.md](contracts/actions.md), [quickstart.md](quickstart.md)

**Tests**: Included per plan.md's Test Discipline gate (Constitution Principle V) — Vitest for cart re-validation/re-pricing and promotion discount calculation, one Playwright e2e for the full browse → cart → checkout → pay flow using this project's established fake-provider pattern.

**Organization**: Tasks are grouped by user story (spec.md's P1–P3) so each can be implemented and validated independently once the Foundational phase is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- File paths are exact and match `plan.md`'s Project Structure

**Cross-feature note**: unlike feature 2 (which only needed feature 1's *data*), this feature needs feature 1's and feature 2's *code* to already exist — `src/lib/pricing.ts`, feature 1's schema, and feature 2's product-availability shape are all imported directly. Implement features 1–2 first.

---

## Phase 1: Setup

- [X] T001 [P] Add `taxjar` as a dependency in `package.json`
- [X] T002 [P] Add `shippo` as a dependency in `package.json`
- [X] T003 [P] Author `docs/adr/0011-client-side-cart-reference.md` — formalizes the client-held cart decision already reflected in `research.md` (Constitution Principle I obligation)
- [X] T004 [P] Author `docs/adr/0012-taxjar-for-sales-tax.md` — formalizes TaxJar as the tax provider, closing the constitution's long-open follow-up
- [X] T005 [P] Author `docs/adr/0013-shippo-for-carrier-shipping-rates.md` — formalizes Shippo as the shipping-rate provider, closing the constitution's other long-open follow-up
- [X] T006 [P] Author `docs/adr/0014-paypal-direct-rest-integration.md` — formalizes direct REST calls over the PayPal SDK

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, shared checkout infrastructure, and every external-integration boundary — needed by all three user stories.

- [X] T007 Extend `src/db/schema.ts` with `promotions` (one flexible table per `data-model.md`), `orders` (`status` enum `placed`\|`paid`\|`in production`\|`shipped` — this feature only ever sets the first two, the latter two exist so feature 5 needs no later `ALTER TYPE`; pricing breakdown fields; `paypalOrderId` unique; `confirmationToken` unique text and `confirmationEmailSentAt` nullable timestamp for feature 4's sake, unused here; `promotionId` FK with `ON DELETE SET NULL` so feature 5 can delete a promotion without touching order history), and `order_items` (frozen snapshot fields plus a `selectedOptionsSnapshot` JSON column) — the one deliberate JSON exception in this project's schema, per `research.md`
- [X] T008 Generate the Drizzle migration for the new tables (`npm run db:generate`), review the output, and commit it as `drizzle/0002_*.sql` — depends on T007
- [X] T009 Apply the migration locally (`npm run db:migrate`) and confirm the new tables exist — depends on T008
- [X] T010 [P] Implement `src/lib/checkout/rate-limit.ts` — rate limiter for checkout's mutating endpoints, tuned for public traffic (distinct from admin's two-trusted-users tuning), per Principle II
- [X] T011 [P] Implement `src/lib/checkout/cart-cookie.ts` — read/write the cart reference cookie (`productId` + selected option IDs + quantity; never a price), per `data-model.md`'s Cart shape
- [X] T012 Implement `getCart()` in `src/lib/checkout/cart.ts` — resolves every cart reference against current data, recomputes each line's price via `src/lib/pricing.ts` (feature 1), and flags/excludes any line whose product or option is no longer Active or no longer exists (FR-004) — depends on T007, T011
- [X] T013 [P] Implement `src/lib/checkout/tax.ts` — TaxJar-backed tax calculation (via the `taxjar` client) behind a small interface, plus a deterministic fake for tests, per `research.md` and this project's established fake-provider pattern — depends on T001
- [X] T014 [P] Implement `src/lib/checkout/shipping.ts` — a flat-rate option plus Shippo-backed calculated rates (via the `shippo` client, using feature 1's `weightOz`/dimensions) behind one interface, plus a deterministic fake for tests — depends on T002
- [X] T015 [P] Implement `src/lib/checkout/promotions.ts` — `validatePromoCode`, `resolveApplicablePromotion` (the at-most-one-promotion rule, per `research.md`), and `applyPromotion` (discount calculation for all 5 types) — depends on T007
- [X] T016 [P] Implement `src/lib/checkout/paypal.ts` — `createOrder`, `captureOrder`, and `verifyWebhookSignature` via direct calls to PayPal's Orders v2 and Webhooks REST APIs (no SDK, per `research.md`), plus a deterministic fake for tests

**Checkpoint**: Foundation ready — user story work can begin.

---

## Phase 3: User Story 1 - Build and review a cart (Priority: P1) 🎯 MVP

**Goal**: A visitor adds configured products to a cart, adjusts quantities, removes items, and always sees an accurate, freshly-computed subtotal.

**Independent Test**: Add a configured product to the cart, adjust its quantity, add a second product, remove one, and confirm the subtotal is correct at every step — no dependency on checkout or payment.

### Tests for User Story 1

- [X] T017 [P] [US1] Vitest for cart re-validation/re-pricing in `tests/checkout/cart.test.ts` — an unavailable (Draft/deleted) item is flagged and excluded from the subtotal; a changed product price is reflected fresh, never stale; an empty cart returns a zero subtotal

### Implementation for User Story 1

- [X] T018 [US1] Implement `addToCart`, `updateCartItemQuantity`, `removeCartItem` Server Actions in `src/app/(storefront)/cart/actions.ts` — validates every option ID resolves to an existing, Active row (FR-001, FR-002); applies the rate limiter (T010) — depends on T010, T011, T007
- [X] T019 [US1] Implement `src/app/(storefront)/cart/page.tsx` — line items (unavailable ones clearly flagged, per FR-004), quantity controls, remove buttons, a live subtotal via `getCart()` (T012) — per `Resources/wireframes/Store Pages.html`'s cart view — depends on T012, T018
- [X] T020 [US1] Wire an "Add to Cart" control into feature 2's `src/app/(storefront)/products/[id]/page.tsx` — calls `addToCart` (T018) with the visitor's current option selections and quantity — depends on T018

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP scope).

---

## Phase 4: User Story 2 - Complete checkout with an accurate final total (Priority: P2)

**Goal**: A visitor enters shipping information, chooses a shipping method, optionally applies a promo code, and sees a complete, accurate breakdown before paying.

**Independent Test**: From a non-empty cart, proceed through checkout, enter shipping details, apply a promo code, and confirm the final breakdown (subtotal, discount, shipping, tax, total) is accurate — no dependency on actually completing payment.

### Tests for User Story 2

- [X] T021 [P] [US2] Vitest for promotion discount calculation in `tests/checkout/promotions.test.ts` — all 5 promotion types; an invalid, expired, or inapplicable code is rejected with a specific reason and never silently applied (FR-006, SC-004)

### Implementation for User Story 2

- [X] T022 [US2] Implement `getCheckoutSummary(shippingAddress, shippingMethod, promoCode?)` Server Action in `src/app/(storefront)/checkout/actions.ts` — composes `getCart()` (T012), `tax.ts` (T013), `shipping.ts` (T014), and `promotions.ts` (T015); rejects an empty cart (FR-009) or invalid promo code (`promo_invalid`) — depends on T012, T013, T014, T015
- [X] T023 [US2] Implement `src/app/(storefront)/checkout/page.tsx` — shipping information form, shipping method choice (flat/calculated), promo code field, and the full breakdown display, calling `getCheckoutSummary` (T022) — per `Resources/wireframes/Checkout & Confirmation.html` — depends on T022

**Checkpoint**: User Stories 1 AND 2 both work independently — a visitor can reach an accurate total without paying.

---

## Phase 5: User Story 3 - Pay and have the order reliably recorded (Priority: P3)

**Goal**: A visitor completes payment via PayPal, and the order is created and marked paid only once PayPal's webhook signature is verified server-side.

**Independent Test**: From an accurate checkout total, complete payment via PayPal (fake provider in tests) and confirm the order is created and marked paid only once the webhook is verified — no dependency on any customer-facing confirmation display.

### Tests for User Story 3

- [X] T024 [P] [US3] Vitest/integration test in `tests/checkout/orders.test.ts` — confirms `createOrderAndPayment` recomputes the total fresh at the moment of payment rather than trusting a value from an earlier `getCheckoutSummary` call (FR-011), and that a webhook event for an already-paid order is a no-op (idempotency, FR-015)

### Implementation for User Story 3

- [X] T025 [US3] Implement `createOrderAndPayment(shippingAddress, shippingMethod, promoCode?)` Server Action in `src/app/(storefront)/checkout/actions.ts` — recomputes the total fresh (never trusts `getCheckoutSummary`'s earlier result, FR-011); creates a `placed` Order (with a random, non-sequential `confirmationToken` — feature 4's URL identifier) plus its frozen `order_items` snapshot (`data-model.md`); creates a PayPal order via `paypal.ts` (T016) for that exact total; returns the approval URL — depends on T012–T016, T022 (same file)
- [X] T026 [US3] Implement `src/app/api/webhooks/paypal/route.ts` — verifies the signature via `paypal.ts` (T016); on a verified capture-completed event, sets the matching order's `status` to `paid` and `paidAt`, idempotently (FR-012, FR-013, FR-015) — depends on T016
- [X] T027 [US3] Wire the checkout page's payment step — redirect to PayPal's approval URL (T025), handle the return redirect, and show a minimal acknowledgment (the real confirmation experience is a separate, later feature) — per `Resources/wireframes/Checkout & Confirmation.html` — depends on T023, T025
- [X] T028 [US3] Playwright e2e in `e2e/cart-checkout.spec.ts` — the full vertical slice this feature's plan.md Testing section commits to: browse a feature-2-seeded product → add to cart, adjust quantity → checkout with shipping info and a promo code → pay via the fake PayPal provider → confirm the resulting order is created and marked `paid` only once the fake webhook is verified — depends on T018–T020, T022–T023, T025–T027

**Checkpoint**: All three user stories are independently functional — the full cart-to-paid-order flow works end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T029 [P] Run `quickstart.md`'s manual validation scenarios 1–11 (add/adjust/remove, always-fresh pricing, unavailable-item detection, checkout breakdown, promo code accept/reject, empty-cart block, webhook-verified payment, stale-total protection, delayed webhook, privacy/security check)
- [X] T030 [P] Accessibility spot-check of the real built cart/checkout UI against the already-reviewed wireframe tokens (ADR-0003/ADR-0004) — confirm the implementation introduces no new contrast regressions (Principle III: target, not a blocking gate)
- [X] T031 [P] Fold the concrete "Checkout step transition" target (plan.md's Performance Goals: <1.5s) back into `docs/non-functional.md`'s previously-TBD row
- [X] T032 Run `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all four MUST pass (Principle V) — depends on all prior tasks
- [X] T033 Update `status.md` and `CHANGELOG.md` marking feature 3 (cart & checkout) implemented — depends on T032

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup and on features 1–2 already being implemented — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US1 (P1) has no dependency on US2/US3 — the MVP slice
  - US2 (P2) reuses US1's cart (`getCart()`) but is independently testable stopping short of payment
  - US3 (P3) reuses US2's checkout page/action file and Foundational's `paypal.ts` — the feature's full value only lands once all three stories are done
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each Phase

- Tests (where included) before the implementation they cover
- The four `src/lib/checkout/*.ts` modules (T012–T016) before any Server Action that composes them
- `src/app/(storefront)/checkout/actions.ts` is touched by both T022 (US2) and T025 (US3) — sequential relative to each other even though not explicitly marked, to avoid same-file conflicts
- T028 (the e2e test) depends on the full US1–US3 implementation chain, not just US3's own tasks

### Parallel Opportunities

- T001–T006 (Setup) — different files
- T010, T011, T013, T014, T015, T016 (Foundational) — different files, no unfinished dependency
- T017 (US1 test), T021 (US2 test), T024 (US3 test) — each is the only test task in its own phase
- T029, T030, T031 (Polish) — different concerns, no file conflict

---

## Parallel Example: Foundational Phase

```bash
# Once T007 (schema) and T001/T002 (dependencies) are done, these proceed together:
Task: "Implement src/lib/checkout/tax.ts — TaxJar-backed tax calculation + fake"
Task: "Implement src/lib/checkout/shipping.ts — flat + Shippo-backed rates + fake"
Task: "Implement src/lib/checkout/promotions.ts — validate/resolve/apply"
Task: "Implement src/lib/checkout/paypal.ts — Orders/Webhooks REST + fake"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — visitors can build and review a real cart
3. **STOP and VALIDATE**: run T017, confirm US1's Independent Test manually
4. US2 (accurate checkout total) and US3 (real payment) build on this next

### Incremental Delivery

1. Setup + Foundational → every external integration ready, cart re-pricing ready
2. US1 → validate independently (MVP: a working cart)
3. US2 → validate independently (an accurate total, no payment yet)
4. US3 → validate independently (a real, webhook-verified paid order)
5. Polish → full quickstart pass, accessibility spot-check, non-functional.md update, full check suite, docs update

---

## Notes

- This feature depends on features 1 and 2 being **implemented**, not just planned — `src/lib/pricing.ts` and feature 2's product-availability logic are imported directly
- The four ADRs (T003–T006) are documentation commitments from `plan.md`'s Constitution Check, not optional polish
- Every external integration (`tax.ts`, `shipping.ts`, `paypal.ts`) ships with a deterministic fake from the start (Foundational phase) — tests never depend on TaxJar/Shippo/PayPal sandboxes being reachable
- No cart table exists anywhere in this task list — by design (`research.md`)
