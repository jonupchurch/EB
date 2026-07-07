# Data Model: Catalog & Browsing

Phase 1 output for `specs/002-catalog-browsing/plan.md`. This feature
introduces **no new persisted entities or tables** — it reads feature
1's data model (`specs/001-admin-product-management/data-model.md`),
always filtered as described below. Nothing here is written to; every
query in this feature is read-only.

## What this feature reads

- **Category**: unchanged from feature 1. Read via `getActiveCategories()`
  — only categories that have at least one Active product are relevant
  for browsing (spec.md Edge Cases: an emptied-out category shouldn't
  appear as confusingly browsable).
- **Product**: unchanged from feature 1, filtered to `status = 'active'`
  everywhere this feature touches it (FR-002, SC-002). `basePriceCents`
  is shown as the browse view's "starting price" (spec.md Assumptions
  — not a computed minimum across option combinations).
- **Processing / Styling / Material / Size / Color / Design Location
  Options**: unchanged from feature 1's six option tables, read in full
  for a product's detail view — **except** Processing Options, which
  are additionally filtered to exclude any row where
  `requiresCustomerUpload = true` (feature 1's FR-016, added
  specifically to support this feature). A product with every
  processing option excluded this way still displays and prices
  correctly using its base price and other option categories (spec.md
  Edge Cases).
- **Product Image**: unchanged from feature 1, read in `sortOrder`.
  The "primary image" shown in the browse view is simply the one with
  the lowest `sortOrder` — no separate "is primary" flag exists or is
  needed. A product with zero images renders a placeholder instead
  (spec.md Edge Cases).

## Query shape (conceptual — see `contracts/queries.md` for the actual interfaces)

- `getActiveCategories()` → categories with ≥1 Active product
- `getActiveProductsByCategory(categoryId?)` → Active products (all
  categories if omitted), each with its primary image, name, and base
  price
- `getActiveProduct(id)` → one Active product's full description, all
  images (ordered), and every option category (processing options
  pre-filtered to customer-selectable only) — or "not found" for any
  Draft or nonexistent `id` (FR-009), indistinguishable from each other
  in the response

## Pricing (reused, not redefined)

The running total shown while configuring a product on its detail page
is computed by the exact same function feature 1's admin editor uses
(`src/lib/pricing.ts`) — `basePriceCents` plus every currently-selected
option's `priceAdjustmentCents`. See feature 1's `data-model.md`
Pricing rules for the full definition; this feature does not redefine
or duplicate that logic (`research.md`'s "Reused pricing logic"
decision).
