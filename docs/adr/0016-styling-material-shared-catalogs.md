# ADR-0016: Styling and material as shared, admin-managed catalogs

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Jon Upchurch

## Context

Feature 1 originally modeled all six product option kinds (processing,
styling, material, size, color, design-location) identically: each
option row lived directly on the product, with its label typed freely
per product (ADR-0007). While using the built admin UI, Jon found that
styling and material values in practice repeat across many products
(the same "Long Sleeve," the same wood species) and wanted them picked
from a managed list rather than retyped — and to have a dedicated
screen to manage that list — while processing, size, color, and
design-location stay as they were (their real-world values vary more
per product, and weren't raised as a problem).

## Decision

**Styling and material become shared, admin-managed catalogs**
(`styling_catalog`, `material_catalog`), picked per product from a
dropdown rather than typed freely. Price stays a per-product decision:
`styling_options`/`material_options` remain per-product join rows,
now referencing a catalog entry (`styling_catalog_id` /
`material_catalog_id`) instead of storing a label directly, each still
carrying its own `price_adjustment_cents` — the same styling choice
can cost differently, or not apply at all, on different products,
exactly as size/color/design-location options already work.

Catalog entries carry no price themselves — only the descriptive
fields (`styling_catalog.label`; `material_catalog.model_number`
optional + `description`, unchanged from what `material_options`
already had). A dedicated admin page (`/admin/styling`,
`/admin/materials`) manages the catalog directly (create/rename/
delete); the Product Editor also supports creating a new catalog entry
inline while building a product, mirroring the existing inline
"add new category" pattern.

Processing, size, color, and design-location are unchanged —
still typed freely per product.

## Alternatives considered

- **Keep styling/material catalog entries priced**, letting the admin
  set a "default" price adjustment used when added to a new product —
  rejected as unnecessary complexity; a per-product price still has to
  be editable afterward regardless (the same styling costs differently
  on different products), so a stored default adds a second source of
  truth for no real benefit at this business's scale.
- **Extend this pattern to all six option kinds** — rejected; only
  styling and material were raised as having real-world values worth
  centralizing. Processing, size, color, and design-location stay
  free-text per product, per Constitution Principle IV's scope
  discipline (build what's asked, not what's hypothetically
  symmetrical).
- **A single generic "option catalog" table** (type-discriminated,
  covering both styling and material) — rejected for the same reason
  ADR-0007 rejected a generic option table: material's `model_number`
  has no styling equivalent, and a generic shape would either force an
  unused nullable column or push shape validation entirely into the
  application layer.

## Consequences

`styling_options.styling_catalog_id` and
`material_options.material_catalog_id` are `NOT NULL` with
`ON DELETE CASCADE` — deleting a catalog entry removes it from any
product currently using it (unlike deleting a category, which merely
un-categorizes a product via `ON DELETE SET NULL`, since a per-product
styling/material row is meaningless without its catalog entry, but a
product is still perfectly meaningful without a category). A
`(product_id, styling_catalog_id)` / `(product_id, material_catalog_id)`
unique constraint prevents a product from selecting the same catalog
entry twice. This is a genuine schema reshape (not an additive
change) — since no real launch-catalog data existed yet when this
was decided, `styling_options`/`material_options` were dropped and
recreated in the new shape rather than migrated, at zero cost.
