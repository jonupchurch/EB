# Quickstart: Catalog & Browsing

Validation guide for this feature once implemented. See
`contracts/queries.md` for the query interfaces and `spec.md` for the
requirements each scenario traces to.

## Prerequisites

- `npm install`
- `.env.local` filled in per `.env.example` (same `DATABASE_URL` as
  feature 1 — no new environment variables for this feature)
- At least a few real products already created via feature 1's admin
  area, spanning more than one category, with at least one product:
  saved as Draft (to verify it's hidden), with zero images (to verify
  the placeholder), and with a `requiresCustomerUpload` processing
  option (to verify it's excluded)

## Automated checks

```sh
npm run typecheck
npm run lint
npm run test        # Vitest: processing-option customer-selectability filter
npm run test:e2e    # Playwright: browse → product detail → configure → price
```

All four MUST pass (Constitution Principle V).

## Manual validation scenarios

Run `npm run dev`, visit the site with no sign-in:

1. **Browse by category (US1, FR-003, FR-004)**: load the homepage.
   Confirm every Active product appears grouped under its real
   category, each showing its primary image, name, and starting price.
2. **Draft products never appear (FR-002, SC-002)**: confirm a product
   known to be saved as Draft does not appear anywhere in the browse
   view, in any category.
3. **Category filter (Edge Cases)**: select a specific category and
   confirm only that category's products are shown.
4. **Missing image placeholder (Edge Cases)**: confirm a product with
   zero images shows a placeholder graphic, never a broken image.
5. **Product detail (US2, FR-005)**: open a product's detail page.
   Confirm its full description, all images in the owner-set order,
   and every configured option category are shown.
6. **Live pricing (US2, FR-007, SC-003)**: select several priced
   options on a product's detail page. Manually sum the base price and
   each adjustment, and confirm it exactly matches the displayed
   total, with no drift — cross-check against the same product's admin
   editor total (feature 1) to confirm they agree.
7. **Deferred processing options excluded (FR-006)**: open a product
   configured with a `requiresCustomerUpload` processing option (e.g.,
   "Bring your own design"). Confirm that option is not offered as
   selectable, while the product's other option categories still are.
8. **Draft product direct URL (FR-002, FR-009, SC-002)**: navigate
   directly to a known Draft product's detail URL. Confirm it behaves
   exactly as "not found" — no name, price, images, or options are
   ever shown.
9. **Nonexistent product URL (FR-009)**: navigate to a product detail
   URL with an `id` that doesn't exist at all. Confirm it behaves
   identically to the Draft case (not found), not a different error.
10. **Full launch catalog (SC-004)**: once the real ~22-item launch
    catalog is seeded via feature 1, spot-check a product from each of
    the 5 categories on both the browse view and its own detail view —
    confirm none require a workaround to display or price correctly.
11. **No unbranded pages (SC-005)**: click through every reachable page
    in this feature (homepage, each category, a few product details)
    and confirm none show the old placeholder layout/content.

## Privacy/security check

12. Confirm no combination of URL, query string, or category filter
    can surface a Draft product's data — the query layer itself
    enforces `status = 'active'` unconditionally, not the page/UI.
