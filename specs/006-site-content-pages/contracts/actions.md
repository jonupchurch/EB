# Contracts: Site Content Pages

Phase 1 output for `specs/006-site-content-pages/plan.md`. The admin
actions below are Server Actions, reachable only through feature 1's
existing Auth.js-gated `/admin` layout, and every mutation passes
through feature 1's existing admin rate limiter
(`src/lib/admin/rate-limit.ts`). The public read is not a Server
Action — the three storefront pages call the shared lib function
(`getSitePageContent`) directly, no auth gate, since they're public.

## Shared error shape (admin actions only)

```text
{ ok: true, data: ... } | { ok: false, error: "not_authorized" | "validation_error" }
```

## `getSitePageContent(slug)` (shared lib, `src/lib/admin/site-pages.ts` — not a Server Action)

- **Purpose**: powers both the three public pages (US1) and the admin
  editor's initial load (US2) — one function, two callers, so they can
  never disagree about what "current content" means.
- **Input**: `{ slug: "privacy" | "terms" | "about" }`.
- **Output**: `{ title, bodyHtml, isDefault }` — `isDefault: true` when
  no admin override exists yet and the code-level fallback is being
  returned (data-model.md's Fallback defaults); the admin editor uses
  this to show "not yet customized" context, the public pages ignore
  it and just render `title`/`bodyHtml`.
- **Errors**: none — every one of the three known slugs always
  resolves to *something* (an override or a default); an unknown slug
  is a compile-time impossibility (the enum), not a runtime case.

## `getSitePageForEditor(slug)` (admin Server Action, `src/app/admin/content/actions.ts`)

- **Purpose**: power the content editor's load (US2) — thin
  auth-gated wrapper over `getSitePageContent`.
- **Input**: `{ slug }`.
- **Errors**: `not_authorized`.

## `saveSitePage(slug, input)` (admin Server Action)

- **Purpose**: FR-003, FR-004 — save a page's title/body; takes effect
  on the public page immediately.
- **Input**: `{ slug: "privacy" | "terms" | "about", title: string, bodyHtml: string }`
  — `bodyHtml` is the Tiptap editor's raw `getHTML()` output; sanitized
  server-side inside this action before storage (FR-005), never
  trusted as already-safe just because it came from the editor.
- **Errors**: `not_authorized`, `validation_error` (empty title).
