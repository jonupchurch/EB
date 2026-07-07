# Data Model: Cart & Checkout

Phase 1 output for `specs/003-cart-checkout/plan.md`. Follows
`research.md`'s decisions: no cart table, one flexible `promotions`
table, and `order_items` as a frozen JSON snapshot rather than live
relational references.

## Cart (not persisted)

The cart itself is never a database row — it's a cookie-held array of
references, re-priced fresh on every read:

| Field | Type | Notes |
|---|---|---|
| `productId` | identifier | References feature 1's `products` |
| `processingOptionId` / `stylingOptionId` / `materialOptionId` / `sizeOptionId` / `colorOptionId` | identifier, nullable | Single-select per line item (a product may not have every category configured) |
| `designLocationOptionIds` | identifier[] | Zero, one, or many — the one option category that's multi-select per feature 1's spec ("one or many per order") |
| `quantity` | integer | ≥ 1 |

Reading the cart (`src/lib/checkout/cart.ts`'s `getCart()`) resolves
each reference against current data: recomputes the line price via
`src/lib/pricing.ts`, and flags/excludes any line whose product (or a
referenced option) is no longer Active or no longer exists (FR-004).

## Promotion

One flexible table covering all five in-scope types (`research.md`'s
"one flexible table" decision). Feature 5 (not yet planned) owns
creating/editing these; this feature only reads and applies them.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `type` | enum: `flat` \| `bogo` \| `promo_code` \| `cart_threshold` \| `free_shipping` | |
| `promoCode` | text, nullable, unique (case-insensitive) | Set only for `promo_code` type |
| `discountAmountCents` | integer, nullable | The flat discount amount, for `flat` and `promo_code` types |
| `thresholdCents` | integer, nullable | Minimum cart subtotal to qualify, for `cart_threshold` type |
| `active` | boolean | Default `true` |
| `startsAt` / `endsAt` | timestamp, nullable | Optional validity window |
| `createdAt` | timestamp | |

Validation/resolution logic (`src/lib/checkout/promotions.ts`) is
described in `research.md`'s "Promotion resolution rule."

## Order

A completed, paid checkout — a frozen historical record, unlike the
live-recomputed cart.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `status` | enum: `placed` \| `paid` | FR-013. Only these two values exist in this feature; later statuses (in production, shipped) belong to a later admin feature |
| `subtotalCents` | integer | Sum of line items at time of payment |
| `discountCents` | integer | 0 if no promotion applied |
| `promotionId` | identifier, nullable | FK → Promotion, if one applied |
| `shippingMethod` | enum: `flat` \| `calculated` | |
| `shippingCents` | integer | The actual charged shipping amount (0 if a `free_shipping` promotion applied) |
| `taxCents` | integer | From TaxJar at time of payment |
| `totalCents` | integer | `subtotalCents` − `discountCents` + `shippingCents` + `taxCents` — never independently entered, always derived (SC-002) |
| `shippingAddress` | structured (name, line1, line2 nullable, city, state, zip, country) | |
| `customerEmail` | text | From the PayPal payer — needed by the later order-confirmation feature |
| `paypalOrderId` | text, unique | PayPal's own Orders API order ID, the reconciliation key for the webhook |
| `paidAt` | timestamp, nullable | Set only once the webhook is verified (FR-012) |
| `confirmationToken` | text, unique | Random (not sequential/guessable), generated at creation — the public identifier feature 4's confirmation page and email use; `id` itself is never exposed in a customer-facing URL |
| `confirmationEmailSentAt` | timestamp, nullable | Set by feature 4 once its one-time confirmation email is sent; unset here, this feature never sends it |
| `createdAt` | timestamp | Set when the order is placed (before payment completes) |

## Order Line Item

A frozen snapshot, not a live reference (`research.md`'s "frozen JSON
snapshot" decision).

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | Primary key |
| `orderId` | identifier | FK → Order, cascade delete |
| `productId` | identifier, nullable | FK → Product; nullable so a later product deletion never cascades into deleting order history |
| `productNameSnapshot` | text | Captured at time of purchase |
| `unitPriceCentsSnapshot` | integer | Base price + every selected option's adjustment, at time of purchase (via `src/lib/pricing.ts`) |
| `quantity` | integer | |
| `lineTotalCents` | integer | `unitPriceCentsSnapshot × quantity` |
| `selectedOptionsSnapshot` | JSON | Each selected option's category, label, and price adjustment at time of purchase — a deliberate JSON exception, see `research.md` |

## Validation rules (Zod, enforced server-side per Principle II)

- A cart reference's `productId` (and any selected option ID) must
  resolve to an existing, Active row at the moment it's read — an
  unresolvable reference is excluded and flagged, never silently
  priced as zero or ignored (FR-004).
- `Order.totalCents` is always derived server-side from its
  constituent fields at the moment of payment — never accepted as a
  submitted value from an earlier checkout step (FR-011, SC-002).
- A promo code is validated (exists, `active`, within its `startsAt`/
  `endsAt` window, and — for `cart_threshold`-adjacent logic — actually
  applicable to the current cart) before being applied; an invalid
  code is rejected with a specific reason (FR-006, SC-004).

## State transitions

- `Order.status`: `placed` → `paid`, one-way, triggered only by a
  verified PayPal webhook event (FR-012, FR-013). No other transition
  exists in this feature — later states are a later admin feature's
  responsibility (spec.md Assumptions).
