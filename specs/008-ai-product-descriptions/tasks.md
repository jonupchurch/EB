# Tasks: AI Product Description Writer/Editor

**Input**: Design documents from `specs/008-ai-product-descriptions/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/actions.md](contracts/actions.md), [quickstart.md](quickstart.md)

**Tests**: Included per plan.md's Test Discipline gate (Constitution Principle V) — Vitest for the provider module's fake path and input validation, plus an extension of feature 1's existing `e2e/admin-products.spec.ts` (no new e2e spec file needed).

**Organization**: Tasks are grouped by user story (spec.md's P1–P3) so each can be validated independently once the Foundational phase is done. Because US1 and US2 share one Server Action and one provider function (`research.md`'s "one Server Action" decision), the shared plumbing lands in Foundational — each story phase then adds only its own button/UI wiring and test coverage.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- File paths are exact and match `plan.md`'s Project Structure

**Cross-feature note**: this is the project's first AI/LLM feature — no existing lib module or Server Action to extend for the model call itself, though the Product Editor (`src/app/admin/products/product-editor.tsx`, `actions.ts`) and admin auth/rate-limit infrastructure (feature 1) are all already **implemented** and reused directly.

---

## Phase 1: Setup

- [X] T001 Add the `ai` package (`npm install ai@^6`) — the only new dependency this feature introduces
- [X] T002 Confirm AI Gateway is enabled for the linked Vercel project (dashboard: `https://vercel.com/{team}/{project}/settings` → AI Gateway, per `quickstart.md`) — required before T004 can resolve a real model slug; **stop and ask the user to enable it if it isn't already** rather than guessing
- [X] T003 Resolve the exact Gateway slug for Claude Haiku 4.5 by calling `gateway.getAvailableModels()` (per `research.md`'s model decision) and record the confirmed string as a constant for use in T005 — depends on T001, T002

ADR-0018 (Vercel AI Gateway, Claude Haiku 4.5) and the `docs/non-functional.md` latency/cost target were already written during `/speckit-plan` — nothing further owed here.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one shared provider function and request schema every user story calls into.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Add `descriptionRequestSchema` to `src/lib/admin/schemas.ts` — `name` (required, non-empty trimmed string, FR-011), `categoryName?`, `stylingLabels?` (string array), `materialLabels?` (string array), `basePriceCents?` (non-negative int), `currentDescription?`, per `data-model.md`
- [X] T005 Implement `src/lib/admin/description-writer.ts`'s `suggestProductDescription(request)` — real path: `generateText` with an `output: Output.object({ schema })` spec against the Claude Haiku 4.5 slug from T003 (`generateObject` turned out to be deprecated in the installed `ai@6` in favor of this — confirmed by reading the installed package's own types rather than assuming), building a "write a first draft" prompt when `currentDescription` is absent or a "rewrite/polish this" prompt when present (per `contracts/actions.md`); fake path: a deterministic template string built from the given fields (name/category/etc.), gated by the existing `CHECKOUT_FAKE_PROVIDERS` flag (per `research.md` — reusing this project's single fake-provider switch, not a new one) — depends on T003, T004
- [X] T006 [P] Vitest for `description-writer.ts`'s fake path in `tests/admin/description-writer.test.ts` — the "generate" mode (no `currentDescription`) and "improve" mode (`currentDescription` present) each produce deterministic output that reflects the actual input fields (name, category, price), proving real data reaches the function per `research.md`'s "not a hardcoded constant" decision — depends on T005

**Checkpoint**: Foundation ready — the provider function produces correct, validated output in isolation (fake mode); user story work (the Server Action and UI) can now begin.

---

## Phase 3: User Story 1 - Generate a first-draft description (Priority: P1) 🎯 MVP

**Goal**: An admin can click "Generate" on a product with no description and get an AI-produced first draft, reviewable and editable, never saved until she explicitly saves the product.

**Independent Test**: Configure a product with a name/category/price but no description, click "Generate," confirm a draft appears reflecting that product's real data, and confirm the saved description is unaffected until Save — per `quickstart.md` scenarios 1–3.

### Tests for User Story 1

- [X] T007 [P] [US1] Already covered by T006's `descriptionRequestSchema` test — unlike promotions, `suggestDescription`'s only validation is that Zod schema directly (no separate type-specific field-checker function), and the Server Action itself can't run in Vitest anyway (`requireAdminSession` depends on `next/headers`, the same constraint `promotion-crud.ts` documents) — no separate test file needed

### Implementation for User Story 1

- [X] T008 [US1] Implement `suggestDescription` Server Action in `src/app/admin/products/actions.ts` — `requireAdminSession` + `checkAdminRateLimit` (FR-007, FR-008), validates input via `descriptionRequestSchema` (T004), calls `suggestProductDescription` (T005), returns `{ ok: true, data: { description } }` or the shared error shape on any failure (FR-009) — depends on T005, T006
- [X] T009 [US1] Add a "Generate" button to `src/app/admin/products/product-editor.tsx`, shown only when the description field is currently blank — on click, calls `suggestDescription` with the form's current (possibly-unsaved) name/category/styling/material/price, shows a pending state, and on success sets the same local `description` state the textarea already controls (FR-001, FR-003, FR-004) — depends on T008
- [X] T010 [US1] Extend `e2e/admin-products.spec.ts` — create a product with a name/category/price and no description, click "Generate," confirm a draft appears in the description textarea, edit it, save, and confirm the edited (not raw AI) text persists on reload — depends on T009

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP scope) — a first-draft description can be generated, edited, and saved end to end.

---

## Phase 4: User Story 2 - Improve an existing description (Priority: P2)

**Goal**: An admin can click "Improve" on a product that already has a description and get a rewritten alternative, reviewable before saving.

**Independent Test**: Open a product with an existing description, click "Improve," confirm a rewritten alternative appears based on the current text, and confirm the original is unaffected unless saved — per `quickstart.md` scenarios 4–5.

### Implementation for User Story 2

- [X] T011 [US2] Add an "Improve" button to `product-editor.tsx`, shown only when the description field is currently non-blank — calls the same `suggestDescription` action (T008) with `currentDescription` set to the field's current value, replacing the field with the returned alternative for review (FR-002, FR-005) — depends on T009
- [X] T012 [US2] Extend `e2e/admin-products.spec.ts` — open a product with an existing description, click "Improve," confirm a rewritten alternative appears, then confirm choosing not to save leaves the original description completely unchanged on reload — depends on T011

**Checkpoint**: User Stories 1 AND 2 both work independently — both Generate and Improve produce a reviewable draft through the same underlying mechanism.

---

## Phase 5: User Story 3 - Try again before committing (Priority: P3)

**Goal**: Confirm requesting another attempt replaces the prior unsaved suggestion rather than accumulating drafts.

**Independent Test**: Generate or improve a description, request another attempt, and confirm the newest suggestion replaces the prior one for review with nothing saved — per `quickstart.md` scenario 6.

### Implementation for User Story 3

- [X] T013 [US3] Confirm (and adjust if needed) that clicking "Generate"/"Improve" again while a draft is showing simply calls `suggestDescription` again and overwrites the same local `description` state (T009's single-state design) rather than appending or stacking suggestions (FR-006) — depends on T009, T011
- [X] T014 [US3] Extend `e2e/admin-products.spec.ts` — after generating a draft, click "Generate" again and confirm the newest draft replaces the prior one for review, with nothing persisted until an explicit Save — depends on T013

**Checkpoint**: All three user stories are independently functional. The AI description writer/editor is complete end to end.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T015 [P] Run `quickstart.md`'s manual validation scenarios 1–11, including the provider-failure (scenario 8) and rate-limit (scenario 9) edge cases
- [X] T016 [P] Accessibility spot-check of the two new buttons and their pending/error states in the Product Editor — no new screen, but confirm no regression against feature 1's zero-violations baseline
- [X] T017 Run `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all four MUST pass (Principle V) — depends on all prior tasks
- [X] T018 Update `status.md` and `CHANGELOG.md` marking feature 8 (AI product description writer/editor) implemented — depends on T017

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T002 may require a one-time action from the user (enabling AI Gateway in the Vercel dashboard) before T003 can proceed
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US1 (P1) is the MVP slice — builds the Server Action and the first UI button every other story reuses
  - US2 (P2) depends on US1's button/state design (T009) but adds no new Server Action
  - US3 (P3) depends on both T009 and T011 existing — it's verification of behavior the shared state design already provides, not new implementation
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each Phase

- T001/T002 before T003 (need the package and Gateway access before resolving a model slug)
- T004/T005 (schema/provider) before T006 (tests of that logic) before T008 (the Server Action that calls it)
- T009 (Generate button) before T011 (Improve button reuses the same action/state) before T013 (regenerate behavior, built on both)

### Parallel Opportunities

- T004 and T006 can be drafted in parallel with T005 in progress, though T006 needs T005 finished to actually run
- T015, T016 (Polish) — different concerns, can proceed in parallel; T017 depends on all prior tasks

---

## Parallel Example: After Foundational

```bash
# US1's Server Action and button land first; US2/US3 build on the same state:
Task: "Implement suggestDescription action + Generate button (T008-T010)"
# Once T009 lands:
Task: "Add the Improve button, reusing the same action (T011-T012)"
Task: "Verify regenerate replaces rather than stacks (T013-T014)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — a working "Generate" button, end to end
3. **STOP and VALIDATE**: run T007, confirm US1's Independent Test manually
4. US2 (Improve) and US3 (regenerate) build on the same action and state next

### Incremental Delivery

1. Foundational → the provider function produces correct, validated output in isolation
2. US1 → validate independently (MVP: a real first-draft description, generated and saved)
3. US2 → validate independently (a real polished alternative for existing text)
4. US3 → validate independently (regenerating never accumulates stale drafts)
5. Polish → full quickstart pass, accessibility spot-check, the full check suite, docs update

---

## Notes

- This feature depends on feature 1 (Product Editor, admin auth/rate-limit) being **implemented** (it is) — it extends `product-editor.tsx`/`actions.ts` directly rather than composing not-yet-built infrastructure
- One new ADR (0018) — already written during `/speckit-plan`, this project's first AI/LLM provider decision
- No schema/migration change at all — this feature's only "data" is the transient request/response shapes described in `data-model.md`
- US2 and US3 are intentionally light on new implementation — per `spec.md`'s Assumptions, they reuse US1's Server Action and UI state as-is, differing only in whether `currentDescription` is passed and how many times the button is clicked
