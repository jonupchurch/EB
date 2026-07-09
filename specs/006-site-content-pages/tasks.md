# Tasks: Site Content Pages

**Input**: Design documents from `specs/006-site-content-pages/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/actions.md](contracts/actions.md), [quickstart.md](quickstart.md)

**Tests**: Included per plan.md's Test Discipline gate (Constitution Principle V) — Vitest for sanitization and fallback-default logic; one Playwright e2e file covering both the public footer→page flow and the admin edit→immediately-live flow.

**Organization**: Tasks are grouped by user story (spec.md's P1–P2) so each can be implemented and validated independently once the Foundational phase is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Which user story this task belongs to (US1–US2)
- File paths are exact and match `plan.md`'s Project Structure

---

## Phase 1: Setup

- [X] T001 [P] Add `@tiptap/react`, `@tiptap/starter-kit`, `sanitize-html`, and `@types/sanitize-html` as dependencies in `package.json`
- [X] T002 [P] Author `docs/adr/0017-tiptap-and-sanitize-html-for-rich-content.md` — formalizes Tiptap and `sanitize-html` (Constitution Principle I obligation, per `research.md`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one new table and the shared read/sanitize logic both user stories build on.

- [X] T003 Add `sitePageSlugEnum` (`privacy` | `terms` | `about`) and the `site_pages` table (`slug` primary key, `title`, `bodyHtml`, `updatedAt`) to `src/db/schema.ts`, per `data-model.md`
- [X] T004 Generate the Drizzle migration (`npm run db:generate`), review the output, and commit it — depends on T003
- [X] T005 Apply the migration locally (`npm run db:migrate`) and confirm `site_pages` exists — depends on T004
- [X] T006 Implement `src/lib/admin/site-pages.ts` — the fallback-default content per slug (Privacy/Terms converted from `Resources/shared/privacy.md`/`terms and condition.md`, About a short placeholder), `getSitePageContent(slug)` (reads the DB row or falls back, per `contracts/actions.md`), and a `sanitizeBodyHtml(html)` helper wrapping `sanitize-html` with the allowlist from `data-model.md`'s Validation rules — depends on T003

**Checkpoint**: Foundation ready — user story work can begin.

---

## Phase 3: User Story 1 - Read a policy or About page from the storefront (Priority: P1) 🎯 MVP

**Goal**: A customer can reach and read all three pages from the footer, with real content even before any admin edit.

**Independent Test**: From any storefront page, click each of the three footer links and confirm each opens a real page showing a title and formatted body — the seeded starter content for Privacy/Terms, a clear placeholder for About.

### Tests for User Story 1

- [X] T007 [US1] Playwright e2e in `e2e/site-content-pages.spec.ts` covering: the footer shows all three links from the homepage; each link opens its page showing real title/body content (not blank); the About page shows a placeholder message

### Implementation for User Story 1

- [X] T008 [P] [US1] Implement `src/app/(storefront)/privacy/page.tsx` — reads via `getSitePageContent("privacy")`, renders the sanitized body via `dangerouslySetInnerHTML` (safe here only because T006 already sanitized it before storage) — depends on T006
- [X] T009 [P] [US1] Implement `src/app/(storefront)/terms/page.tsx` — same pattern as T008 — depends on T006
- [X] T010 [P] [US1] Implement `src/app/(storefront)/about/page.tsx` — same pattern as T008 — depends on T006
- [X] T011 [US1] Update `src/app/(storefront)/layout.tsx`'s footer — add "Privacy Policy," "Terms of Use," and "About Us" links (FR-001) — depends on T008, T009, T010

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP scope) — real pages exist and are reachable, even with zero admin edits made yet.

---

## Phase 4: User Story 2 - Edit page content without a code change (Priority: P2)

**Goal**: The admin can edit each page's title and body through a rich text editor, with changes live on the public page immediately.

**Independent Test**: Sign in as admin, open the content editor for each of the three pages, change the title and body (headings, bold/italic, a list, a link), save, and confirm the public page reflects the change immediately.

### Tests for User Story 2

- [X] T012 [P] [US2] Vitest in `tests/admin/site-pages.test.ts` — `sanitizeBodyHtml` neutralizes a `<script>` tag, an `onerror` attribute, and a `javascript:` link href (FR-005); `getSitePageContent` returns the correct fallback default (and `isDefault: true`) for each slug with no saved row, and the saved row (with `isDefault: false`) once one exists

### Implementation for User Story 2

- [X] T013 [US2] Implement `getSitePageForEditor`, `saveSitePage` Server Actions in `src/app/admin/content/actions.ts` — `saveSitePage` Zod-validates a non-empty `title`, sanitizes `bodyHtml` via T006's helper before writing (FR-005), and applies feature 1's admin rate limiter — depends on T006
- [X] T014 [US2] Implement `src/app/admin/content/content-editor.tsx` — a Tiptap editor (headings, bold/italic, lists, links only, per `research.md`) with a tab switcher between the three known slugs, a save button, and the established try/catch error-handling pattern (no silent failures) — depends on T013
- [X] T015 [US2] Implement `src/app/admin/content/page.tsx` — loads all three pages' current content via `getSitePageForEditor` and renders `ContentEditor` — depends on T014
- [X] T016 [US2] Update `src/app/admin/layout.tsx`'s sidebar — add a "Content" link to `/admin/content` — depends on T015
- [X] T017 [US2] Extend `e2e/site-content-pages.spec.ts` — sign in as admin, edit each of the three pages (a heading, bold text, a list, a link), save, and confirm the public page reflects it immediately without a reload of the admin tab; confirm unauthenticated access to `/admin/content` redirects to sign-in (FR-007) — depends on T011, T016

**Checkpoint**: Both user stories are independently functional — this feature is complete.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T018 [P] Run `quickstart.md`'s manual validation scenarios 1–7
- [X] T019 [P] Accessibility spot-check of the three public pages' rendered rich content (heading hierarchy, link text, list semantics — a new rendering pattern for this codebase) and the admin content editor (Principle III)
- [X] T020 Run `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all four MUST pass (Principle V) — depends on all prior tasks
- [X] T021 Update `status.md` and `CHANGELOG.md` marking feature 6 (site content pages) implemented — depends on T020

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–4)**: All depend on Foundational completion
  - US1 (P1) has no dependency on US2 — the MVP slice (real pages exist and are reachable)
  - US2 (P2) depends on T006 (Foundational) but nothing from US1 except the pages T011's footer links to already existing (T008–T010) — sequenced after US1 in this plan since editing a page that doesn't publicly exist yet has nothing to verify against
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each Phase

- Tests (where included) before the implementation they cover
- T008, T009, T010 (the three public pages) can run in parallel — different files, same dependency (T006)
- T013 (Server Actions) before T014 (editor UI) before T015 (page) before T016 (nav link)

### Parallel Opportunities

- T001, T002 (Setup) — different files
- T008, T009, T010 (US1's three public pages) — different files, same dependency
- T007 (US1 test) and T012 (US2 test) — different files, can be written in parallel once their respective dependencies land
- T018, T019 (Polish) — different concerns, no file conflict

---

## Parallel Example: User Story 1's public pages

```bash
# All three proceed together once T006 (Foundational) is done:
Task: "Implement src/app/(storefront)/privacy/page.tsx"
Task: "Implement src/app/(storefront)/terms/page.tsx"
Task: "Implement src/app/(storefront)/about/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — three real, reachable pages with seeded/placeholder content, linked from the footer
3. **STOP and VALIDATE**: run T007, confirm US1's Independent Test manually
4. US2 (the rich text editor) builds on this next

### Incremental Delivery

1. Setup + Foundational → `site_pages` table and shared read/sanitize logic ready
2. US1 → validate independently (real pages, real footer links, no admin edit needed yet)
3. US2 → validate independently (an admin can actually change the content, safely, live)
4. Polish → full quickstart pass, accessibility spot-check, full check suite, docs update

---

## Notes

- This feature depends on feature 1 being **implemented** — it reuses feature 1's Auth.js gate and admin rate limiter directly, the same way features 3 and 5 already do
- One new database table (`site_pages`), no pre-seeded rows — see `research.md`'s fallback-default decision
- T002's ADR is a documentation commitment from `plan.md`'s Constitution Check, not optional polish
- `src/lib/admin/site-pages.ts` (T006) is deliberately not a Server Action — mirrors `shop-settings.ts` (feature 5), both because the public pages need to read it without an admin session, and because it keeps sanitization/fallback logic directly unit-testable
