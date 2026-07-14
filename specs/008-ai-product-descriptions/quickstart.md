# Quickstart: AI Product Description Writer/Editor

Validation guide for this feature once implemented. See
`contracts/actions.md` for the action interface, `data-model.md` for the
request/response shapes, and `spec.md` for the requirements each
scenario traces to.

## Prerequisites

- `npm install` (adds the `ai` package)
- `.env.local` filled in per `.env.example` — **no new required
  variable**: the Vercel AI Gateway authenticates via OIDC. Run
  `vercel env pull --yes` if `VERCEL_OIDC_TOKEN` is missing or has
  expired (it's short-lived, ~24h, for local dev)
- AI Gateway enabled for the linked Vercel project (one-time dashboard
  step at `https://vercel.com/{team}/{project}/settings` → **AI
  Gateway**, per `research.md`/ADR-0018) — only needed for a real
  (non-fake) manual check; automated tests never need this
- Signed in as one of feature 1's two allow-listed Google accounts

## Automated checks

```sh
npm run typecheck
npm run lint
npm run test        # Vitest: description-writer's fake path, name-required guard
npm run test:e2e    # Playwright: admin-products (extended)
```

All four MUST pass (Constitution Principle V) and MUST NOT make any real
model call — `CHECKOUT_FAKE_PROVIDERS=true` is already forced in both
`vitest.setup.ts` and `playwright.config.ts`.

## Manual validation scenarios

1. **Generate a first draft (US1, FR-001, FR-003)**: open a product with a name/category/price set but no description. Click "Generate." Confirm a draft appears reflecting that product's actual data, and that the product's saved description is unaffected until Save is clicked.
2. **Edited draft is what's saved (US1, FR-004)**: after generating, edit the draft text, then click the normal Save action. Reload the product and confirm the edited text (not the raw AI output) was saved.
3. **Discard without saving (US1, FR-005)**: after generating, navigate away without saving. Reopen the product and confirm its description is exactly what it was before (blank).
4. **Improve an existing description (US2, FR-002)**: open a product that already has a real description. Click "Improve." Confirm a rewritten alternative appears, and the original saved description is unaffected until Save is clicked.
5. **Discard an improvement (US2, FR-005)**: after improving, choose not to save. Confirm the original description is completely unchanged.
6. **Try again (US3, FR-006)**: after generating or improving, request another attempt. Confirm the newest suggestion replaces the prior one for review, with nothing saved until an explicit Save.
7. **Blank name declined (FR-011, edge case)**: on a brand-new, not-yet-saved product with no name entered, attempt to click "Generate." Confirm it's declined with a clear message, and no request is sent.
8. **Provider failure leaves data untouched (FR-009, edge case)**: temporarily force a provider error (e.g. an invalid model configuration in a local/dev-only test) and confirm the admin sees a clear error and the product's existing saved description is completely unaffected.
9. **Rate limit reached (FR-008, edge case)**: click Generate/Improve rapidly enough to exceed the existing admin mutation rate limit. Confirm the same rate-limit message every other admin action already shows.

## Privacy/security check

10. Confirm `suggestDescription` is unreachable without signing in as one of the two allow-listed Google accounts — the same gate as the rest of the Product Editor (FR-007).
11. Confirm no AI-generation capability, button, or endpoint is reachable from any customer-facing/storefront page (FR-010).
