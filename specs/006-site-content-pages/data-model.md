# Data Model: Site Content Pages

Phase 1 output for `specs/006-site-content-pages/plan.md`. One new
table, `site_pages` — holds only admin-saved overrides, never a
pre-seeded row (see `research.md`'s storage decision).

## SitePage (new)

| Field | Type | Notes |
|---|---|---|
| `slug` | enum: `privacy` \| `terms` \| `about`, primary key | The fixed, closed set of three pages (FR-008) — not a free-text slug |
| `title` | text, not null | Admin-editable page title |
| `bodyHtml` | text, not null | Sanitized HTML (`sanitize-html`'s output) — never raw admin input; safe to render directly via `dangerouslySetInnerHTML` once read back |
| `updatedAt` | timestamp, not null, defaults to now, updated on every write | Last-saved time — display-only, not a version history (FR-009's Assumptions: no versioning) |

## Fallback defaults (code, not a table — `src/lib/admin/site-pages.ts`)

Read only when no `site_pages` row exists yet for a given slug:

| Slug | Default title | Default body source |
|---|---|---|
| `privacy` | "Privacy & Website Policy" | Converted from `Resources/shared/privacy.md` (FR-006) — still the known placeholder content drafted for a different business; this feature makes it editable, it does not rewrite it |
| `terms` | "Terms and Conditions" | Converted from `Resources/shared/terms and condition.md` (FR-006) — same placeholder-content caveat |
| `about` | "About Us" | A short placeholder message (FR-006) — no existing About-us draft exists anywhere in `Resources/` |

## Validation rules (Zod + `sanitize-html`, enforced server-side per Principle II)

- `saveSitePage(slug, input)`: `slug` MUST be one of the three known
  values (FR-008) — enforced by the Zod enum matching the DB enum, not
  a free-text field. `title` MUST be non-empty. `bodyHtml` is
  sanitized via `sanitize-html`'s allowlist (`h1`–`h3`, `p`,
  `strong`/`em`/`b`/`i`, `ul`/`ol`/`li`, `a[href]` only — `href` values
  restricted to `http(s)`/relative, `rel="noopener noreferrer"` and
  `target="_blank"` forced onto every external link) before it's ever
  written (FR-005) — an empty sanitized result is allowed (Edge Cases:
  an empty body just renders as an empty page area).

## State transitions

- `SitePage` rows are `null` (fallback default applies) until the
  first save for that slug, then hold whatever was last saved —
  updates are direct overwrites, no ordering constraint, no draft
  state (spec.md's Assumptions: edits take effect immediately).
