# ADR-0007: Relational tables per option category for product options

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Jon Upchurch

## Context

Feature 1 (admin product management) needs to represent a product's
configurable options — processing, styling, material, size, color, and
design-location — each additively priced and each shown as its own
distinct section with its own "add row" affordance in the reviewed
Product Editor wireframe (`Resources/wireframes/Admin Screens.html`).
The schema needs to hold six option kinds per product, several with a
kind-specific field (e.g. a material's optional `modelNumber`, a
color's optional `swatchHex`) that has no equivalent in the others.

## Decision

**Six separate, typed tables** — `processing_options`, `styling_options`,
`material_options`, `size_options`, `color_options`, and
`design_location_options` — each foreign-keyed to `products` (cascade
delete) and each carrying its own `price_adjustment_cents`, rather than
one generic option table or a JSON blob on the product row.

## Alternatives considered

- **A generic key-value `product_options` table** with a `type`
  discriminator and shared nullable columns — rejected; would
  accumulate option-kind-specific nullable columns (e.g. `model_number`
  meaningless for a color row) and weakens type-level validation, since
  every option kind's Zod schema would have to tolerate fields it
  doesn't actually use.
- **A single JSONB `options` column on the product row** — rejected;
  simplest migration path, but loses relational integrity and
  query-ability (a later feature asking "what sizes does this product
  offer, and at what upcharge?" would need JSON-path querying instead
  of a plain join), and pushes all shape validation to the application
  layer with no DB-level structure to lean on — the opposite of
  ADR-0002's own rationale for choosing Drizzle.

## Consequences

Six option tables to migrate and query instead of one, and
`getProduct`/`createProduct`/`updateProduct` each touch all six
explicitly rather than one generic table. In exchange, each option
kind's Zod schema is genuinely specific to that kind, Drizzle queries
stay plain relational joins, and adding a kind-specific field to one
option type later (e.g. a new material attribute) never touches the
other five tables. `duplicateProduct` (feature 1, US4) copies rows from
all six tables independently when copying a product.
