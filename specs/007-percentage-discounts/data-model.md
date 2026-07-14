# Data Model: Percentage-Off Discounts

Phase 1 output for `specs/007-percentage-discounts/plan.md`. Extends the
existing, already-live `promotions` table (feature 3/5) with three new
columns; no new table.

## Promotion (feature 3/5, extended)

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key — unchanged |
| `type` | enum: `flat` \| `bogo` \| `promo_code` \| `cart_threshold` \| `free_shipping` | Unchanged. Still means "what mechanic triggers this promotion" |
| `promoCode` | text, nullable, unique (case-insensitive) | Unchanged |
| `discountAmountCents` | integer, nullable | Unchanged meaning; now only consulted when `valueMode = "flat"` for `flat`/`promo_code` types |
| `thresholdCents` | integer, nullable | Unchanged — `cart_threshold`'s required minimum, `promo_code`'s optional minimum. Applies identically whether `promo_code`'s `valueMode` is `flat` or `percentage` |
| **`valueMode`** | **NEW — enum: `flat` \| `percentage`, not null, default `flat`** | Orthogonal to `type`. Meaningful only for `flat`/`promo_code` types; `bogo`/`cart_threshold`/`free_shipping` always behave as `flat` regardless of this column's value (their calculation doesn't consult it) |
| **`discountPercent`** | **NEW — integer, nullable, 1–100** | Required when `valueMode = "percentage"` on a `flat`/`promo_code` type; otherwise unused |
| **`maxDiscountCents`** | **NEW — integer, nullable** | Optional cap, meaningful only when `valueMode = "percentage"`; `null` means uncapped (FR-006) |
| `active` | boolean | Unchanged |
| `startsAt` / `endsAt` | timestamp, nullable | Unchanged |
| `createdAt` | timestamp | Unchanged |

### Why three columns instead of one

`valueMode` and `discountPercent` could theoretically be merged (e.g. a
nullable `discountPercent` alone implying percentage mode), but an
explicit `valueMode` keeps the "which fields are required" logic in
`typeSpecificFieldError` a direct, readable switch rather than an
implicit null-check convention — consistent with how `type` itself is
already an explicit discriminator rather than inferred from which
optional fields happen to be set.

## Validation rules (Zod, enforced server-side per Principle II)

- `createPromotion`/`updatePromotion`, when `type` is `flat` or
  `promo_code`:
  - `valueMode = "flat"` (default): `discountAmountCents` MUST be present
    and a non-negative integer (unchanged rule).
  - `valueMode = "percentage"`: `discountPercent` MUST be present and an
    integer from 1 to 100 inclusive (FR-003); `discountAmountCents` is
    ignored if present. `maxDiscountCents`, if present, MUST be a
    non-negative integer (FR-004).
- `createPromotion`/`updatePromotion`, when `type` is `bogo`,
  `cart_threshold`, or `free_shipping`: `valueMode` is not offered by the
  admin form and is stored as `flat` — unchanged behavior for these
  three types (FR-014: `cart_threshold` stays flat-amount-only).
- Duplicate promo-code enforcement: unchanged — case-insensitive
  uniqueness applies regardless of `valueMode`.

## Calculation rules (`calculateDiscount`, pure function)

For `type: "flat"` and `type: "promo_code"` (after any `promo_code`-specific
threshold/active-window checks, unchanged):

- `valueMode: "flat"`: unchanged — `Math.min(discountAmountCents, subtotalCents)`.
- `valueMode: "percentage"`:
  1. `raw = Math.round(subtotalCents * discountPercent / 100)`
  2. `capped = maxDiscountCents != null ? Math.min(raw, maxDiscountCents) : raw`
  3. `discountCents = Math.min(capped, subtotalCents)`

`bogo`, `cart_threshold`, and `free_shipping` branches are unchanged —
they never consult `valueMode`, `discountPercent`, or `maxDiscountCents`.

## State transitions

- `Promotion.valueMode`: freely toggleable between `flat` and
  `percentage` while editing a `flat`/`promo_code` promotion, same as
  every other field on this entity — no ordering constraint (matches
  `Promotion.active`'s existing freely-toggleable behavior).

## Migration shape

Additive only, against the already-live `promotions` table:

```sql
CREATE TYPE "public"."promotion_value_mode" AS ENUM ('flat', 'percentage');
ALTER TABLE "promotions" ADD COLUMN "value_mode" "promotion_value_mode" NOT NULL DEFAULT 'flat';
ALTER TABLE "promotions" ADD COLUMN "discount_percent" integer;
ALTER TABLE "promotions" ADD COLUMN "max_discount_cents" integer;
```

Every existing row gets `value_mode = 'flat'` via the column default,
which exactly preserves its current calculated behavior — this migration
changes no existing promotion's real-world effect.
