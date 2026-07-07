# Contracts: Catalog & Browsing

Phase 1 output for `specs/002-catalog-browsing/plan.md`. This feature
has no mutations and no external API surface — its only interface is a
small set of read-only query functions (`src/lib/catalog/queries.ts`)
called directly from Server Components during render. There is
nothing for an external caller to invoke; these are internal
contracts, documented for the same reason feature 1's Server Actions
are (Constitution Principle I: legible architecture).

Every query below is unauthenticated (public) and enforces its
filtering server-side — never relying on the UI to hide what a query
already returned (research.md's Draft-hiding and processing-option
decisions).

## `getActiveCategories()`

- **Purpose**: power the category groupings/filter on the Browse view (US1).
- **Input**: none.
- **Output**: array of `{ id, name }`, limited to categories with at least one Active product.
- **Errors**: none — an empty catalog returns an empty array.

## `getActiveProductsByCategory(categoryId?)`

- **Purpose**: power the Browse view's product grid (US1).
- **Input**: `{ categoryId }`, optional — omit for all Active products across every category.
- **Output**: array of `{ id, name, basePriceCents, primaryImageUrl }` (`primaryImageUrl` is `null` if the product has no images, handled as a placeholder client-side), Active products only.
- **Errors**: none — no matching products returns an empty array, not an error.

## `getActiveProduct(id)`

- **Purpose**: power the Product Detail view (US2).
- **Input**: `{ id }`.
- **Output**: `{ id, name, description, basePriceCents, images: { url }[], stylingOptions[], materialOptions[], sizeOptions[], colorOptions[], designLocationOptions[], processingOptions[] }` — every option array shaped per feature 1's `data-model.md`, with `processingOptions` pre-filtered to `requiresCustomerUpload = false` only. `images` ordered by `sortOrder`.
- **Errors**: `not_found` if `id` doesn't exist **or** corresponds to a Draft product — the two cases are indistinguishable in the response (FR-002, FR-009): no code path may reveal that a Draft product with that `id` exists.

## Shared error shape

```text
{ ok: true, data: ... } | { ok: false, error: "not_found" }
```

`not_authorized` doesn't apply here (no auth gate on this feature) and
`validation_error` doesn't apply (no user-submitted data is ever
persisted) — the error union is intentionally smaller than feature 1's.
