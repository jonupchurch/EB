# Contracts: Cart & Checkout

Phase 1 output for `specs/003-cart-checkout/plan.md`. This feature's
interface is a set of Next.js Server Actions (cart mutations in
`src/app/(storefront)/cart/actions.ts`, checkout in
`src/app/(storefront)/checkout/actions.ts`) plus one public Route
Handler (the PayPal webhook). No authentication gate exists on any of
these — they're anonymous/public, unlike feature 1's admin actions.

Every mutating action validates its input against a Zod schema before
use (Principle II) and enforces the checkout rate limiter
(`src/lib/checkout/rate-limit.ts`).

## `addToCart(productId, selections, quantity)`

- **Purpose**: add a configured product to the cart (US1).
- **Input**: `{ productId, processingOptionId?, stylingOptionId?, materialOptionId?, sizeOptionId?, colorOptionId?, designLocationOptionIds?, quantity }`. Every option ID, if present, must reference an existing, Active row on that product.
- **Output**: `{ ok: true }` on success — sets/updates the cart cookie. No line-item ID is returned to the client as a source of truth for price.
- **Errors**: `validation_error` if `productId` or any option ID doesn't resolve, or the product is not Active.

## `updateCartItemQuantity(lineIndex, quantity)` / `removeCartItem(lineIndex)`

- **Purpose**: adjust or remove a cart line (US1, FR-002).
- **Input**: `{ lineIndex, quantity }` (quantity ≥ 1) or `{ lineIndex }`.
- **Output**: `{ ok: true }` — updates the cart cookie.
- **Errors**: `not_found` if `lineIndex` doesn't exist in the current cart.

## `getCart()`

- **Purpose**: power the Cart view (US1) with always-fresh pricing.
- **Input**: none (reads the cart cookie).
- **Output**: `{ items: { productId, name, selectedOptions: { category, label, priceAdjustmentCents }[], quantity, unitPriceCents, lineTotalCents, unavailable: boolean }[], subtotalCents }`. An `unavailable: true` item is still shown (so the customer knows what changed) but excluded from `subtotalCents` (FR-004).
- **Errors**: none — an empty cart returns `{ items: [], subtotalCents: 0 }`.

## `getCheckoutSummary(shippingAddress, shippingMethod, promoCode?)`

- **Purpose**: power the checkout review step (US2) with a complete, accurate breakdown.
- **Input**: `{ shippingAddress, shippingMethod: "flat" | "calculated", promoCode? }`.
- **Output**: `{ subtotalCents, discountCents, shippingCents, taxCents, totalCents, unavailableItems: [...] }` — computed fresh via `src/lib/checkout/{tax,shipping,promotions}.ts` against the current cart (FR-005–FR-008).
- **Errors**: `validation_error` if the cart is empty (FR-009) or `shippingAddress` is incomplete; `promo_invalid` with a specific reason if `promoCode` doesn't resolve, isn't active, or doesn't apply to this cart (FR-006).

## `createOrderAndPayment(shippingAddress, shippingMethod, promoCode?)`

- **Purpose**: finalize the order and initiate PayPal payment (US3).
- **Input**: same shape as `getCheckoutSummary` — the total is **recomputed** here, never trusted from the prior summary call (FR-011).
- **Output**: `{ orderId, paypalApprovalUrl }` on success — a `placed`-status Order is created (`data-model.md`), and a PayPal order is created server-side for the freshly-computed `totalCents`.
- **Errors**: `validation_error` (empty cart, incomplete address, an item became unavailable since the summary was shown); `promo_invalid`.

## `POST /api/webhooks/paypal` (Route Handler, not a Server Action)

- **Purpose**: mark an order paid, and only this way (FR-012, FR-013).
- **Input**: PayPal's webhook payload + its signature headers.
- **Behavior**: verifies the signature via `src/lib/checkout/paypal.ts`'s `verifyWebhookSignature`. On a verified `PAYMENT.CAPTURE.COMPLETED` (or equivalent) event matching a known `paypalOrderId`, sets that Order's `status` to `paid` and `paidAt` to now — idempotently (a repeated webhook delivery for an already-paid order is a no-op, not an error).
- **Output**: `200 OK` once processed (or already-processed); PayPal retries on any non-2xx response, which is the intended fallback for a delayed webhook (spec.md Edge Cases, FR-015).
- **Errors**: signature verification failure → `401`, logged, no state change.

## Shared error shape

```text
{ ok: true, data: ... } | { ok: false, error: "validation_error" | "not_found" | "promo_invalid", fieldErrors?: Record<string, string> }
```

`not_authorized` doesn't apply (no auth gate on this feature, unlike
feature 1's admin actions).
