# Contracts: Percentage-Off Discounts

Phase 1 output for `specs/007-percentage-discounts/plan.md`. Extends
feature 5's existing promotion Server Actions
(`src/app/admin/discounts/actions.ts`) — no new actions, no new routes.
Same shared error shape and auth/rate-limit gating as feature 5.

## Shared error shape (unchanged)

```text
{ ok: true, data: ... } | { ok: false, error: "not_found" | "validation_error" | "duplicate_code" | "not_authorized" }
```

## Promotions (existing actions, extended input shape)

### `createPromotion(input)` / `updatePromotion(id, input)`

- **Input, extended**: `{ type, promoCode?, valueMode?, discountAmountCents?, discountPercent?, maxDiscountCents?, thresholdCents?, active, startsAt?, endsAt? }`
  - `valueMode` defaults to `"flat"` when omitted (preserves every
    existing caller's current behavior unchanged).
  - `discountPercent` is required (1–100) only when `type` is `flat` or
    `promo_code` and `valueMode` is `"percentage"`.
  - `maxDiscountCents`, when present, is a non-negative integer; only
    meaningful when `valueMode` is `"percentage"`, ignored otherwise.
- **Errors, extended**: `validation_error` now also covers a missing or
  out-of-range `discountPercent` when `valueMode = "percentage"`, and a
  negative `maxDiscountCents`.
- **Unchanged**: `duplicate_code`, `not_authorized`, and every existing
  `flat`-mode/`bogo`/`cart_threshold`/`free_shipping` behavior.

### `listPromotions()`

- **Output, extended**: each returned promotion now also includes
  `valueMode`, `discountPercent`, `maxDiscountCents` so the admin list
  view can render a percentage promotion's rate distinctly from a flat
  amount (FR-013).

### `deletePromotion(id)`

- Unchanged — the new columns don't affect deletion safety
  (`ON DELETE SET NULL` on `orders.promotionId` already covers every
  promotion type/valueMode uniformly).

## Checkout-side read path (not a Server Action; internal library contract)

### `resolveApplicablePromotion(...)` / `validatePromoCode(...)` (`src/lib/checkout/promotions.ts`)

- **Unchanged signatures.** `PromotionRecord` gains `valueMode`,
  `discountPercent`, `maxDiscountCents` fields (mirroring the new
  columns), consumed internally by `calculateDiscount()`'s new
  percentage branch (see `data-model.md`). No caller-facing behavior
  change for existing `flat`-mode promotions.
