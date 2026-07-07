# Data Model: Order Confirmation

Phase 1 output for `specs/004-order-confirmation/plan.md`. This
feature introduces **no new table**. It reads feature 3's `orders` and
`order_items` (`specs/003-cart-checkout/data-model.md`), including two
columns added to `orders` specifically for this feature's sake:

| Field | Type | Notes |
|---|---|---|
| `confirmationToken` | text, unique | Generated at order creation (feature 3); the only identifier this feature ever uses in a URL — `orders.id` itself is never exposed |
| `confirmationEmailSentAt` | timestamp, nullable | `null` until this feature's one-time email is sent; set exactly once (FR-008) |

## Confirmation view (read shape, not a table)

What `getOrderConfirmation(token)` (per `contracts/actions.md`)
assembles for the page:

- Every `order_items` row for the order — name, configuration
  snapshot, quantity, price (already frozen at purchase time, per
  feature 3's `data-model.md` — this feature never recomputes
  anything).
- The order's `shippingAddress`, and its full breakdown
  (`subtotalCents`, `discountCents`, `shippingCents`, `taxCents`,
  `totalCents`) — all already-computed, stored values from feature 3.
- The order's `status` (`placed` | `paid`), rendered as a timeline:
  "placed" always shown reached; "paid" shown reached only if
  `status = 'paid'` (equivalently, `paidAt` is set); "in production"
  and "shipped" always shown as upcoming/not-yet-reached in this
  feature (FR-003) — this feature has no way to know otherwise, and
  must not imply it does.

## Validation rules

- A `confirmationToken` that doesn't match any order returns "not
  found" (FR-011) — never a partial object, never distinguishing
  "doesn't exist" from "exists but something's null," which could leak
  information about order existence.
- `sendConfirmationEmail` MUST check `confirmationEmailSentAt IS NULL`
  and the order's `status = 'paid'` before sending, and MUST set
  `confirmationEmailSentAt` as part of the same operation that
  confirms it should send — not as a separate, later step that a
  concurrent redelivery could race past (FR-007, FR-008).

## State transitions

- `orders.confirmationEmailSentAt`: `null` → a timestamp, exactly once,
  triggered only by feature 3's webhook handler observing a
  fresh `placed` → `paid` transition. No other trigger exists in this
  feature (matches spec.md's exclusion of any resend tooling).
