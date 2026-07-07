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
| `categoryId` | identifier, nullable | FK → Category. Nullable: FR-011 only requires name + base price to save, so a product can exist briefly uncategorized (matches the edge case of saving an incomplete Draft) |
| `name` | text | **Required** (FR-011) |
| `description` | text, nullable | Optional at save time |
| `basePriceCents` | integer | **Required** (FR-011), ≥ 0 |
| `status` | enum: `active` \| `draft` | Default `draft` (FR-006). Draft rows MUST never be readable by any future customer-facing query (FR-007) |
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

## Styling Option

A style/cut variant (FR-004) — e.g., garment cut for apparel.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `label` | text | Required, e.g. "Long Sleeve", "Children" |
| `priceAdjustmentCents` | integer | Default 0; may be negative (the Admin Screens wireframe shows "Children −$4.00," "Toddler/Infant −$6.00" — a real discount, not just an upcharge) |
| `sortOrder` | integer, nullable | |

## Material Option

A material choice (FR-004) — e.g., a wood species or fabric blend.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `productId` | identifier | FK → Product, cascade delete |
| `modelNumber` | text, nullable | e.g. "BC-3413" — optional per the wireframe (not every material needs one) |
| `description` | text | Required, e.g. "Triblend, ultra-soft" |
| `priceAdjustmentCents` | integer | Default 0; may be negative |
| `sortOrder` | integer, nullable | |

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
- All pricing math happens through one shared function (`src/lib/admin/pricing.ts`,
  per `plan.md`), used identically by the client-side live preview and
  the server-side save validation, so the two can never disagree.

## Validation rules (Zod, enforced server-side per Principle II)

- `Product.name`: required, non-empty, reasonable max length (e.g. 200 chars).
- `Product.basePriceCents`: required, integer, ≥ 0.
- `Product.categoryId`: optional; if present, must reference an existing Category.
- Every option row's `label`: required, non-empty.
- Every option row's `priceAdjustmentCents`: required (defaults to 0 if omitted), integer, any sign.
- A save request with a missing required field is rejected with a
  specific, field-level error (FR-011/FR-012) — never silently dropped
  or partially saved.

## State transitions

- `Product.status`: `draft` ⇄ `active`, freely reversible by the owner
  (FR-006). No other states exist in this feature (no archived/deleted
  state — see spec.md Assumptions on no hard delete).
