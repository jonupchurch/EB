# Contracts: Admin: Orders, Discounts, Shipping & Fees

Phase 1 output for `specs/005-admin-orders-discounts/plan.md`. All
actions below are Server Actions, reachable only through feature 1's
existing Auth.js-gated `/admin` layout, and all mutations pass through
feature 1's existing admin rate limiter (`src/lib/admin/rate-limit.ts`).

## Shared error shape

```text
{ ok: true, data: ... } | { ok: false, error: "not_found" | "invalid_transition" | "duplicate_code" | "validation_error" | "not_authorized" }
```

## Orders

### `listOrders()`

- **Purpose**: power the order queue (US1).
- **Output**: `[{ id, customerName, itemCount, totalCents, status, createdAt }]`, most-recent-first (FR-001).

### `getOrderDetail(orderId)`

- **Purpose**: power the order detail view (US1).
- **Output**: every line item, shipping address, full price breakdown, and payment/fulfillment status (FR-002).
- **Errors**: `not_found`.

### `advanceOrderStatus(orderId, toStatus)`

- **Purpose**: the fulfillment-status control (US1).
- **Input**: `{ orderId, toStatus: "in production" | "shipped" }` — `paid` is never a valid `toStatus` here (FR-005).
- **Behavior**: validates `toStatus` is the single legal next value after the order's current status via `src/lib/admin/order-status.ts` (FR-003, FR-004).
- **Errors**: `not_found`, `invalid_transition` (skip, reverse, or an attempt to set `paid`).

## Promotions

### `listPromotions()`

- **Purpose**: power the discounts screen (US2).
- **Output**: every promotion, active and inactive.

### `createPromotion(input)`

- **Input**: `{ type, promoCode?, discountAmountCents?, thresholdCents?, active, startsAt?, endsAt? }` (FR-006).
- **Errors**: `validation_error` (missing/invalid type-specific fields), `duplicate_code` (FR-010).

### `updatePromotion(id, input)`

- **Purpose**: edit details, validity window, or active state (FR-007).
- **Input**: same shape as `createPromotion`, partial.
- **Errors**: `not_found`, `validation_error`, `duplicate_code`.

### `deletePromotion(id)`

- **Purpose**: FR-008. Safe by construction — the `promotionId` foreign key's `ON DELETE SET NULL` (feature 3, amended) means this never touches or blocks any existing order (FR-009).
- **Errors**: `not_found`.

## Shipping settings

### `getShopSettings()`

- **Purpose**: power the shipping & fees screen (US3), and feature 3's checkout's own flat-rate lookup.
- **Output**: `{ flatRateShippingCents }` — `null` if never set; feature 3's checkout applies its own safe built-in default in that case (FR-012), not this action.

### `setFlatRateShipping(cents)`

- **Input**: `{ cents }` — a non-negative integer (FR-011).
- **Errors**: `validation_error`.
