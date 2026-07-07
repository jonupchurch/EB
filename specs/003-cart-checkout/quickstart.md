# Quickstart: Cart & Checkout

Validation guide for this feature once implemented. See
`contracts/actions.md` for the action interfaces, `data-model.md` for
entity shapes, and `spec.md` for the requirements each scenario traces
to.

## Prerequisites

- `npm install`
- `.env.local` filled in per `.env.example`: `TAXJAR_API_KEY`,
  `SHIPPO_API_KEY`, and the existing `PAYPAL_CLIENT_ID`/
  `PAYPAL_CLIENT_SECRET`/`PAYPAL_WEBHOOK_ID` (sandbox credentials for
  local dev — never production keys)
- `npm run db:migrate` — applies this feature's migration (`promotions`,
  `orders`, `order_items`)
- At least one seeded `promotions` row (e.g., a `cart_threshold` or
  `promo_code` type) and one Active product with weight/dimensions set
  (feature 1's FR-017), to exercise calculated shipping

## Automated checks

```sh
npm run typecheck
npm run lint
npm run test        # Vitest: promotion discount calc, cart re-validation
npm run test:e2e    # Playwright: browse → cart → checkout → pay (fake providers)
```

All four MUST pass (Constitution Principle V). The e2e suite uses this
project's deterministic fakes for PayPal, TaxJar, and Shippo — no
sandbox network calls in CI.

## Manual validation scenarios

Run `npm run dev`, browse to a product (feature 2), configure it:

1. **Add to cart (US1, FR-001)**: add a configured product to the
   cart. Confirm it appears with its exact configuration, quantity 1,
   and current price.
2. **Adjust and remove (US1, FR-002)**: change the item's quantity,
   confirm the subtotal updates; add a second product; remove the
   first; confirm the subtotal reflects only what remains.
3. **Always-fresh pricing (US1, FR-003)**: with an item in the cart,
   edit that product's base price via feature 1's admin editor.
   Reload the cart and confirm the new price is reflected immediately.
4. **Unavailable item detection (FR-004, Edge Cases)**: with an item in
   the cart, set that product to Draft via admin. Reload the cart and
   confirm it's flagged/excluded from the subtotal, not silently
   charged.
5. **Checkout breakdown (US2, FR-005–FR-008)**: proceed to checkout,
   enter shipping information, choose flat and then calculated
   shipping, and confirm each produces a complete, accurate breakdown
   (subtotal, discount, shipping, tax, total).
6. **Promo code (US2, FR-006, SC-004)**: apply a valid, seeded promo
   code and confirm the discount reflects correctly; then try an
   invalid/expired/random code and confirm a specific rejection
   message, with the total unaffected.
7. **Empty cart blocked (FR-009, Edge Cases)**: with an empty cart,
   confirm checkout cannot proceed to payment.
8. **Pay via PayPal, webhook-verified (US3, FR-010–FR-013, SC-002,
   SC-003)**: complete a checkout using the fake/sandbox PayPal flow.
   Confirm the order is created as `placed` and only flips to `paid`
   once the (fake, in dev) webhook is verified — never immediately on
   the client-side redirect.
9. **Stale total protection (FR-011, Edge Cases)**: reach the checkout
   review step, then (in another tab) change the product's price or
   an applied promotion's status via admin; complete payment and
   confirm the actually-charged total reflects the *current* data, not
   the value shown earlier in the flow.
10. **Delayed webhook (FR-015, Edge Cases)**: simulate a delayed
    webhook delivery (the fake PayPal provider should support this) and
    confirm the order resolves correctly to `paid` once it arrives,
    rather than being lost or double-processed.

## Privacy/security check

11. Confirm no request — cart mutation, checkout summary, or order
    creation — can result in a total that differs from what the
    server independently computes at that moment; inspect network
    traffic to confirm no endpoint accepts a client-submitted price or
    total field.
