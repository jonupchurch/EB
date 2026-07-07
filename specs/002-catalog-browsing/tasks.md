# Tasks: Catalog & Browsing

**Input**: Design documents from `specs/002-catalog-browsing/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/queries.md](contracts/queries.md), [quickstart.md](quickstart.md)

**Tests**: Included per plan.md's Test Discipline gate (Constitution Principle V) — Vitest for the processing-option customer-selectability filter (the one genuinely new piece of logic; the pricing calculation itself is reused, not reinvented), one Playwright e2e for the browse → product detail → configure → price flow.

**Organization**: Tasks are grouped by user story (spec.md's P1–P2) so each can be implemented and validated independently once the Foundational phase is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Which user story this task belongs to (US1–US2)
- File paths are exact and match `plan.md`'s Project Structure

---

## Phase 1: Setup

- [ ] T001 [P] Author `docs/adr/0010-catalog-rendering-strategy.md` — formalizes the SSR-over-ISR decision already reflected in `research.md` (Constitution Principle I obligation)
- [ ] T002 [P] Add a product-image placeholder asset (e.g. `public/assets/product-placeholder.svg`) for products with zero images, per spec.md's Edge Cases

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The real storefront shell every page in this feature renders inside. No story work starts before this phase is done.

- [ ] T003 [P] Update `src/app/layout.tsx`'s `metadata` (title/description) to the real business name — Erica Burns Things — replacing the placeholder comment left from project scaffolding
- [ ] T004 [P] Remove the placeholder `src/app/page.tsx` — superseded by the `(storefront)` route group's own `page.tsx` (US1); removing it first avoids a route conflict (both would otherwise map to `/`)
- [ ] T005 Implement `src/app/(storefront)/layout.tsx` — real storefront nav (using the reviewed brand assets) and footer, per `Resources/wireframes/Store Pages.html`; deliberately a separate route-group layout so it never wraps `/admin`'s own layout (`research.md`'s route-structure decision)

**Checkpoint**: Foundation ready — user story work can begin.

---

## Phase 3: User Story 1 - Browse the catalog by category (Priority: P1) 🎯 MVP

**Goal**: A visitor sees every Active product, grouped by category, each with its primary image, name, and starting price.

**Independent Test**: With several Active products already loaded (via feature 1) across multiple categories, load the browse view and confirm each displays correctly, grouped under its category — no dependency on the product detail view.

### Implementation for User Story 1

- [ ] T006 [US1] Implement `getActiveCategories()` and `getActiveProductsByCategory(categoryId?)` in `src/lib/catalog/queries.ts` — both hard-filter `status = 'active'` server-side; each product's `primaryImageUrl` is its lowest-`sortOrder` image, or `null` if it has none, per `contracts/queries.md`
- [ ] T007 [US1] Implement `src/app/(storefront)/page.tsx` — the Browse view: category groupings/filter, each product's primary image (placeholder from T002 if `null`), name, and starting price — per `Resources/wireframes/Store Pages.html` — depends on T005, T006

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP scope).

---

## Phase 4: User Story 2 - View a product and configure it to see an accurate price (Priority: P2)

**Goal**: A visitor opens a product's detail page, sees its full description/images/options, and gets an accurate live total as they configure it.

**Independent Test**: Open an existing product's detail page directly, select various available options, and confirm the displayed total always equals base price plus every selected option's adjustment — no dependency on the browse view.

### Tests for User Story 2

- [ ] T008 [P] [US2] Vitest for the processing-option filter in `tests/catalog/processing-options.test.ts` — a mixed array of options (some `requiresCustomerUpload: true`, some `false`) confirms only the latter are returned, including the all-excluded case (spec.md Edge Cases)

### Implementation for User Story 2

- [ ] T009 [US2] Implement `isCustomerSelectable(option)` in `src/lib/catalog/processing-options.ts` — pure filter excluding any processing option with `requiresCustomerUpload = true`, per `research.md`
- [ ] T010 [US2] Implement `getActiveProduct(id)` in `src/lib/catalog/queries.ts` — full product, all images (ordered by `sortOrder`), and every option category, with `processingOptions` filtered through T009; returns `not_found` for a Draft **or** nonexistent `id`, indistinguishably (FR-002, FR-009) — depends on T009
- [ ] T011 [US2] Implement `src/app/(storefront)/products/[id]/page.tsx` — full description, images (placeholder from T002 if none), every option category as selectable controls (styling/material/size/color/design-location; processing pre-filtered by T010), a live running total reusing `src/lib/pricing.ts` (feature 1 — never reimplemented), and a not-found page for a missing/Draft product — per `Resources/wireframes/Store Pages.html` — depends on T005, T010
- [ ] T012 [US2] Playwright e2e in `e2e/catalog-browsing.spec.ts` — browse the catalog (US1 flow), open a product, select several priced options, confirm the displayed total is accurate (US2 flow); separately, request a known Draft product's detail URL directly and confirm it returns not-found — depends on T006, T007, T010, T011

**Checkpoint**: User Stories 1 AND 2 both work independently — the full feature is functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T013 [P] Run `quickstart.md`'s manual validation scenarios 1–12 (browse, Draft-hiding, category filter, missing-image placeholder, product detail, live pricing cross-checked against feature 1's admin editor, deferred-processing-option exclusion, Draft/nonexistent product URLs, full launch-catalog spot-check, no unbranded pages, privacy/security check)
- [ ] T014 [P] Accessibility spot-check of the real built storefront against the already-reviewed wireframe tokens (ADR-0003/ADR-0004) — confirm the implementation introduces no new contrast regressions (Principle III: target, not a blocking gate)
- [ ] T015 [P] Fold the concrete Largest Contentful Paint target (plan.md's Performance Goals: <2.5s) back into `docs/non-functional.md`'s previously-TBD "product/catalog pages" row
- [ ] T016 Run `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all four MUST pass (Principle V) — depends on all prior tasks
- [ ] T017 Update `status.md` and `CHANGELOG.md` marking feature 2 (catalog & browsing) implemented — depends on T016

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–4)**: Both depend on Foundational completion
  - US1 (P1) has no dependency on US2 — the MVP slice
  - US2 (P2) can start after Foundational, but its e2e task (T012) also exercises US1's browse flow, so the feature reads as fully validated once both stories land
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each Phase

- Tests (where included) before the implementation they cover
- Query functions before the pages that call them
- The storefront layout (T005) before any page that renders inside it

### Parallel Opportunities

- T001, T002 (Setup) — different files
- T003, T004 (Foundational) — different files, no unfinished dependency

---

## Parallel Example: Setup Phase

```bash
Task: "Author docs/adr/0010-catalog-rendering-strategy.md"
Task: "Add a product-image placeholder asset in public/assets/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — visitors can browse the real catalog
3. **STOP and VALIDATE**: confirm US1's Independent Test manually
4. US2 (product detail + pricing) builds on this next

### Incremental Delivery

1. Setup + Foundational → storefront shell ready
2. US1 → validate independently (MVP: browse works)
3. US2 → validate independently (detail + accurate pricing works)
4. Polish → full quickstart pass, accessibility spot-check, non-functional.md update, full check suite, docs update

---

## Notes

- `src/lib/catalog/queries.ts` is touched by both T006 (US1) and T010 (US2) — sequential relative to each other even though not explicitly marked, to avoid same-file conflicts
- `docs/adr/0010-catalog-rendering-strategy.md` (T001) is a documentation commitment from `plan.md`'s Constitution Check, not optional polish
- This feature adds no new database tables and no new Server Actions — every task here is a query, a page, or a pure filter function
