# Quickstart: Site Content Pages

Validation guide for this feature once implemented. See
`contracts/actions.md` for the action interfaces, `data-model.md` for
the schema/fallback shape, and `spec.md` for the requirements each
scenario traces to.

## Prerequisites

- `npm install` (pulls in `@tiptap/react`, `@tiptap/starter-kit`,
  `sanitize-html`)
- `.env.local` filled in per `.env.example` (unchanged by this
  feature — no new provider, no new env var)
- Signed in as one of feature 1's two allow-listed Google accounts

## Automated checks

```sh
npm run typecheck
npm run lint
npm run test        # Vitest: sanitization, fallback-default logic
npm run test:e2e    # Playwright: site-content-pages.spec.ts
```

All four MUST pass (Constitution Principle V).

## Manual validation scenarios

1. **Footer links (US1, FR-001)**: on any storefront page, confirm the
   footer shows "Privacy Policy," "Terms of Use," and "About Us" links.
2. **Unedited page shows real content (US1, FR-002, FR-006)**: before
   any admin edit, visit `/privacy` and `/terms` — confirm each shows
   real (placeholder-labeled) content, not a blank page. Visit `/about`
   — confirm it shows a clear placeholder message, not a blank page.
3. **Edit and see it live (US2, FR-003, FR-004)**: sign in as admin,
   open `/admin/content`, switch to each of the three tabs, change the
   title and use the toolbar to add a heading, bold/italic text, a
   list, and a link, save. Revisit the public page (no reload of the
   admin tab needed) — confirm the new content shows immediately.
4. **Sanitization (FR-005)**: attempt to paste or type a script-like
   value (e.g. `<img src=x onerror=alert(1)>`) into the editor and
   save. Confirm the public page never executes it — inspect the
   rendered HTML and confirm the unsafe attribute/tag was stripped.
5. **Auth gate (US2, FR-007)**: while signed out, visit
   `/admin/content` directly — confirm it redirects to sign-in, the
   same as every other admin route.
6. **Fixed set (FR-008)**: confirm there is no way to create a fourth
   page anywhere in the admin UI — exactly three tabs, always.

## Privacy/security check

7. Confirm the sanitizer allowlist actually holds under a few known
   XSS payload shapes (`<script>`, an `onerror` handler, a
   `javascript:` URL in a link href) — each MUST be stripped or
   neutralized, never rendered as-authored.
