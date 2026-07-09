# ADR-0017: Tiptap for rich text editing, sanitize-html for server-side sanitization

- **Status:** Accepted
- **Date:** 2026-07-09
- **Deciders:** Jon Upchurch

## Context

Feature 6 (site content pages) needs the admin to edit three public
pages' title/body through a rich text editor (headings, paragraphs,
bold/italic, lists, links) with no code change required. Two real
choices: which editor library renders that experience, and how the
resulting HTML gets from an admin's browser to a safely-renderable
value on the public site.

## Decision

**Tiptap** (`@tiptap/react` + `@tiptap/starter-kit`), restricted to
exactly the formatting this feature needs — no image/table/embed
extensions installed. Its `editor.getHTML()` output is sanitized
server-side with **`sanitize-html`**, on every save, before the value
ever reaches the database. The stored value is treated as
already-safe from then on — never re-sanitized at render time.

## Alternatives considered

- **Lexical** (Meta's editor framework) — more modern in some
  respects, but more setup for equivalent output and less mature
  React-App-Router-specific documentation; unjustified weight for
  three static content pages.
- **Quill / `react-quill`** — simpler on paper, but `react-quill`'s
  React 18/19 compatibility has been a recurring community pain point,
  and its extensibility model is less clean than Tiptap's for
  constraining the toolbar to exactly this feature's formatting scope.
- **`isomorphic-dompurify`** (over `sanitize-html`) — DOMPurify is the
  more famous sanitizer, but running it server-side requires wrapping
  it in a `jsdom` environment. This project's admin/checkout code runs
  entirely on the Node.js runtime (Fluid Compute); `sanitize-html` is a
  pure-Node library with no DOM emulation dependency, and its allowlist
  model (permitted tags/attributes) maps directly onto the small,
  known set of markup Tiptap's starter kit ever produces.

## Consequences

`src/lib/admin/site-pages.ts` wraps `sanitize-html` behind
`sanitizeBodyHtml()`, called from `saveSitePage` (the only place
admin-submitted HTML is ever written) — never trusted raw, matching
Principle II's "untrusted input is never trusted raw" discipline
already applied to every other admin mutation in this project. The
public pages render the stored value directly via
`dangerouslySetInnerHTML`, which is safe specifically because nothing
unsanitized is ever stored. If a future feature needs richer content
(images, embeds, tables), extending the allowlist and Tiptap's
extension set is a contained change to this one module — it does not
require revisiting the editor or sanitizer choice itself.
