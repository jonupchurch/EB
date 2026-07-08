# Data Model: Admin Product Management

Phase 1 output for `specs/001-admin-product-management/plan.md`. Shape
follows `research.md`'s "Product/options schema shape" decision
(relational tables per option category) and "Money representation"
decision (integer cents throughout). Full rationale in
`docs/adr/0007-product-options-schema.md` once authored.

## Category

Represents one of the owner's evolving product categories (Apparel,
Drinkware, Wood & Signs, Totes & Bags, Home & Decor, plus any the
owner adds later — spec.md Assumptions).

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `name` | text | Required, unique (case-insensitive) |
| `createdAt` | timestamp | Set on insert |

## Product

The sellable item itself.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `categoryId` | identifier, nullable, `ON DELETE SET NULL` | FK → Category. Nullable: FR-011 only requires name + base price to save, so a product can exist briefly uncategorized (matches the edge case of saving an incomplete Draft); `ON DELETE SET NULL` so deleting a category (FR-018) un-categorizes its products rather than blocking or cascading |
| `name` | text | **Required** (FR-011) |
| `description` | text, nullable | Optional at save time |
| `basePriceCents` | integer | **Required** (FR-011), ≥ 0 |
| `status` | enum: `active` \| `draft` | Default `draft` (FR-006). Draft rows MUST never be readable by any future customer-facing query (FR-007) |
| `weightOz` | integer, nullable | Packaged shipping weight in whole ounces (FR-017). Nullable — not part of FR-011's save minimum |
| `lengthIn` / `widthIn` / `heightIn` | integer, nullable | Packaged shipping dimensions in whole inches, rounded up (FR-017). Nullable for the same reason |
| `createdAt` / `updatedAt` | timestamp | |

**Computed, not stored**: "variant count" (shown in the products list,
FR-008) is the total number of option rows configured across all six
option tables below for that product — a simple count, not a
combinatorial expansion (e.g., 3 sizes + 2 colors = "5 options
configured," not "6 combinations"). Chosen for simplicity; revisit only
if the owner actually needs combination counts later.

## Processing Option

How a product's design is produced/applied (FR-004). Includes the
still-unbuilt "bring your own design" / "custom design service"
options — priced here even though no customer-facing flow consumes
them yet (per `docs/future-work.md`'s clarification).

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `label` | text | Required, e.g. "Standard Printed", "Bring your own design" |
| `priceAdjustmentCents` | integer | Default 0; **may be negative or positive** (see Pricing rules below) |
| `sortOrder` | integer, nullable | Display ordering within the editor |
| `requiresCustomerUpload` | boolean | Default `false` (FR-016). `true` for options like "Bring your own design"/"Custom design service" that have no working customer order flow yet — lets a later customer-facing feature filter on this flag instead of guessing from `label` text |

## Styling Catalog Entry (`docs/adr/0016`, amended 2026-07-08)

A shared, admin-managed styling value (FR-019) — e.g., garment cut for
apparel. Carries no price; price stays a per-product decision (see
Styling Option below).

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `label` | text | Required, unique (case-insensitive), e.g. "Long Sleeve", "Children" |
| `sortOrder` | integer, nullable | |
| `createdAt` | timestamp | Set on insert |

## Styling Option

A product's selection of one Styling Catalog Entry (FR-019), with its
own price adjustment for that product.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `stylingCatalogId` | identifier, `ON DELETE CASCADE` | FK → Styling Catalog Entry. Cascade: deleting a catalog entry removes it from any product's configuration (unlike Category's `SET NULL`, since this row is meaningless without its catalog entry) |
| `priceAdjustmentCents` | integer | Default 0; may be negative (the Admin Screens wireframe shows "Children −$4.00," "Toddler/Infant −$6.00" — a real discount, not just an upcharge). The same catalog entry can price differently on different products |
| `sortOrder` | integer, nullable | |

Unique on `(productId, stylingCatalogId)` — a product can't select the
same catalog entry twice.

## Material Catalog Entry (`docs/adr/0016`, amended 2026-07-08)

A shared, admin-managed material value (FR-020) — e.g., a wood species
or fabric blend. Carries no price; price stays a per-product decision
(see Material Option below).

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `modelNumber` | text, nullable | e.g. "BC-3413" — optional per the wireframe (not every material needs one) |
| `description` | text | Required, e.g. "Triblend, ultra-soft" |
| `sortOrder` | integer, nullable | |
| `createdAt` | timestamp | Set on insert |

## Material Option

A product's selection of one Material Catalog Entry (FR-020), with its
own price adjustment for that product.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `materialCatalogId` | identifier, `ON DELETE CASCADE` | FK → Material Catalog Entry. Cascade, same rationale as Styling Option above |
| `priceAdjustmentCents` | integer | Default 0; may be negative. The same catalog entry can price differently on different products |
| `sortOrder` | integer, nullable | |

Unique on `(productId, materialCatalogId)` — a product can't select the
same catalog entry twice.

## Size Option

An available size (FR-004), each with an optional upcharge.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `label` | text | Required, e.g. "S", "2XL" |
| `priceAdjustmentCents` | integer | Default 0; may be negative |
| `sortOrder` | integer, nullable | |

## Color Option

An open-ended, owner-defined color (FR-004) — not drawn from a
system-wide fixed list.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `label` | text | Required, e.g. "Teal", "Natural" |
| `swatchHex` | text, nullable | Optional hex value for a visual swatch in the editor (matches the wireframe's color circles); not required |
| `priceAdjustmentCents` | integer | Default 0; may be negative |
| `sortOrder` | integer, nullable | |

## Design Location Option

A placement location for the design (FR-004) — one or many per
product.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `label` | text | Required, e.g. "Front Full", "Sleeve" |
| `priceAdjustmentCents` | integer | Default 0; may be negative |
| `sortOrder` | integer, nullable | |

## Product Image

A photo attached to a product (FR-014), stored in Vercel Blob. Zero or
more per product; not required to save (FR-011's minimum is name +
base price only).

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `url` | text | The Vercel Blob object URL |
| `sortOrder` | integer | Display order; owner-rearrangeable |
| `createdAt` | timestamp | Set on insert |

Duplicating a product (FR-015, US4) copies each Product Image row
(same `url`, same relative order) onto the new product — the
underlying Blob object is shared by reference, but each product's rows
are independent, so removing an image from one product never touches
the other's row or the source file.

## Pricing rules

- The **running total** for a given selection = `basePriceCents` +
  the `priceAdjustmentCents` of every currently-selected option across
  all six categories (SC-005: this must never drift from the exact
  sum).
- Price adjustments are signed integers — most are upcharges (positive)
  but discounted variants (e.g., children's sizing) are legitimate and
  must be representable as negative.
- All pricing math happens through one shared function (`src/lib/pricing.ts`,
  per `plan.md` — deliberately outside `admin/`, since feature 2 reuses
  it for the customer-facing price preview), used identically by the
  client-side live preview and the server-side save validation, so
  neither surface can ever disagree.

## Validation rules (Zod, enforced server-side per Principle II)

- `Product.name`: required, non-empty, reasonable max length (e.g. 200 chars).
- `Product.basePriceCents`: required, integer, ≥ 0.
- `Product.categoryId`: optional; if present, must reference an existing Category.
- Every Processing/Size/Color/Design Location option row's `label`: required, non-empty.
- Every Styling/Material Option row's `stylingCatalogId`/`materialCatalogId`: required, must reference an existing catalog entry.
- Every option row's `priceAdjustmentCents`: required (defaults to 0 if omitted), integer, any sign.
- A save request with a missing required field is rejected with a
  specific, field-level error (FR-011/FR-012) — never silently dropped
  or partially saved.

## State transitions

- `Product.status`: `draft` ⇄ `active`, freely reversible by the owner
  (FR-006). No archived/soft-deleted state exists — Draft already
  covers "not ready yet."
- **Amended 2026-07-08**: a Product can also be permanently hard-deleted
  (FR-024) — see spec.md Assumptions. This is a real removal, not a
  status value; the six option tables and Product Image cascade at the
  DB level, and the action additionally deletes each image's actual
  Blob file (skipping any URL still referenced by another product's
  row, e.g. a duplicate).

## List query notes (FR-021, FR-022, FR-023 — amended 2026-07-08)

- The products list query filters by `ILIKE` on `name` OR `description`
  when a search term is present (FR-021), paginates 20 rows per page
  (FR-022), and includes each product's first Product Image (ordered
  by `sortOrder`, limited to 1) for the list thumbnail (FR-023) — all
  additive to the existing `getProducts` read, no schema change beyond
  what's already listed above.
