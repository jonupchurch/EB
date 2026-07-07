# Tasks: Admin Product Management

**Input**: Design documents from `specs/001-admin-product-management/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/actions.md](contracts/actions.md), [quickstart.md](quickstart.md)

**Tests**: Included per plan.md's Test Discipline gate (Constitution Principle V) — Vitest for the pricing calculation and Zod schema validation, one Playwright e2e for the sign-in → create → list flow.

**Organization**: Tasks are grouped by user story (spec.md's P1–P4) so each can be implemented and validated independently once the Foundational phase is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Which user story this task belongs to (US1–US4)
- File paths are exact and match `plan.md`'s Project Structure

---

## Phase 1: Setup

- [ ] T001 [P] Add Auth.js (`next-auth`) as a dependency in `package.json`
- [ ] T002 [P] Add `@vercel/blob` as a dependency in `package.json`
- [ ] T003 [P] Author `docs/adr/0007-product-options-schema.md` — formalizes the relational-tables-per-option-category decision already reflected in `data-model.md`/`research.md` (Constitution Principle I obligation)
- [ ] T004 [P] Author `docs/adr/0009-vercel-blob-for-product-images.md` — formalizes the server-side `put()` upload decision already reflected in `research.md` (Constitution Principle I obligation)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, auth gating, and shared logic every user story needs. No story work starts before this phase is done.

- [ ] T005 Extend `src/db/schema.ts` with `categories`, `products` (nullable `categoryId` FK, `status` enum default `draft`, nullable `weightOz`/`lengthIn`/`widthIn`/`heightIn`), the six option tables — `processingOptions` (with a `requiresCustomerUpload` boolean, default `false`), `stylingOptions`, `materialOptions` (nullable `modelNumber`), `sizeOptions`, `colorOptions` (nullable `swatchHex`), `designLocationOptions` — and `productImages` (`productId` FK, `url`, `sortOrder`), each FK'd to `products` with cascade delete, per `data-model.md`. `health_check` stays untouched.
- [ ] T006 Generate the Drizzle migration for the new tables (`npm run db:generate`), review the output, and commit it as `drizzle/0001_*.sql` — depends on T005
- [ ] T007 Apply the migration locally (`npm run db:migrate`) and confirm the new tables exist — depends on T006
- [ ] T008 [P] Implement `src/auth.ts` — Auth.js config with the Google provider; `signIn` callback rejects any account whose email isn't on the authorized list (read from a new `ADMIN_ALLOWED_EMAILS` env var, comma-separated — add it to `.env.example`/`.env.local`, never hardcode the two real emails in source), per ADR-0006 and `research.md`'s allow-list decision
- [ ] T009 Implement `src/app/api/auth/[...nextauth]/route.ts` wiring `src/auth.ts`'s handlers — depends on T008
- [ ] T010 Implement `src/app/admin/layout.tsx` — session-gated admin shell (nav per `Resources/wireframes/Admin Screens.html`); redirects to sign-in if unauthenticated, denies with a clear message if authenticated but not on the allow-list (defense in depth alongside T008's `signIn` callback, per FR-002) — depends on T008
- [ ] T011 [P] Implement `src/app/admin/page.tsx` — redirects to `/admin/products`
- [ ] T012 Add a test-only Auth.js Credentials provider to `src/auth.ts`, active only when a dedicated test flag is set (never in production), letting Playwright sign in deterministically as an authorized account without real Google OAuth (matches this project's established fake-provider-for-external-dependencies pattern) — depends on T008
- [ ] T013 [P] Implement `src/lib/pricing.ts` (not under `admin/` — feature 2 reuses it for the customer-facing price preview) — running-total calculation (`basePriceCents` + every selected option's `priceAdjustmentCents` across all six categories), per `data-model.md`'s Pricing rules; this single function is used by the admin client-side live preview, admin server-side save validation, and (later) the storefront's price preview, so none of them can ever disagree
- [ ] T014 [P] Implement `src/lib/admin/rate-limit.ts` — simple in-memory rate limiter for admin mutation Server Actions, sized for two trusted users, per `research.md`
- [ ] T015 [P] Implement `src/lib/admin/product-images.ts` — thin wrapper around Vercel Blob's `put()`/`del()` for product photo upload/removal, per ADR-0009 — depends on T002
- [ ] T016 Implement Zod schemas for `Product` and all six option shapes in `src/lib/admin/schemas.ts` (`name`/`label` required; `basePriceCents` required integer ≥ 0; `priceAdjustmentCents` integer, any sign, defaults to 0) per `data-model.md`'s Validation rules — consider `drizzle-zod`'s `createInsertSchema` against T005's tables as a starting point — depends on T005
- [ ] T017 Implement `getCategories()` and `createCategory(name)` (case-insensitive unique) Server Actions in `src/app/admin/products/actions.ts` — supports the "add a new category inline" edge case shared by the Product Editor — depends on T005

**Checkpoint**: Foundation ready — user story work can begin.

---

## Phase 3: User Story 1 - Create a new product with pricing (Priority: P1) 🎯 MVP

**Goal**: The owner can create a brand-new product — name, category, description, base price, images, and any of the six option kinds — and save it as Active or Draft, with an always-accurate running total.

**Independent Test**: Sign in, create a product with a base price and at least one priced option, confirm the running total is correct, save it — no dependency on the list, edit, or duplicate.

### Tests for User Story 1

- [ ] T018 [P] [US1] Vitest for the running-total calculation in `tests/pricing.test.ts` (not under `tests/admin/` — matches `src/lib/pricing.ts`'s shared location) — zero options, single option, multiple categories, and a negative adjustment (e.g. the children's-sizing discount from the wireframe)
- [ ] T019 [P] [US1] Vitest for Zod validation in `tests/admin/product-schema.test.ts` — valid full product; missing name; missing/negative `basePriceCents`; an option row missing its label; an option row's `priceAdjustmentCents` defaulting to 0 when omitted (not blocking the save, per Edge Cases)

### Implementation for User Story 1

- [ ] T020 [US1] Implement `createProduct(input)` Server Action in `src/app/admin/products/actions.ts` — Zod-validate (T016), apply the rate limiter (T014), transactional insert of the product row plus all six option arrays in one transaction (all-or-nothing), per `contracts/actions.md` — depends on T005, T014, T016, T017 (same file)
- [ ] T021 [US1] Implement `addProductImage(productId, file)` Server Action in `src/app/admin/products/actions.ts` — uploads via T015, appends a `productImages` row after the product's current last `sortOrder` — depends on T005, T015
- [ ] T022 [US1] Build the shared Product Editor UI (`src/app/admin/products/product-editor.tsx`) — name/category/description/base-price fields, optional weight/dimensions fields (FR-017), category selector with inline "add new category" (T017), six option sections each with add/remove rows (processing options include a "not yet available to customers" toggle for `requiresCustomerUpload`, FR-016), an image gallery (upload via T021, reorderable, removable), a live running total (T013), Active/Draft controls, and field-level error display (no silent failures, FR-011/FR-012) — per `Resources/wireframes/Admin Screens.html`
- [ ] T023 [US1] Implement `src/app/admin/products/new/page.tsx` — renders the Product Editor (T022) in create mode, calls `createProduct` (T020) on submit, redirects to the products list on success — depends on T020, T021, T022

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP scope).

---

## Phase 4: User Story 2 - View all products at a glance (Priority: P2)

**Goal**: The owner sees every product's name, category, variant count, starting price, and status (Active/Draft, visually distinct) in one list.

**Independent Test**: With existing products already in the system, sign in and confirm the list displays accurate summary information for each — no dependency on creating, editing, or duplicating.

### Implementation for User Story 2

- [ ] T024 [US2] Implement `getProducts()` Server Action in `src/app/admin/products/actions.ts` — returns `{ id, name, categoryName, variantCount, basePriceCents, status }` newest-first; `variantCount` is a simple count of option rows across all six option tables for that product (not a combinatorial expansion, and not counting images, per `data-model.md`) — depends on T005
- [ ] T025 [US2] Implement `src/app/admin/products/page.tsx` — Products list: name/category/variant count/starting price/status, Active vs. Draft visually distinguishable, empty state, "+ New Product" link to `/admin/products/new` — per `Resources/wireframes/Admin Screens.html` — depends on T024
- [ ] T026 [US2] Playwright e2e in `e2e/admin-products.spec.ts` — sign in via the test provider (T012), create a product with a priced option (US1 flow), confirm it appears correctly in the list (US2 flow) — the P1+P2 slice per `plan.md` — depends on T012, T020, T023, T024, T025

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Edit an existing product (Priority: P3)

**Goal**: The owner can open any existing product, change its details/pricing/status/images, and have the change persist.

**Independent Test**: Open an existing product, change a detail or price, save, confirm it persists and shows correctly in the list — no dependency on creating from scratch or duplication.

### Implementation for User Story 3

- [ ] T027 [US3] Implement `getProduct(id)` Server Action in `src/app/admin/products/actions.ts` — full product plus all six option arrays and its `images` array (ordered by `sortOrder`); `not_found` if `id` doesn't exist — depends on T005
- [ ] T028 [US3] Implement `updateProduct(id, input)` Server Action — same Zod validation as `createProduct` (T016); option arrays are the full replacement set, so rows present before but absent from this submission MUST be deleted, not left orphaned; transactional, `not_found` if missing — depends on T005, T016
- [ ] T029 [US3] Implement `removeProductImage(id)` Server Action in `src/app/admin/products/actions.ts` — deletes the `productImages` row and, via T015, the underlying Blob object if no other row references the same `url`; never affects another product's copy of the same image — depends on T005, T015
- [ ] T030 [US3] Implement `reorderProductImages(productId, orderedImageIds)` Server Action — updates `sortOrder` to match the given order; `not_found` if the ID set doesn't exactly match the product's current images — depends on T005
- [ ] T031 [US3] Implement `src/app/admin/products/[id]/page.tsx` — loads via `getProduct` (T027), renders the Product Editor (T022) in edit mode pre-filled (including its images), calls `updateProduct`/`removeProductImage`/`reorderProductImages` (T028–T030) on submit/edit — depends on T022, T027, T028, T029, T030

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - Duplicate a product as a starting point (Priority: P4)

**Goal**: The owner can duplicate an existing product's full configuration — including its images — into a new, independent Draft product.

**Independent Test**: Duplicate an existing product, confirm a new independent Draft product is created with the same configuration and images, and that editing the copy (including removing an image) never alters the original.

### Implementation for User Story 4

- [ ] T032 [US4] Implement `duplicateProduct(id)` Server Action in `src/app/admin/products/actions.ts` — copies the product, all six option arrays, and all `productImages` rows (same `url`, same order, as independent rows) into a new product forced to `draft` status with an auto-generated name ("Copy of {original name}"); reads the source then inserts new rows, never mutates the source; `not_found` if source is missing — depends on T005
- [ ] T033 [US4] Add a "Duplicate" row action to the Products list (`src/app/admin/products/page.tsx`) — calls `duplicateProduct` (T032), then navigates to the new duplicate's edit page (T031) — depends on T025, T031, T032

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Run `quickstart.md`'s manual validation scenarios 1–12 (unauthorized-access denial, create, save validation, Draft vs. Active, list accuracy, edit, duplicate, full launch-catalog spot-check, pricing accuracy, image upload/reorder/remove, image duplication independence, Draft-never-exposed check)
- [ ] T035 [P] Accessibility spot-check of the real built admin UI against the already-reviewed wireframe tokens (ADR-0003/ADR-0004) — confirm the implementation introduces no new contrast regressions (Principle III: target, not a blocking gate)
- [ ] T036 Run `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all four MUST pass (Principle V) — depends on all prior tasks
- [ ] T037 Update `status.md` and `CHANGELOG.md` marking feature 1 (admin product management) implemented — depends on T036

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational completion
  - US1 (P1) has no dependency on other stories — the MVP slice
  - US2 (P2) can start after Foundational, but its e2e task (T026) also exercises US1's create flow, so the story reads as fully validated once both US1 and US2 land
  - US3 (P3) reuses US1's Product Editor component (T022) — build order matters even though the story is independently *testable*
  - US4 (P4) reuses US2's list page (T025) and US3's edit page (T031) as navigation targets
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within Each Phase

- Tests (where included) before the implementation they cover
- Server Actions before the pages that call them
- Shared components (Product Editor, T022) before the pages that render them

### Parallel Opportunities

- T001–T004 (Setup) — different files
- T008, T011, T013, T014, T015 (Foundational) — different files, no unfinished dependency
- T018, T019 (US1 tests) — different test files

---

## Parallel Example: Foundational Phase

```bash
# Once T005 (schema) is committed, these can proceed together:
Task: "Implement src/auth.ts — Google provider + signIn allow-list callback"
Task: "Implement src/lib/pricing.ts — running-total calculation"
Task: "Implement src/lib/admin/rate-limit.ts — admin mutation rate limiter"
Task: "Implement src/lib/admin/product-images.ts — Blob put()/del() wrapper"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — a product can be created with accurate pricing and photos
3. **STOP and VALIDATE**: run T018/T019, confirm US1's Independent Test manually
4. Everything downstream (list, edit, duplicate) builds on this

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate independently (MVP)
3. US2 → validate independently (products are now visible/manageable as a catalog)
4. US3 → validate independently (mistakes/price/photo changes can be fixed)
5. US4 → validate independently (convenience layer on top of 1–3)
6. Polish → full quickstart pass, accessibility spot-check, full check suite, docs update

---

## Notes

- All Server Actions live in one file (`src/app/admin/products/actions.ts`) per `plan.md`'s Project Structure — tasks that touch it are sequential relative to each other even when not explicitly marked, to avoid same-file conflicts
- The Product Editor (T022) is shared between create (US1) and edit (US3) modes — build it once, reuse it
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
- `docs/adr/0007-product-options-schema.md` (T003) and `docs/adr/0009-vercel-blob-for-product-images.md` (T004) are documentation commitments from `plan.md`'s Constitution Check, not optional polish
