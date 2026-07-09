# Research: Site Content Pages

Phase 0 output for `specs/006-site-content-pages/plan.md`. No
`[NEEDS CLARIFICATION]` markers remained in the Technical Context.

## Rich text editor: Tiptap

- **Decision**: `@tiptap/react` + `@tiptap/starter-kit`, restricted to
  the formatting FR-003 actually asks for (headings, paragraphs,
  bold/italic, bulleted/numbered lists, links) — no image/table/embed
  extensions installed.
- **Rationale**: Tiptap is ProseMirror-based, has first-class React
  bindings, and is the most commonly recommended, actively maintained
  option for exactly this scale of need (a handful of admin-edited
  content pages, not a collaborative or embed-heavy document editor).
  Its `editor.getHTML()` output maps directly onto this feature's
  storage shape (a sanitized HTML string), with no intermediate format
  to design or convert.
- **Alternatives considered**: **Lexical** (Meta's editor framework) —
  more modern in some respects, but more setup for equivalent output
  and less mature React-App-Router-specific documentation; the extra
  weight isn't justified for three static content pages. **Quill /
  react-quill** — simpler on paper, but `react-quill`'s React 18/19
  compatibility has been a recurring community pain point, and its
  extensibility model is less clean than Tiptap's for constraining the
  toolbar to exactly the formatting this feature needs.

## Sanitization: `sanitize-html`

- **Decision**: `sanitize-html`, run server-side on every save, before
  the HTML ever reaches the database — never trusted raw (Principle
  II), and never re-sanitized at render time (the stored value is
  already known-safe once this runs).
- **Rationale**: this project's admin/checkout code all runs on the
  Node.js runtime (Fluid Compute), not the browser or an edge runtime.
  `sanitize-html` is a pure-Node library with no DOM emulation
  dependency, which fits that runtime directly. It has an allowlist
  model (permitted tags/attributes) that maps cleanly onto exactly the
  Tiptap-produced markup this feature ever needs to accept (`h1`–`h3`,
  `p`, `strong`/`em`, `ul`/`ol`/`li`, `a[href]`) — anything else,
  intentional or not, is stripped rather than trusted.
- **Alternatives considered**: **`isomorphic-dompurify`** — DOMPurify
  is the more famous sanitizer, but running it server-side requires
  wrapping it in a `jsdom` environment, a heavier dependency for a
  Node-only use case with no client-side sanitization need (the public
  pages never re-sanitize in the browser — the server already
  guaranteed safety before storage).

## Storage: `site_pages` table with a code-level fallback default, not pre-seeded rows

- **Decision**: `site_pages` holds only rows the admin has actually
  saved. A page with no row yet (every page, right after this feature
  ships) reads a hardcoded default from `src/lib/admin/site-pages.ts`
  instead — the Privacy/Terms defaults are the existing content from
  `Resources/shared/privacy.md`/`terms and condition.md` (converted to
  the same sanitized-HTML shape), and the About default is a short
  placeholder message.
- **Rationale**: this is the exact pattern feature 5 already
  established for the flat shipping rate (`shop_settings` +
  `FLAT_RATE_DEFAULT_CENTS` in `shipping.ts`) — reuse it rather than
  invent a second convention for the same shape of problem ("no
  admin-set value yet, but the system still needs a safe answer").
  It also avoids needing a one-time data-seeding migration step;
  the schema migration is pure DDL, matching every prior feature's
  migrations in this project.
- **Alternatives considered**: seeding the three rows directly via SQL
  in the migration file — rejected; it would be the first migration in
  this project to carry real seed data rather than pure schema, adding
  a new convention for no real benefit over the already-proven
  fallback-default approach.

## Route structure: fixed public routes, one combined admin editor

- **Decision**: three fixed public routes (`/privacy`, `/terms`,
  `/about`), each a plain Server Component reading one page's content.
  One admin route, `/admin/content`, with a client-side tab switcher
  between the three pages — not three separate admin routes, and not a
  dynamic `/admin/content/[slug]` route.
- **Rationale**: with exactly three known pages that will never grow
  (FR-008), a single admin screen mirrors how `/admin/settings`
  already represents this project's one other small, fixed piece of
  shop-wide configuration — one sidebar entry, one mental model — over
  either three separate admin routes (unnecessary nav sprawl for three
  items) or a dynamic-slug route (implies an open-ended set of pages
  this feature explicitly doesn't support).
- **Alternatives considered**: `/admin/content/[slug]` dynamic
  routing — rejected as implying a more general CMS than FR-008
  intends; would also need its own not-found handling for an invalid
  slug, complexity this fixed three-page shape doesn't need.

## Reused infrastructure (not re-decided)

- **Database, ORM**: unchanged from ADR-0001/0002/0008.
- **Admin auth gate & rate limiter**: unchanged from feature 1
  (`src/auth.ts`'s allow-list, `src/lib/admin/rate-limit.ts`).
- **Accessibility bar**: unchanged from Principle III as amended —
  extended here specifically to rendered rich-text output (heading
  hierarchy, link text, list semantics), a new rendering pattern for
  this codebase.

## Architecture Decision Records

- `docs/adr/0017-tiptap-and-sanitize-html-for-rich-content.md` (new,
  per "Rich text editor" and "Sanitization" above) — the only new ADR
  this feature owes. The storage and route-structure decisions above
  are direct applications of feature 5's already-ADR'd patterns, not
  new architectural commitments needing their own record.
