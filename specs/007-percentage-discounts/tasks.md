# Tasks: Percentage-Off Discounts

**Input**: Design documents from `specs/007-percentage-discounts/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/actions.md](contracts/actions.md), [quickstart.md](quickstart.md)

**Tests**: Included per plan.md's Test Discipline gate (Constitution Principle V) — Vitest for the new percentage/cap calculation math and validation, plus an extension of feature 5's existing `e2e/admin-discounts.spec.ts` (no new e2e spec file needed).

**Organization**: Tasks are grouped by user story (spec.md's P1–P3) so each can be validated independently once the Foundational phase is done. Because all three stories share one calculation function and one admin form, the core percentage/cap arithmetic and schema land in Foundational (needed by every story, not owned by any single one) — each story phase then adds the story-specific wiring, UI, and test coverage on top of it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- File paths are exact and match `plan.md`'s Project Structure

**Cross-feature note**: this feature extends feature 3/5's already-**implemented**, already-live `promotions` table and `src/lib/checkout/promotions.ts`. Unlike every earlier cross-feature schema amendment in this project, the migration here runs against a table with real Production rows — it must stay additive-only (see `data-model.md`'s Migration shape).

---

## Phase 1: Setup

No new dependencies or ADRs are owed by this feature — every technology used here (database, Drizzle, Zod) was already decided by ADR-0001/0002/0007 (`research.md`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema change and the shared percentage/cap calculation every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Add the `promotion_value_mode` enum (`flat` \| `percentage`) and the `valueMode` (not null, default `flat`), `discountPercent` (nullable integer), `maxDiscountCents` (nullable integer) columns to the `promotions` table in `src/db/schema.ts`, per `data-model.md`
- [X] T002 Generate the Drizzle migration (`npm run db:generate`), confirm the output is additive-only (new enum type + `ALTER TABLE ... ADD COLUMN`, no `ALTER TYPE` on the existing `promotion_type` enum), and commit it as `drizzle/0007_*.sql` — depends on T001
- [X] T003 Apply the migration locally (`npm run db:migrate`) and confirm every existing promotion row now reads `value_mode = 'flat'` with unchanged calculated behavior — depends on T002
- [X] T004 [P] Extend `PromotionRecord` (`src/lib/checkout/promotions.ts`) and `PromotionListItem`/`toPromotionRecord` (`src/lib/admin/promotion-crud.ts`) with `valueMode`, `discountPercent`, `maxDiscountCents`, per `data-model.md` — depends on T003
- [X] T005 [P] Extend `promotionInputSchema` in `src/lib/admin/schemas.ts` — `valueMode` (`"flat" | "percentage"`, default `"flat"`), `discountPercent` (optional int, 1–100), `maxDiscountCents` (optional non-negative int), per `data-model.md`'s validation rules — depends on T003
- [X] T006 Implement the percentage branch of `calculateDiscount()` in `src/lib/checkout/promotions.ts`: for `type: "flat"`/`type: "promo_code"`, when `valueMode === "percentage"`, compute `Math.round(subtotalCents * discountPercent / 100)`, clamp to `maxDiscountCents` when set, then clamp to `subtotalCents` (unchanged final safety clamp); `valueMode === "flat"` keeps today's exact behavior — depends on T004
- [X] T007 Update `typeSpecificFieldError` in `src/lib/admin/promotion-crud.ts` so `flat`/`promo_code` types require `discountPercent` (not `discountAmountCents`) when `valueMode === "percentage"` (FR-003), leaving `bogo`/`cart_threshold`/`free_shipping` entirely unaffected (FR-014) — depends on T005
- [X] T008 [P] Vitest for the pure calculation/validation logic in `tests/checkout/promotions.test.ts` — percentage rounding (e.g. 15% of an odd subtotal), an uncapped percentage discount, a capped percentage discount (cap binds before the subtotal-safety clamp), a 100% discount reducing the total to $0, and rejection of 0%/negative/101% — depends on T006, T007

**Checkpoint**: Foundation ready — percentage discounts calculate and validate correctly in isolation; user story work (UI wiring, end-to-end coverage) can now begin.

---

## Phase 3: User Story 1 - Promo code takes a percentage off (Priority: P1) 🎯 MVP

**Goal**: An admin can create a percentage-off promo code (with an optional max-discount cap), and a customer entering that code at checkout sees the exact expected percentage discount applied.

**Independent Test**: Create a percentage promo code (with and without a cap) through the real admin UI, enter it at checkout against a known subtotal, and confirm the discount matches — exactly per `quickstart.md` scenarios 1–2.

### Tests for User Story 1

- [X] T009 [P] [US1] Vitest for `validatePromoCode` in `tests/checkout/promotions.test.ts` — a percentage promo code returns the correct discount for a matching subtotal; an expired/not-yet-active/inactive percentage promo code is rejected identically to a flat one (FR-007, FR-008) — depends on T008

### Implementation for User Story 1

- [X] T010 [US1] Add a value-mode control to `src/app/admin/discounts/discounts-manager.tsx`'s form — a Flat/Percentage toggle shown for `flat` and `promo_code` types only, with a percent input (1–100) and an optional max-discount-cap `PriceInput`, replacing the dollar `PriceInput` when "Percentage" is selected — depends on T007
- [X] T011 [US1] Update `describeValue()` and the promotion list table in `discounts-manager.tsx` to render a percentage promotion's rate (and cap, if set) distinctly from a flat dollar amount (FR-013) — depends on T010
- [X] T012 [US1] Extend `e2e/admin-discounts.spec.ts` — create a percentage promo code (with a cap) through the real admin UI and confirm it discounts the next checkout by the exact expected, capped amount — depends on T011

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP scope) — a percentage promo code, capped or uncapped, works end to end.

---

## Phase 4: User Story 2 - Automatic sitewide percentage promotion (Priority: P2)

**Goal**: An admin can activate a codeless percentage promotion that applies automatically at checkout, correctly competing against other automatic promotions (including flat-amount ones) for best value.

**Independent Test**: Activate an automatic percentage promotion, check out with no code entered, and confirm it applies — then activate a competing automatic flat-amount promotion and confirm whichever is worth more to the specific cart wins, per `quickstart.md` scenarios 7–8.

### Tests for User Story 2

- [X] T013 [P] [US2] Vitest for the automatic-promotion best-value comparison in `tests/checkout/promotions.test.ts` — with one automatic flat promotion and one automatic percentage promotion, the higher-value one wins for a given subtotal, and this flips correctly when the subtotal changes which one is worth more (FR-009). Implemented against a new pure `pickBestPromotion` function extracted from `resolveApplicablePromotion` rather than the DB-backed function directly — a DB-backed version of this test proved genuinely flaky (it collided with unrelated active automatic promotions already in the local database), so the comparison logic was pulled out to be unit-testable in isolation — depends on T008

### Implementation for User Story 2

- [X] T014 [US2] Confirm (and adjust if needed) that creating a `type: "flat"` promotion with `valueMode: "percentage"` via the form built in T010 correctly produces a codeless automatic percentage promotion — no `promoCode` field is shown or required for `type: "flat"` regardless of `valueMode` — depends on T010
- [X] T015 [US2] Extend `e2e/admin-discounts.spec.ts` — activate an automatic percentage promotion with no code entered and confirm it applies at the next checkout — depends on T014

**Checkpoint**: User Stories 1 AND 2 both work independently — percentage discounts work whether triggered by a code or automatically, and correctly compete with flat-amount promotions.

---

## Phase 5: User Story 3 - Capping a percentage promotion's maximum discount (Priority: P3)

**Goal**: Confirm the maximum-discount cap introduced in Foundational is genuinely optional per-promotion — enforced only where an admin actually sets one.

**Independent Test**: Create one percentage promotion with a cap and one without; confirm the cap applies only to the one that has it, per `quickstart.md` scenario 3.

### Tests for User Story 3

- [X] T016 [P] [US3] Vitest in `tests/checkout/promotions.test.ts` confirming a percentage promotion with `maxDiscountCents: null` applies the full uncapped discount regardless of subtotal size (FR-006) — this is the one case not already covered by T008's capped-vs-uncapped pair; makes the "optional, not required" behavior an explicit, named test rather than an incidental byproduct — depends on T008

### Implementation for User Story 3

- [X] T017 [US3] Confirm the max-discount-cap input added in T010 is genuinely optional (left blank persists as `null`, not `0` or an empty-string coercion) and clearly labeled as optional in the form — depends on T010

**Checkpoint**: All three user stories are independently functional. Percentage-off discounts are complete end to end.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] Run `quickstart.md`'s manual validation scenarios 1–13
- [X] T019 [P] Accessibility spot-check of the extended discounts admin form (new toggle and inputs correctly labeled) — no new screen, low risk, but confirm no regression against feature 5's zero-violations baseline
- [X] T020 Regression pass: re-run feature 5's original five promotion-type scenarios (flat, BOGO, promo-code flat, cart threshold, free shipping) and confirm identical checkout totals to before this feature (FR-011, SC-003)
- [X] T021 Run `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all four MUST pass (Principle V) — depends on all prior tasks
- [X] T022 Update `status.md` and `CHANGELOG.md` marking feature 7 (percentage-off discounts) implemented — depends on T021

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Nothing to do — no dependency, no blocking
- **Foundational (Phase 2)**: Depends on features 3/5 already being implemented (they are) — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US1 (P1) is the MVP slice — builds the admin form control every other story reuses
  - US2 (P2) depends on US1's form control (T010) existing, but adds no new UI of its own — it's largely verification + test coverage of behavior the shared foundation and form already provide
  - US3 (P3) likewise depends on T010 and adds only a targeted test plus a UX confirmation — the cap mechanism itself was built in Foundational
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each Phase

- Schema (T001) before migration (T002) before applying it (T003)
- T004/T005 (types/validation) before T006/T007 (calculation/field-requirement logic) before T008 (tests of that logic)
- T010 (the form control) before T011 (list display) before T012 (e2e) — and before T014/T017, which depend on T010 existing

### Parallel Opportunities

- T001, T004, T005 — different concerns within Foundational, though T004/T005 both depend on T003 completing first
- T009 (US1 test) and T013 (US2 test) and T016 (US3 test) — different test cases in the same file; sequence them to avoid conflicting edits, or split across contributors carefully
- T018, T019, T020 (Polish) — different concerns, can proceed in parallel; T021 depends on all prior tasks

---

## Parallel Example: After Foundational

```bash
# US1's form control lands first; US2/US3 then proceed largely as verification:
Task: "Build the value-mode toggle in discounts-manager.tsx (T010-T012)"
# Once T010 lands:
Task: "Verify automatic percentage promotions + best-value comparison (T013-T015)"
Task: "Verify the optional cap behavior (T016-T017)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup — nothing to do) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — a percentage-off promo code, capped or uncapped, works end to end
3. **STOP and VALIDATE**: run T009, confirm US1's Independent Test manually
4. US2 (automatic promotions) and US3 (cap verification) build on the same form and calculation next

### Incremental Delivery

1. Foundational → percentage/cap calculation and validation correct in isolation
2. US1 → validate independently (MVP: a real percentage promo code customers can use)
3. US2 → validate independently (a sitewide percentage sale needing no code)
4. US3 → validate independently (the cap is genuinely optional, never accidentally required)
5. Polish → full quickstart pass, a zero-regression check against every pre-existing promotion type, the full check suite, docs update

---

## Notes

- This feature depends on features 3 and 5 being **implemented** (they are, per `status.md`) — it extends their already-live `promotions` table and `calculateDiscount()` directly, rather than composing not-yet-built infrastructure the way earlier cross-feature amendments did
- No new ADR — every technology choice here was already made and documented by ADR-0001/0002/0007
- The migration (T002) is the one genuinely new risk in this feature: it's the first schema change in this project against a table with real Production data. Its additive-only shape (new enum type, new nullable/defaulted columns, no touch to the existing `promotion_type` enum) is what keeps it safe to run via the existing `/api/admin/migrate` endpoint with zero effect on existing rows
- US2 and US3 are intentionally light on new implementation — per `spec.md`, US3 is explicitly "a protective refinement of User Stories 1 and 2 rather than a standalone capability," and US2 reuses US1's form control as-is (the same toggle serves both `promo_code` and codeless `flat` types)
