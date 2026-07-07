# Quickstart: Admin Product Management

Validation guide for this feature once implemented. See
`contracts/actions.md` for the action interfaces and `spec.md` for the
requirements each scenario traces to.

## Prerequisites

- `npm install`
- `.env.local` filled in per `.env.example`: `DATABASE_URL` (local
  Postgres), `AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
  (a real Google OAuth client — see `docs/adr/0006-authjs-for-google-sso.md`)
- `npm run db:migrate` — applies this feature's migration (categories,
  products, and the six option tables)

## Automated checks

```sh
npm run typecheck
npm run lint
npm run test        # Vitest: pricing calculation, Zod schema validation
npm run test:e2e    # Playwright: sign-in + create + list flow
```

All four MUST pass (Constitution Principle V).

## Manual validation scenarios

Run `npm run dev`, sign in at `/admin` with an authorized Google account:

1. **Unauthorized access denied (FR-001, FR-002, SC-002)**: attempt to
   sign in with a Google account that isn't one of the two authorized
   addresses. Confirm access is denied with a clear message and no
   product data or admin UI is ever shown.
2. **Create a product (US1, FR-003–FR-005)**: create a new product with
   a name, category, description, and base price; add at least one
   priced option (e.g., a size with an upcharge). Confirm the running
   total updates immediately as the option is added, and equals base
   price + adjustment.
3. **Save validation (FR-011, FR-012, Edge Cases)**: attempt to save a
   product with no name, then with no base price. Confirm each attempt
   is rejected with a specific, field-level error — not a silent
   failure or a partial save.
4. **Draft vs. Active (FR-006, FR-007)**: save a product as Draft,
   confirm it's clearly distinguished from Active products in the list.
5. **Products list (US2, FR-008)**: with several products created,
   confirm the list shows each one's name, category, variant count,
   starting price, and status accurately.
6. **Edit an existing product (US3, FR-009)**: open a product from the
   list, change its base price and add a new option, save, and confirm
   the change persists (reload the page and re-check).
7. **Duplicate a product (US4, FR-010)**: duplicate an existing product.
   Confirm a new Draft product appears with the same configuration, and
   that editing the duplicate does not alter the original.
8. **Full launch catalog (SC-004)**: pick 3–4 representative products
   from `Resources/products/Launch Catalog.html` spanning different
   categories (e.g., an apparel item with styling + size options, a
   wood sign with material + design-location options) and confirm each
   can be fully and accurately entered using only this feature — no
   product requires a workaround.
9. **Pricing accuracy (SC-005)**: for a product with multiple priced
   options selected, manually sum the base price and each adjustment
   and confirm it exactly matches the displayed running total, with no
   rounding drift.

## Privacy/security check

10. Confirm no Draft product's data is reachable by any request that
    isn't an authenticated, authorized admin session (FR-007) — there's
    no customer-facing route yet to check this against directly, but
    the query layer itself must not expose Draft rows unconditionally.
