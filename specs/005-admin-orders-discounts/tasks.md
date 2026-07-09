# Tasks: Admin: Orders, Discounts, Shipping & Fees

**Input**: Design documents from `specs/005-admin-orders-discounts/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/actions.md](contracts/actions.md), [quickstart.md](quickstart.md)

**Tests**: Included per plan.md's Test Discipline gate (Constitution Principle V) — Vitest for order-status transition validation and promotion CRUD (unique code enforcement, deactivation/deletion isolation from past orders); three Playwright e2e specs, including the "full vertical slice" happy-path test Principle V has required since ratification and which only this feature can finally complete.

**Organization**: Tasks are grouped by user story (spec.md's P1–P3) so each can be implemented and validated independently once the Foundational phase is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- File paths are exact and match `plan.md`'s Project Structure

**Cross-feature note**: this is the last MVP feature. It depends on features 1 (Auth.js admin gate, admin rate limiter) and 3 (`orders`, `promotions` tables — amended alongside this feature's planning to add the `in production`/`shipped` enum values and `promotionId`'s `ON DELETE SET NULL`) being **implemented**, not just planned. This feature's Polish phase also depends on features 2 and 4 being implemented, since its final e2e test exercises the entire browse-to-fulfillment flow.

---

## Phase 1: Setup

No new dependencies or ADRs are owed by this feature — every technology used here (database, Auth.js, admin rate limiter) was already decided and ADR'd by features 1 and 3 (`research.md`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one new table this feature adds.

- [X] T001 [P] Add the `shop_settings` singleton table (`id` fixed at `1`, `flatRateShippingCents` nullable integer, `updatedAt`) to `src/db/schema.ts`, per `data-model.md`
- [X] T002 Generate the Drizzle migration (`npm run db:generate`), review the output, and commit it as `drizzle/0003_*.sql` — depends on T001
- [X] T003 Apply the migration locally (`npm run db:migrate`) and confirm `shop_settings` exists — depends on T002

**Checkpoint**: Foundation ready — user story work can begin.

---

## Phase 3: User Story 1 - Work the order queue through to fulfillment (Priority: P1) 🎯 MVP

**Goal**: The admin can see every order and advance each one's fulfillment status through an explicit, one-forward-step-at-a-time state machine.

**Independent Test**: Sign in as admin, view the order queue, open an order's detail, advance its status from paid to in production, then to shipped, and confirm each transition is reflected immediately and cannot be skipped or reversed.

### Tests for User Story 1

- [X] T004 [P] [US1] Vitest for order-status transition validation in `tests/admin/order-status.test.ts` — valid transitions (`paid`→`in production`, `in production`→`shipped`) succeed; a skip (`paid`→`shipped`), a reverse, or an attempt to set `paid` directly are each rejected with a specific reason (FR-003, FR-004, FR-005)

### Implementation for User Story 1

- [X] T005 [US1] Implement `src/lib/admin/order-status.ts` — the allowed-transition map and `advanceOrderStatus` validation logic, per `data-model.md`'s State Transitions
- [X] T006 [US1] Implement `listOrders`, `getOrderDetail`, `advanceOrderStatus` Server Actions in `src/app/admin/orders/actions.ts` — `advanceOrderStatus` never accepts `paid` as a target (FR-005) and validates via T005; applies feature 1's admin rate limiter (`src/lib/admin/rate-limit.ts`) — depends on T005
- [X] T007 [US1] Implement `src/app/admin/orders/page.tsx` — the order queue (customer name, item count, total, status, placed date, most-recent-first, FR-001) per `Resources/wireframes/Admin Screens.html` — depends on T006
- [X] T008 [US1] Implement `src/app/admin/orders/[id]/page.tsx` — the read-only order detail view (line items, shipping address, full breakdown, payment status, FR-002) plus the status-advance control, showing only the single legal next status as an available action — depends on T006, T007

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP scope).

---

## Phase 4: User Story 2 - Create and manage discounts/promotions (Priority: P2)

**Goal**: The admin can create, edit, deactivate, and delete promotions, with changes taking effect at the very next checkout.

**Independent Test**: Create one promotion of each of the five types, edit one, deactivate one, and delete one — confirm each change is reflected the next time checkout evaluates promotions.

### Tests for User Story 2

- [X] T009 [P] [US2] Vitest for promotion CRUD in `tests/admin/promotions.test.ts` — a second active promo-code promotion reusing an existing code (any casing) is rejected (FR-010); deactivating, then deleting, a promotion already applied to a real order leaves that order's recorded discount completely unchanged both times (FR-009)

### Implementation for User Story 2

- [X] T010 [US2] Implement `listPromotions`, `createPromotion`, `updatePromotion`, `deletePromotion` Server Actions in `src/app/admin/discounts/actions.ts` — Zod-validates each type's required fields (FR-006); enforces case-insensitive unique `promoCode` among active promotions (FR-010); `deletePromotion` performs no order lookup, relying on the `ON DELETE SET NULL` FK for safety (FR-009); applies feature 1's admin rate limiter
- [X] T011 [US2] Implement `src/app/admin/discounts/page.tsx` — promotion list plus a create/edit form showing only the fields relevant to the selected type (FR-006, FR-007), per `Resources/wireframes/Admin Screens.html` — depends on T010

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Set the flat shipping rate (Priority: P3)

**Goal**: The admin can set the flat-rate shipping amount, with checkout reflecting it immediately and falling back to a safe default when unset.

**Independent Test**: Set the flat shipping rate to a new amount and confirm a checkout that chooses flat-rate shipping reflects the new amount.

### Implementation for User Story 3

- [X] T012 [US3] Implement `getShopSettings`, `setFlatRateShipping` Server Actions in `src/app/admin/settings/actions.ts` — Zod-validates a non-negative integer (FR-011); `getShopSettings` returns `null` when unset; applies feature 1's admin rate limiter — depends on T001
- [X] T013 [US3] Implement `src/app/admin/settings/page.tsx` — the flat-rate shipping amount form, per `Resources/wireframes/Admin Screens.html` — depends on T012
- [X] T014 [US3] Update feature 3's `src/lib/checkout/shipping.ts` flat-rate branch to read `getShopSettings().flatRateShippingCents`, falling back to a safe, non-zero built-in default when `null` (FR-012) — depends on T012

**Checkpoint**: All three user stories are independently functional. The MVP is now feature-complete end to end.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T015 [P] Run `quickstart.md`'s manual validation scenarios 1–14
- [X] T016 [P] Accessibility spot-check of the real built orders/discounts/settings screens against the already-reviewed wireframe tokens (ADR-0003/ADR-0004)
- [X] T017 [P] Playwright e2e in `e2e/admin-orders.spec.ts` — sign in, view the queue, advance an order's status `paid`→`in production`→`shipped`, and confirm an attempted skip or reverse is rejected — depends on T007, T008
- [X] T018 [P] Playwright e2e in `e2e/admin-discounts.spec.ts` — create a promotion and confirm it applies correctly at the next checkout (feature 3's fake PayPal/tax/shipping providers) — depends on T011
- [X] T019 Playwright e2e in `e2e/full-vertical-slice.spec.ts` — the one happy-path end-to-end test Constitution Principle V has required since ratification: browse the catalog (feature 2) → add to cart (feature 3) → complete checkout and pay via the fake PayPal provider (feature 3) → land on the confirmation page (feature 4) → sign in as admin, confirm the order appears correctly in the queue, and advance it through `in production` → `shipped` (this feature) — depends on features 2–5 all being implemented, and on T006–T008 of this feature
- [X] T020 Run `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all four MUST pass (Principle V) — depends on all prior tasks
- [X] T021 Update `status.md` and `CHANGELOG.md` marking feature 5 (admin orders, discounts, shipping & fees) implemented, and noting the MVP is now feature-complete — depends on T020

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Nothing to do — no dependency, no blocking
- **Foundational (Phase 2)**: Depends on features 1 and 3 already being implemented — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US1 (P1) has no dependency on US2/US3 — the MVP slice
  - US2 (P2) is independent of US1 — different table, different route
  - US3 (P3) depends on T001 (the `shop_settings` table) but nothing from US1/US2
- **Polish (Phase 6)**: Depends on all three user stories being complete; T019 additionally depends on features 2 and 4 being implemented

### Within Each Phase

- Tests (where included) before the implementation they cover
- T005 (order-status module) before T006 (Server Actions that call it)
- T012 (shipping settings actions) before T013 (settings page) and T014 (checkout's read of the setting)

### Parallel Opportunities

- T001 (Foundational) has no parallel counterpart — it's the only Foundational task
- T004 (US1 test) and T009 (US2 test) — different files, can run in parallel
- US1, US2, and US3's implementation tasks touch entirely different files/routes and can proceed in parallel once Foundational is done
- T015, T016, T017, T018 (Polish) — different concerns, no file conflict; T019 depends on the others being done first

---

## Parallel Example: After Foundational

```bash
# US1, US2, and US3 proceed independently once T001–T003 are done:
Task: "Implement src/lib/admin/order-status.ts and src/app/admin/orders/*"
Task: "Implement src/app/admin/discounts/*"
Task: "Implement src/app/admin/settings/*"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup — nothing to do) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — the admin can work the order queue through to fulfillment
3. **STOP and VALIDATE**: run T004, confirm US1's Independent Test manually
4. US2 (promotions) and US3 (shipping setting) build on this next, independently of each other

### Incremental Delivery

1. Foundational → `shop_settings` ready
2. US1 → validate independently (MVP: a working, correctly-gated fulfillment workflow)
3. US2 → validate independently (real promotions, no code change required to run a sale)
4. US3 → validate independently (an admin-editable shipping rate, safe default when unset)
5. Polish → full quickstart pass, accessibility spot-check, the full check suite including the project's one required full-vertical-slice e2e test, docs update

---

## Notes

- This feature depends on features 1 and 3 being **implemented**, not just planned — it reuses feature 1's Auth.js gate/rate limiter directly and reads/writes feature 3's `orders`/`promotions` tables
- No new ADR — every technology choice here was already made and documented by features 1/3
- `deletePromotion` (T010) is deliberately thin — safety comes from the `ON DELETE SET NULL` foreign key (feature 3, amended), not from application-level cleanup logic
- T019 is the last piece of a standing constitutional obligation (Principle V's "full vertical slice" e2e test) that no earlier feature could complete on its own
