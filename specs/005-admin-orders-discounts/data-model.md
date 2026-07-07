# Data Model: Admin: Orders, Discounts, Shipping & Fees

Phase 1 output for `specs/005-admin-orders-discounts/plan.md`. This
feature reads/updates feature 3's `orders` and `promotions` tables
(amended alongside this plan — see `research.md`'s cross-feature
amendment) and adds one new table, `shop_settings`.

## Order (feature 3, amended)

This feature never touches any field except `status`, and only via the
allowed-transition map in `src/lib/admin/order-status.ts`:

| Field | Type | Notes |
|---|---|---|
| `status` | enum: `placed` \| `paid` \| `in production` \| `shipped` | This feature's only mutation. `placed`→`paid` stays exclusively webhook-driven (feature 3, unreachable from this feature); `paid`→`in production`→`shipped` are this feature's two legal admin-driven transitions, one step at a time |

Every other Order field (line items, shipping address, price
breakdown, `paypalOrderId`, `confirmationToken`, etc.) is read-only
here, per `spec.md`'s FR-002.

## Promotion (feature 3, first written here)

Unchanged shape from `specs/003-cart-checkout/data-model.md`; this
feature is the first to actually create, edit, and delete rows here —
feature 3 only ever read and applied them.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `type` | enum: `flat` \| `bogo` \| `promo_code` \| `cart_threshold` \| `free_shipping` | Chosen at creation, not changed afterward (a type change is really "delete and recreate," not an edit) |
| `promoCode` | text, nullable, unique (case-insensitive) | Required for `promo_code` type; the admin form enforces uniqueness before saving (FR-010) |
| `discountAmountCents` | integer, nullable | For `flat` and `promo_code` types |
| `thresholdCents` | integer, nullable | For `cart_threshold` type |
| `active` | boolean | Admin-toggleable (FR-007) |
| `startsAt` / `endsAt` | timestamp, nullable | Optional validity window, admin-settable |
| `createdAt` | timestamp | Set once, at creation |

## Shop Setting (new)

A single-row table — see `research.md`'s "single-row table" decision.
Currently holds exactly one setting.

| Field | Type | Notes |
|---|---|---|
| `id` | integer, fixed at `1` | Singleton — there is only ever one row |
| `flatRateShippingCents` | integer, nullable | `null` until the admin sets it (FR-011); feature 3's checkout falls back to a safe built-in default (FR-012) when `null` |
| `updatedAt` | timestamp | Set on every write |

## Validation rules (Zod, enforced server-side per Principle II)

- `advanceOrderStatus(orderId, toStatus)`: `toStatus` MUST be the
  single legal next value after the order's current `status` per
  `src/lib/admin/order-status.ts`'s map — any skip, reverse, or attempt
  to set `paid` directly is rejected with a specific reason (FR-004,
  FR-005).
- `createPromotion`/`updatePromotion`: `promoCode` (when the type is
  `promo_code`) MUST be unique case-insensitively among currently
  active promotions (FR-010); type-specific required fields (e.g.
  `discountAmountCents` for `flat`) MUST be present and valid for the
  chosen `type`.
- `deletePromotion`/deactivating a promotion: performs no lookup into
  or modification of any `orders` row — the `ON DELETE SET NULL`
  foreign key (feature 3, amended) is what makes this safe by
  construction, not application-level cleanup logic (FR-009).
- `setFlatRateShipping(cents)`: `cents` MUST be a non-negative integer.

## State transitions

- `Order.status`: `paid` → `in production` → `shipped`, one step at a
  time, admin-triggered, one-way. `placed` → `paid` remains feature
  3's webhook-only transition, unreachable from this feature's actions
  (FR-005).
- `Promotion.active`: `true` ⇄ `false`, freely toggleable by the admin
  in either direction (unlike Order status, there's no ordering
  constraint on a promotion's active flag).
- `ShopSetting.flatRateShippingCents`: `null` → a value, freely
  updatable afterward — no ordering constraint.
