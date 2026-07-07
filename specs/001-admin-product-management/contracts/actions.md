# Contracts: Admin Product Management

Phase 1 output for `specs/001-admin-product-management/plan.md`. This
feature's only interface is a set of Next.js Server Actions
(`src/app/admin/products/actions.ts`) plus the read queries the admin
pages call directly — there's no public API surface (Constitution
Principle IV: single owner role, no external integrations here).

Every action below runs server-side only, requires a valid Auth.js
session for one of the two authorized accounts (enforced by the
`/admin` layout — see `research.md`), and validates its input against a
Zod schema before touching the database (Principle II). An action
called without a valid session returns a generic "not authorized"
error and performs no read or write.

## `getProducts()`

- **Purpose**: power the Products list (US2).
- **Input**: none.
- **Output**: array of `{ id, name, categoryName, variantCount, basePriceCents, status }`, ordered newest-first.
- **Errors**: none beyond the auth gate — an empty catalog returns an empty array, not an error.

## `getCategories()`

- **Purpose**: populate the category selector in the Product Editor, and let the owner add a new category inline (spec.md Edge Cases).
- **Input**: none.
- **Output**: array of `{ id, name }`.
- **Errors**: none beyond the auth gate.

## `getProduct(id)`

- **Purpose**: load one product with its full option configuration, for the editor (US1 edit path, US3).
- **Input**: `{ id }`.
- **Output**: `{ id, name, description, basePriceCents, categoryId, status, processingOptions[], stylingOptions[], materialOptions[], sizeOptions[], colorOptions[], designLocationOptions[], images: { id, url, sortOrder }[] }` (each option array shaped per `data-model.md`; `images` ordered by `sortOrder`).
- **Errors**: `not_found` if `id` doesn't correspond to an existing product.

## `addProductImage(productId, file)`

- **Purpose**: attach an image to a product (FR-014).
- **Input**: `{ productId }` plus the uploaded file (`FormData`).
- **Output**: `{ id, url }` of the newly attached image, appended after the product's current last `sortOrder`.
- **Errors**: `not_found` if `productId` doesn't exist; `validation_error` if the upload isn't a supported image type.

## `removeProductImage(id)`

- **Purpose**: detach an image from a product (FR-014 Edge Cases).
- **Input**: `{ id }` of the Product Image row.
- **Output**: `{ ok: true }` on success.
- **Errors**: `not_found` if `id` doesn't exist. Only removes that product's row (and the underlying Blob object if no other row references it) — never affects another product's copy of the same image (FR-015).

## `reorderProductImages(productId, orderedImageIds)`

- **Purpose**: let the owner rearrange a product's image display order (FR-014).
- **Input**: `{ productId, orderedImageIds }` — the full ordered list of that product's image IDs.
- **Output**: `{ ok: true }` on success.
- **Errors**: `not_found` if `productId` doesn't exist or `orderedImageIds` doesn't exactly match that product's current image set.

## `createProduct(input)`

- **Purpose**: create a new product (US1).
- **Input**: Zod-validated — `name` (required), `basePriceCents` (required, ≥ 0), `description` (optional), `categoryId` (optional, must reference an existing category if present), `status` (`active` \| `draft`, default `draft`), `weightOz`/`lengthIn`/`widthIn`/`heightIn` (all optional, FR-017), and arrays of option rows for each of the six option categories (each may be empty).
- **Output**: `{ id }` of the newly created product on success.
- **Errors**: `validation_error` with field-level detail (FR-011/FR-012) if `name` or `basePriceCents` is missing/invalid, or if `categoryId` doesn't resolve. Nothing is partially saved on failure — the product and all its option rows are created in one transaction, or none are.

## `updateProduct(id, input)`

- **Purpose**: edit an existing product's details, pricing, or status (US3).
- **Input**: same shape as `createProduct`, plus `id`. Option arrays are treated as the full replacement set for that product (the editor submits the complete current configuration, not a diff).
- **Output**: `{ id }` on success.
- **Errors**: `not_found` if `id` doesn't exist; `validation_error` (same rules as create) otherwise. Update is transactional — partial writes never persist.

## `duplicateProduct(id)`

- **Purpose**: create a new Draft product pre-filled with an existing product's full configuration, including its images (US4, FR-015).
- **Input**: `{ id }` of the product to copy.
- **Output**: `{ id }` of the newly created duplicate.
- **Errors**: `not_found` if the source `id` doesn't exist. The duplicate is always created as `draft` regardless of the source's status (spec.md Acceptance Scenario), with an auto-generated name (e.g., "Copy of {original name}") that the owner can rename before saving further changes — duplication itself never blocks on an unedited name (spec.md Edge Cases). Image rows are copied (same `url`, same order) as independent rows — editing/removing an image on either product never affects the other.

## Shared error shape

All actions that can fail return a discriminated result rather than
throwing across the Server Action boundary, so the UI can render a
specific message every time (never a silent failure, per Principle II
and FR-012):

```text
{ ok: true, data: ... } | { ok: false, error: "not_authorized" | "not_found" | "validation_error", fieldErrors?: Record<string, string> }
```
