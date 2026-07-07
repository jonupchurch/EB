# Feature Specification: Cart & Checkout

**Feature Branch**: `003-cart-checkout`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Cart & checkout: lets a visitor collect products (with the options they configured via feature 2) into a cart, then complete a real, paid purchase. No customer account/login exists anywhere in this project — the cart and checkout are entirely anonymous/session-based. The customer needs a cart (add configured products, adjust quantities, remove items, an always-fresh subtotal never a stale add-time price); a checkout flow (shipping info, a flat or calculated/carrier shipping method using feature 1's product weight/dimensions, an optional promo code, a complete accurate breakdown — subtotal/discount/shipping/tax/total — with tax computed via a real tax-calculation API); and to pay via PayPal only (Stripe deferred), with the order marked paid only after PayPal's webhook signature is verified server-side, and the final charged total always recomputed and validated server-side at the moment of payment. Promotion types in scope: flat-amount, BOGO, promo code, cart-threshold, and free shipping/processing — this feature defines and applies these, but the admin screen to create/manage promotions and shipping/tax settings is a separate, later feature; for now assume they're configured directly. An order needs an explicit status starting at 'placed' and moving to 'paid' once webhook-verified; later states (in production, shipped) are a later admin feature's job, as is the customer-facing order confirmation page itself. Edge cases: a cart item becoming unavailable before checkout completes, a price changing between add-to-cart and checkout, an invalid/expired/inapplicable promo code, an empty cart at checkout, and a delayed or missing PayPal webhook. Out of scope: customer accounts/login/order history, the admin order queue/fulfillment and promotion/shipping/tax configuration screens, the customer-facing order confirmation page, Stripe, the live product customizer/upload-your-own-design experience, and refunds/cancellation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build and review a cart (Priority: P1)

As a visitor, I want to add products I've configured (with my chosen options) to a cart, adjust quantities, remove items, and always see an accurate running subtotal, so I can collect what I want to buy before committing to checkout.

**Why this priority**: Nothing else in this feature is reachable without a cart — it's the entry point to any purchase.

**Independent Test**: Add a configured product to the cart, adjust its quantity, add a second product, remove one, and confirm the subtotal is correct at every step — independent of checkout or payment.

**Acceptance Scenarios**:

1. **Given** a visitor is viewing a configured product, **When** they add it to their cart, **Then** it appears with its exact configuration, a quantity of 1, and its current price.
2. **Given** an item is in the cart, **When** the visitor changes its quantity, **Then** the line total and cart subtotal update accordingly (quantity cannot go below 1 without removing the item entirely).
3. **Given** an item is in the cart, **When** the visitor removes it, **Then** it no longer appears and the subtotal updates to match.
4. **Given** the cart has items, **When** the visitor views it at any later time, **Then** the subtotal reflects each item's *current* price and availability — never a value captured at the moment it was added.

---

### User Story 2 - Complete checkout with an accurate final total (Priority: P2)

As a visitor, I want to enter my shipping information, choose a shipping method, optionally apply a promo code, and see a complete, accurate price breakdown before paying, so I know exactly what I'll be charged.

**Why this priority**: A cart alone doesn't complete a sale — this is the step that turns a collection of items into a real, priceable order, though payment itself is the next and final priority.

**Independent Test**: From a non-empty cart, proceed through checkout, enter shipping details, apply a promo code, and confirm the final breakdown (subtotal, discount, shipping, tax, total) is accurate — independent of actually completing payment.

**Acceptance Scenarios**:

1. **Given** a non-empty cart, **When** a visitor proceeds to checkout, **Then** they can enter shipping information and choose a shipping method (a flat rate or a calculated/carrier rate).
2. **Given** a visitor is at checkout, **When** they enter a valid, applicable promo code, **Then** the corresponding discount is applied and reflected in the breakdown.
3. **Given** a visitor enters an invalid, expired, or inapplicable promo code, **Then** it's rejected with a clear, specific reason and the total is unaffected.
4. **Given** a visitor has entered shipping details, **When** they reach the final review step, **Then** they see a complete breakdown — subtotal, discount (if any), shipping, tax, and total — computed accurately.
5. **Given** the cart is empty, **When** a visitor attempts to reach checkout, **Then** they cannot proceed toward payment.

---

### User Story 3 - Pay and have the order reliably recorded (Priority: P3)

As a visitor, I want to pay for my order via PayPal and know it will be correctly and durably recorded, so I can trust my purchase actually went through.

**Why this priority**: This is the moment money and commitment actually change hands — the most consequential step, appropriately built last once the cart and pricing beneath it are solid.

**Independent Test**: From an accurate checkout total, complete payment via PayPal and confirm the order is created and marked paid only once PayPal's webhook signature is verified server-side — independent of any customer-facing confirmation display.

**Acceptance Scenarios**:

1. **Given** a visitor has reached the final checkout total, **When** they complete payment via PayPal, **Then** an order is created and marked paid only after PayPal's webhook signature is verified server-side — never on the basis of the client-side redirect alone.
2. **Given** a visitor abandons or fails PayPal payment, **Then** no order is ever marked paid, and the attempt is not silently lost.
3. **Given** a cart item's price or availability changed between being added and payment being attempted, **When** payment is attempted, **Then** the system uses the current, accurate values — never a stale total captured earlier in the flow.
4. **Given** PayPal's webhook is delayed after a customer completes approval, **Then** the order is not lost — it resolves correctly once the webhook eventually arrives (or via a fallback verification path), rather than being silently dropped.

---

### Edge Cases

- What happens when a cart item becomes unavailable (set to Draft, or deleted) before checkout completes? It MUST be clearly flagged and excluded from the order — never silently charged for.
- What happens when a product's price changes between being added to the cart and checkout? The current, canonical price MUST always be used — never the price captured at add-time.
- What happens with an invalid, expired, or inapplicable promo code? It MUST be rejected with a specific reason, never silently applied or silently ignored.
- What happens if a visitor tries to reach payment with an empty cart? They MUST be blocked from proceeding.
- What happens when PayPal's webhook is delayed or never arrives after the customer completes approval on PayPal's side? The order MUST NOT be marked paid until verification actually succeeds, but the legitimate payment attempt MUST NOT be permanently lost either — it must resolve correctly once verification completes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Visitors MUST be able to add a configured product (with its selected options from feature 2) to a cart without an account.
- **FR-002**: System MUST let a visitor adjust a cart item's quantity and remove it entirely.
- **FR-003**: System MUST always display cart pricing computed fresh from the current canonical product/option data — never a value stored from when the item was added.
- **FR-004**: System MUST detect when a cart item is no longer available (Draft or deleted) at checkout time and clearly flag/exclude it rather than silently charging for it.
- **FR-005**: System MUST let a visitor enter shipping information and select a shipping method — a flat rate or a calculated/carrier rate — during checkout.
- **FR-006**: System MUST let a visitor optionally apply a promo code during checkout, validating its existence, validity window, and applicability before applying it, and MUST reject an invalid one with a clear, specific reason.
- **FR-007**: System MUST compute sales tax via a real tax-calculation service — never a hardcoded or hand-rolled rate table.
- **FR-008**: System MUST display a complete order breakdown — subtotal, discount (if any), shipping, tax, and total — before payment.
- **FR-009**: System MUST NOT allow checkout to proceed to payment with an empty cart.
- **FR-010**: System MUST accept payment only via PayPal for this feature (Stripe is a deferred fast-follow, per `docs/adr/0005-paypal-for-mvp-payments.md`).
- **FR-011**: System MUST compute and validate the final charged total server-side at the moment of payment — from the canonical catalog plus applicable promotion/shipping/tax rules — never trusting any total submitted earlier in the flow.
- **FR-012**: System MUST verify PayPal's webhook signature before marking any order paid, and MUST NOT mark an order paid on the basis of a client-side redirect or callback alone.
- **FR-013**: System MUST record each order with an explicit status that starts at "placed" and moves to "paid" only once webhook verification succeeds — never inferred from other data.
- **FR-014**: System MUST durably persist a completed order — its items, configuration, pricing breakdown, and shipping details — once paid, so a later feature can read and act on it.
- **FR-015**: System MUST handle a delayed or missing PayPal webhook without permanently losing a legitimate payment attempt, and MUST NOT mark an order paid until verification actually succeeds.

### Key Entities *(include if feature involves data)*

- **Cart**: An anonymous visitor's in-progress selection of items. Holds line items; its displayed subtotal is always recomputed live, never stored.
- **Cart Line Item**: A reference to a configured product (its selected options) plus a quantity, within a cart.
- **Promotion**: A discount rule — one of flat-amount, buy-one-get-one, promo code, cart-subtotal threshold, or free shipping/processing — with whatever conditions determine when it applies. Created/managed by a separate, later feature; this feature only applies them.
- **Order**: A completed checkout. Unlike a Cart, it's a frozen historical record: its line items, shipping details, applied promotion (if any), tax, shipping cost, and total reflect exactly what was charged at the moment of payment. Carries an explicit status (starting at "placed," reaching "paid" once webhook-verified; later statuses belong to a separate, later feature).
- **Order Line Item**: One purchased product configuration within an order, with its price snapshotted at the moment of purchase — deliberately not live-recomputed, since an order is a record of what actually happened.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can go from an empty cart to a completed, paid order in under 5 minutes under normal conditions.
- **SC-002**: 100% of completed orders have a total that exactly matches the server-computed subtotal, shipping, and tax minus any discount — zero drift from any client-submitted figure.
- **SC-003**: 100% of orders are marked paid only after PayPal's webhook signature verification succeeds — zero orders are ever marked paid without it.
- **SC-004**: 100% of invalid, expired, or inapplicable promo codes are rejected with a clear reason — never silently applied or silently ignored.
- **SC-005**: 100% of legitimate completed PayPal payments result in a correctly recorded paid order, even when the confirming webhook is delayed.

## Assumptions

- Promotions, shipping-rate configuration, and tax-service settings are configured directly (e.g., seeded) for this feature — the admin UI to manage them is a separate, later feature, only useful once real orders exist to manage.
- The tax-calculation service is TaxJar — this feature finalizes the constitution's prior "leaning TaxJar" note into a real decision, since Ohio's county-level tax variation can no longer be deferred once checkout actually needs to compute a number.
- Cart contents are tied to the visitor's browser (e.g., a long-lived cookie), not an account — there is no cross-device cart sync, matching the fact that no customer account system exists anywhere in this project.
- At most one promotion applies to a given order — if a visitor's cart would qualify for more than one, only one (e.g., a single promo-code field, or the single greatest-benefit automatic promotion) is ever applied; stacking multiple promotions simultaneously is out of scope.
- The customer-facing order confirmation page/experience is out of scope here — a separate, later feature reads the paid order this feature creates and presents it to the customer.
- This feature ends once an order is durably recorded as paid; later order states (in production, shipped) and all admin-side order/fulfillment management belong to a separate, later feature.
