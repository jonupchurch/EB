# Tasks: Order Confirmation

**Input**: Design documents from `specs/004-order-confirmation/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/actions.md](contracts/actions.md), [quickstart.md](quickstart.md)

**Tests**: Included per plan.md's Test Discipline gate (Constitution Principle V) — Vitest for the email send-once idempotency logic, one Playwright e2e file covering the confirmation page's happy path, the confirming→paid transition (feature 3's fake PayPal), the not-found case, and the later-revisit/privacy checks.

**Organization**: Tasks are grouped by user story (spec.md's P1–P3) so each can be implemented and validated independently once the Foundational phase is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- File paths are exact and match `plan.md`'s Project Structure

**Cross-feature note**: this feature depends on feature 3 (cart & checkout) being **implemented**, not just planned — it reads feature 3's `orders`/`order_items` tables (including the `confirmationToken`/`confirmationEmailSentAt` columns already added there for this feature's sake) and adds one call into feature 3's `src/app/api/webhooks/paypal/route.ts`. No new database table or migration is created by this feature.

---

## Phase 1: Setup

- [X] T001 [P] Add `resend` as a dependency in `package.json`
- [X] T002 [P] Author `docs/adr/0015-resend-for-transactional-email.md` — formalizes Resend as the transactional email provider (Constitution Principle I obligation, per `research.md`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one piece of shared read logic both US1 and US3 depend on.

- [X] T003 Implement `getOrderConfirmation(token)` Server Action in `src/app/(storefront)/orders/[token]/actions.ts` — resolves `confirmationToken` to an order's items, shipping address, price breakdown, and status; returns `{ ok: false, error: "not_found" }` for an unmatched token, never a partial object (FR-011, `contracts/actions.md`) — depends on feature 3's `orders`/`order_items` tables already existing

**Checkpoint**: Foundation ready — user story work can begin.

---

## Phase 3: User Story 1 - See an accurate confirmation immediately after paying (Priority: P1) 🎯 MVP

**Goal**: A customer who just paid (or who arrives while payment is still verifying) sees an accurate confirmation page that resolves to the right state on its own.

**Independent Test**: Complete a checkout (feature 3, fake PayPal) and confirm the resulting confirmation page shows accurate line items, shipping address, price breakdown, order identifier, and status timeline — independent of the email or a later revisit.

### Tests for User Story 1

- [X] T004 [US1] Playwright e2e in `e2e/order-confirmation.spec.ts` covering: the happy path (payment already verified — every line item, shipping address, full breakdown, order identifier, and "placed"+"paid" reached on the timeline); the confirming→paid transition (feature 3's fake PayPal delayed-webhook mode — page shows "confirming payment" then updates to paid within seconds, unprompted); and a nonexistent token (shows "not found," never partial data)

### Implementation for User Story 1

- [X] T005 [US1] Implement `src/app/(storefront)/orders/[token]/page.tsx` — renders the confirmation view via `getOrderConfirmation` (T003): on `not_found`, shows the not-found state (FR-011); otherwise shows every line item, shipping address, full price breakdown, order identifier, and a status timeline ("placed" always reached, "paid" reached only if verified, "in production"/"shipped" always shown as upcoming per FR-003) — per `Resources/wireframes/Checkout & Confirmation.html` — depends on T003
- [X] T006 [US1] Add client-side polling to the confirmation page — while status is `placed` (not yet paid), re-call `getOrderConfirmation` every 2 seconds; if still not `paid` after 60 seconds, show a "this may need attention" message instead of continuing to poll indefinitely (FR-004, FR-005) — depends on T005

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP scope).

---

## Phase 4: User Story 2 - Receive a confirmation email (Priority: P2)

**Goal**: The instant an order is verified paid, exactly one confirmation email is sent, containing the same details as the confirmation page.

**Independent Test**: Complete a checkout through to a verified-paid order and confirm exactly one confirmation email arrives, containing the same order details as the confirmation page — independent of whether the customer ever revisits the page itself.

### Tests for User Story 2

- [X] T007 [P] [US2] Vitest in `tests/confirmation/email.test.ts` — an order already marked `confirmationEmailSentAt` is never re-sent; an order not yet `status = 'paid'` is never sent; a simulated provider failure is caught and never propagates (FR-006–FR-009)

### Implementation for User Story 2

- [X] T008 [US2] Implement `sendConfirmationEmail(orderId)` in `src/lib/confirmation/email.ts` — in one operation, checks `status = 'paid'` AND `confirmationEmailSentAt IS NULL` and sets `confirmationEmailSentAt` as part of that same check (e.g. a single conditional `UPDATE ... RETURNING`) so a redelivery can never race past it (FR-008); on success, sends via the Resend client with the same order summary content as the confirmation page; catches and logs any provider failure without throwing (FR-009); ships with a deterministic fake for tests, per this project's established fake-provider pattern — depends on T001
- [X] T009 [US2] Wire `sendConfirmationEmail` into `src/app/api/webhooks/paypal/route.ts` (feature 3) — call it immediately after that handler marks an order `paid` — depends on T008

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Revisit the confirmation later via a saved link (Priority: P3)

**Goal**: A confirmation page opened later (bookmark or emailed link) always reflects the order's current, accurate state — never a stale snapshot, and never another order's data.

**Independent Test**: Save a confirmation page's URL, close everything, and reopen it later (potentially after the order's status has changed) — confirm it still shows accurate, current information, fetched fresh.

### Tests for User Story 3

- [X] T010 [US3] Extend `e2e/order-confirmation.spec.ts` — revisit a saved confirmation URL after the order's status has changed and confirm the page reflects the new state, not a stale one; request two different orders' tokens and confirm neither ever exposes the other's data (FR-010, SC-003, SC-004)

### Implementation for User Story 3

- [X] T011 [US3] Ensure `src/app/(storefront)/orders/[token]/page.tsx` renders dynamically with no static or time-based caching (e.g. `export const dynamic = 'force-dynamic'`) — every visit re-fetches fresh from `getOrderConfirmation` rather than serving a cached snapshot — depends on T005

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T012 [P] Run `quickstart.md`'s manual validation scenarios 1–10 (immediate confirmation, status timeline, still-confirming state, timeout message, not found, one-time email, email-failure isolation, revisit later, unguessable URL, privacy/security check)
- [X] T013 [P] Accessibility spot-check of the real built confirmation page against the already-reviewed wireframe tokens (ADR-0003/ADR-0004) — cover every state (confirming, paid, timed-out, not-found), not just the happy path (Principle III: target, not a blocking gate)
- [X] T014 Run `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all four MUST pass (Principle V) — depends on all prior tasks
- [X] T015 Update `status.md` and `CHANGELOG.md` marking feature 4 (order confirmation) implemented — depends on T014

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup and on feature 3 already being implemented — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US1 (P1) has no dependency on US2/US3 — the MVP slice
  - US2 (P2) is independent of US1's page — it only needs T003's schema/data already existing and hooks into feature 3's webhook route
  - US3 (P3) is a thin addition on top of US1's page (T005) — dynamic rendering plus a revisit/privacy test
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each Phase

- Tests (where included) before the implementation they cover
- T005 (page) before T006 (polling) and T011 (dynamic rendering) — same file, sequential
- T008 (email module) before T009 (webhook wiring) — T009 depends on T008 existing

### Parallel Opportunities

- T001, T002 (Setup) — different files
- T007 (US2 test) can run in parallel with T004 (US1 test) — different files, no shared dependency
- T012, T013 (Polish) — different concerns, no file conflict

---

## Parallel Example: Setup Phase

```bash
# Both proceed together:
Task: "Add resend as a dependency in package.json"
Task: "Author docs/adr/0015-resend-for-transactional-email.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — a customer sees an accurate confirmation page, including the confirming→paid transition
3. **STOP and VALIDATE**: run T004, confirm US1's Independent Test manually
4. US2 (email) and US3 (revisit hardening) build on this next

### Incremental Delivery

1. Setup + Foundational → `getOrderConfirmation` ready
2. US1 → validate independently (MVP: a real confirmation page)
3. US2 → validate independently (exactly one email, sent at the right moment)
4. US3 → validate independently (fresh-on-every-visit, no cross-order leakage)
5. Polish → full quickstart pass, accessibility spot-check, full check suite, docs update

---

## Notes

- This feature depends on feature 3 being **implemented**, not just planned — it reads real `orders`/`order_items` rows and modifies feature 3's webhook route file
- No new database table or migration — `confirmationToken`/`confirmationEmailSentAt` already exist on feature 3's `orders` table
- T002's ADR is a documentation commitment from `plan.md`'s Constitution Check, not optional polish
- `email.ts` (T008) ships with a deterministic fake from the start, per this project's established fake-provider pattern — tests never depend on a real Resend sandbox being reachable
