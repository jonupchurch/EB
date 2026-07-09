# Implementation Plan: Site Content Pages

**Branch**: `006-site-content-pages` | **Date**: 2026-07-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-site-content-pages/spec.md`

## Summary

Three fixed public pages (Privacy Policy, Terms of Use, About Us), linked from the existing storefront footer, whose title and rich-formatted body are admin-editable through a Tiptap rich text editor — no code change or deployment needed to update them (mirrors how promotions/shipping settings already work). One new table, `site_pages`, holds admin overrides; a page with no override yet falls back to a code-level default (the existing `Resources/shared/privacy.md`/`terms and condition.md` content for Privacy/Terms, a placeholder message for About) — the same fallback-default pattern feature 5 already established for the flat shipping rate. All admin-submitted HTML is sanitized server-side before storage, so it's safe to render directly on the public site.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22.18.0 LTS (per `.nvmrc`)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Drizzle ORM + `postgres` driver, Zod, Tailwind CSS v4, Auth.js (existing admin gate); new: `@tiptap/react` + `@tiptap/starter-kit` (rich text editor) and `sanitize-html` (server-side HTML sanitization)

**Storage**: PostgreSQL — same Neon/local database as features 1–5. One new table, `site_pages` (see `data-model.md`)

**Testing**: Vitest (HTML sanitization — a malicious/unsafe input is neutralized; the fallback-default logic for an unedited page) and Playwright (footer links reach real pages with real content; admin edits a page and the public page reflects it immediately; unauthenticated access to the editor redirects to sign-in)

**Target Platform**: Web, deployed to Vercel (Node.js runtime / Fluid Compute) — same target as features 1–5

**Project Type**: Web application — extends the existing single Next.js app; adds three routes to the `(storefront)` route group and one route to `src/app/admin/`

**Performance Goals**: Same storefront LCP target as feature 2 (<2.5s) for the three public pages. No new target for the admin editor — same low-traffic, two-known-admin-user tuning as every other admin surface

**Constraints**: All admin-submitted HTML MUST be sanitized server-side before it is ever stored or rendered (Principle II's "untrusted input is never trusted raw" — the same discipline already applied to every other trust boundary in this project, extended here to rich text rather than structured form fields). The three pages are a fixed, closed set (`privacy` | `terms` | `about`) — this feature provides no mechanism to add a fourth. Every mutation reuses feature 1's existing admin rate limiter and Auth.js gate — no new auth or rate-limiting mechanism.

**Scale/Scope**: Same single-business scale as features 1–5; exactly three content rows, ever

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS, with a task obligation | Two new architectural calls: Tiptap as the rich text editor, and `sanitize-html` for server-side sanitization. `docs/adr/0017-tiptap-and-sanitize-html-for-rich-content.md` MUST be authored during `/speckit-tasks`/implementation. |
| II. Full-Stack Substance & Trustworthy Commerce | PASS | Admin-submitted HTML is Zod-shape-validated then sanitized server-side before storage — the same "never trust raw input" discipline already applied to every other admin mutation, extended to rich text. No payment/order-state surface is touched by this feature. |
| III. Designed, Accessible Experience | PASS | The three public pages use this project's existing typography/color tokens, not the editor's default styling. Rendered rich content (headings, lists, links) must remain readable and keyboard-navigable — a11y spot-check covers this explicitly, since sanitized HTML rendering is a new pattern for this codebase. |
| IV. Product Judgment & Scope Discipline | PASS | Scope matches spec.md exactly: three fixed pages, immediate-effect edits, no draft/versioning/multi-language/additional page types — all explicitly out of scope. |
| V. Test Discipline | PASS | Vitest covers sanitization (a real XSS-shaped payload is neutralized) and the fallback-default logic. Playwright covers the public-facing footer→page flow and the full admin edit→immediately-live flow. |
| VI. Legible History | PASS | Conventional Commits, `CHANGELOG.md` entry on push, per the confirmed per-unit-of-work discipline. |

No unjustified violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-site-content-pages/
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
│   │   │   ├── layout.tsx                # MODIFIED — footer gains Privacy/Terms/About links
│   │   │   ├── privacy/page.tsx          # NEW — public page (US1)
│   │   │   ├── terms/page.tsx            # NEW — public page (US1)
│   │   │   └── about/page.tsx            # NEW — public page (US1)
│   │   └── admin/
│   │       ├── layout.tsx                # MODIFIED — sidebar gains a "Content" link
│   │       └── content/
│   │           ├── page.tsx              # NEW — content editor shell (US2)
│   │           ├── content-editor.tsx    # NEW — Tiptap editor + tab switcher (client)
│   │           └── actions.ts            # NEW — getSitePage, saveSitePage
│   ├── db/
│   │   └── schema.ts                     # EXTENDED — adds site_pages
│   └── lib/
│       └── admin/
│           └── site-pages.ts             # NEW — fallback-default content, sanitize-on-save,
│                                          #       shared between the admin action and the
│                                          #       public pages (mirrors shop-settings.ts)
├── tests/
│   └── admin/
│       └── site-pages.test.ts            # NEW — Vitest: sanitization, fallback-default logic
└── e2e/
    └── site-content-pages.spec.ts        # NEW — Playwright: footer -> page, admin edit -> live,
                                          #       unauthenticated editor access redirects
```

**Structure Decision**: Single existing Next.js app, extended. Three new public routes under the existing `(storefront)` group; one new admin route reusing feature 1's Auth.js-gated `/admin` layout. `site_pages` is the only new table. The fallback-default + sanitize logic lives in a plain lib module (`src/lib/admin/site-pages.ts`), not the `"use server"` action file itself — mirrors `shop-settings.ts` (feature 5), both because the public pages need to read it without an admin session, and because it keeps the logic directly unit-testable (`requireAdminSession()` depends on `next/headers`, unavailable outside a real request — the same reason `order-status.ts`/`promotion-crud.ts` were split out).

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations. The
ADR obligation above is a documentation commitment stemming from a real
decision, not a complexity violation requiring justification.*
