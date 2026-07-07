# Feature Specification: Admin: Orders, Discounts, Shipping & Fees

**Feature Branch**: `005-admin-orders-discounts`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Admin: orders, discounts, shipping & fees — the last MVP feature, giving the business owner (Erica) the authenticated admin tools to actually run the store day-to-day, gated behind the same Google SSO allow-list as feature 1's product management. The owner needs an order queue (customer name, item count, total, fulfillment status, placed date) and an order detail view (line items, configuration, quantity, price, shipping address, full price breakdown, payment status — all read-only, a paid order's contents are historical). Fulfillment status control: placed → paid (already automatic via feature 3's webhook, not admin-editable) → in production → shipped, one step forward at a time, never skipped, never reversed — the missing piece feature 4's confirmation-page timeline already displays as future stages but has no way to drive. Discount/promotion management: full CRUD over feature 3's existing `promotions` table and its five already-decided types (flat amount, BOGO, promo code, cart-threshold, free shipping) — feature 3 assumed these were 'configured directly' since no admin screen existed yet. Shipping settings: the flat-rate shipping amount feature 3's checkout offers was assumed 'configured directly' as a hardcoded placeholder — this feature replaces that with a real, admin-editable single flat-rate amount in cents, the one piece of shop-wide configuration this project has since tax and calculated shipping are already fully dynamic via TaxJar/Shippo. Edge cases: an admin attempting to skip a fulfillment stage or move it backward MUST be rejected; deactivating or deleting a promotion currently in use must not corrupt or retroactively change any already-placed order (orders already snapshot their own discount); the flat shipping rate being unset MUST have a safe checkout default rather than erroring. Out of scope: refunds/cancellation, editing an order's actual contents/address/pricing after it's placed, multiple admin roles/permissions, per-product or per-category promotion scoping (every promotion applies store-wide), shipping label generation/tracking numbers, and any change to how tax or calculated shipping rates are computed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Work the order queue through to fulfillment (Priority: P1)

As the business owner, I want to see every order that's come in and move each one through production and shipping as I actually complete the work, so the confirmation page and my own records always reflect reality.

**Why this priority**: This is the daily-driver task the entire MVP exists to support — without it, orders can be paid for but never actually get fulfilled from a tracked, authenticated place.

**Independent Test**: Sign in as the admin, view the order queue, open an order's detail, advance its status from paid to in production, then to shipped, and confirm each transition is reflected immediately and cannot be skipped or reversed — independent of discounts or shipping settings.

**Acceptance Scenarios**:

1. **Given** the admin is signed in, **When** they open the order queue, **Then** they see every order listed with customer name, item count, total, current fulfillment status, and placed date, most recent first.
2. **Given** an order in the queue, **When** the admin opens its detail view, **Then** they see every line item (name, configuration, quantity, price), the shipping address, the full price breakdown, and the payment status — with no way to edit any of it.
3. **Given** an order currently `paid`, **When** the admin marks it "in production," **Then** its status updates to `in production` and that same order's confirmation page (feature 4) reflects the new stage.
4. **Given** an order currently `in production`, **When** the admin marks it "shipped," **Then** its status updates to `shipped`.
5. **Given** an order currently `placed` (not yet paid), **When** the admin attempts to mark it "in production" or "shipped," **Then** the system rejects the attempt — a stage cannot be skipped.
6. **Given** an order currently `shipped`, **When** the admin attempts to move it back to an earlier stage, **Then** the system rejects the attempt — status only ever moves forward.

---

### User Story 2 - Create and manage discounts/promotions (Priority: P2)

As the business owner, I want to create, edit, and turn promotions on or off myself, so I can run a sale or offer a promo code without needing a code change.

**Why this priority**: Important for running the business, but checkout already works correctly with zero active promotions (feature 3's "at most one promotion" rule handles that cleanly) — this is a real feature, not a launch blocker for order fulfillment itself.

**Independent Test**: Create one promotion of each of the five types, edit one, deactivate one, and delete one — confirm each change is reflected the next time checkout evaluates promotions — independent of the order queue or shipping settings.

**Acceptance Scenarios**:

1. **Given** the admin is on the promotions screen, **When** they create a new promotion (choosing a type — flat amount, BOGO, promo code, cart-threshold, or free shipping — and its type-specific details), **Then** it's saved and immediately eligible to apply at checkout per its type's rules.
2. **Given** an existing promotion, **When** the admin edits its details or validity window, **Then** the change takes effect for any checkout evaluated afterward.
3. **Given** an existing promotion, **When** the admin deactivates it, **Then** it stops applying to any new checkout, while every order that already used it keeps its own already-recorded discount unchanged.
4. **Given** an existing promotion no longer needed, **When** the admin deletes it, **Then** it's removed from the active promotion list, while every order that already used it keeps its own already-recorded discount unchanged (the order's snapshot never depends on the promotion row still existing).
5. **Given** a promo-code-type promotion, **When** the admin sets its code, **Then** the system enforces the code is unique (case-insensitive) among active promotions.

---

### User Story 3 - Set the flat shipping rate (Priority: P3)

As the business owner, I want to set the flat-rate shipping amount myself, so I can adjust it without a code change as costs change.

**Why this priority**: The smallest, least-frequently-touched piece — a single number, changed occasionally, with checkout already functional using a placeholder value.

**Independent Test**: Set the flat shipping rate to a new amount and confirm a checkout that chooses flat-rate shipping reflects the new amount — independent of the order queue or promotions.

**Acceptance Scenarios**:

1. **Given** the admin is on the shipping settings screen, **When** they set the flat-rate shipping amount, **Then** it's saved and used by every subsequent checkout that selects flat-rate shipping.
2. **Given** the flat-rate shipping amount has never been set, **When** a customer checks out and selects flat-rate shipping, **Then** the system uses a safe, non-zero default rather than erroring or charging nothing.

---

### Edge Cases

- What happens when an admin tries to skip a fulfillment stage (e.g. `paid` → `shipped` directly) or move status backward? Both MUST be rejected with a clear reason — the state machine only allows one forward step at a time.
- What happens when a promotion currently in use (i.e., already applied to at least one order) is deactivated or deleted? The already-placed order(s) MUST be entirely unaffected — their recorded discount is a frozen snapshot, never a live reference to the promotion row.
- What happens when the flat shipping rate has never been configured? Checkout MUST use a safe built-in default rather than failing or charging $0 shipping.
- What happens when an admin tries to create a second promo-code promotion reusing an already-active code? The system MUST reject it as a duplicate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show an authenticated admin an order queue listing every order with customer name, item count, total, current fulfillment status, and placed date, ordered most-recent-first.
- **FR-002**: System MUST show an order detail view with every purchased line item (name, configuration, quantity, price), the shipping address, the full price breakdown, and the payment status — entirely read-only.
- **FR-003**: System MUST let the admin advance an order's fulfillment status exactly one step forward at a time, following the sequence placed → paid → in production → shipped.
- **FR-004**: System MUST reject any attempt to skip a fulfillment stage or move status backward.
- **FR-005**: System MUST NOT allow the admin to directly set an order to `paid` — that transition remains solely the result of a verified payment (feature 3).
- **FR-006**: System MUST let the admin create a promotion of any of the five supported types (flat amount, BOGO, promo code, cart-threshold, free shipping) with that type's relevant details and an optional validity window.
- **FR-007**: System MUST let the admin edit an existing promotion's details, validity window, and active/inactive state.
- **FR-008**: System MUST let the admin delete a promotion.
- **FR-009**: Deactivating or deleting a promotion MUST NOT alter any order that already used it — an order's recorded discount is fixed at the time it was placed.
- **FR-010**: System MUST enforce that a promo-code-type promotion's code is unique (case-insensitive) among currently active promotions.
- **FR-011**: System MUST let the admin set a single flat-rate shipping amount, used by checkout whenever a customer selects flat-rate shipping.
- **FR-012**: System MUST provide a safe, sensible built-in default flat-rate shipping amount for use until the admin sets one explicitly.
- **FR-013**: Every capability in this feature MUST be reachable only by an authenticated, allow-listed admin account (the same gate as feature 1).

### Key Entities *(include if feature involves data)*

- **Order** (feature 3): this feature adds one admin-driven state transition (`in production`, `shipped`) on top of the `placed`/`paid` values feature 3 already defines; every other field is read-only here.
- **Promotion** (feature 3): this feature is the first to actually create, edit, and delete rows in this table — feature 3 only read and applied them.
- **Shop Setting**: one new small piece of shop-wide configuration this feature introduces — currently just the flat-rate shipping amount — read by feature 3's checkout, written only here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The admin can find any order and correctly advance its fulfillment status in under 30 seconds per order.
- **SC-002**: 100% of attempts to skip a fulfillment stage or reverse one are rejected — never silently accepted.
- **SC-003**: 100% of promotions created by the admin apply correctly at checkout on the very next attempt, with no code change required.
- **SC-004**: 0% of already-placed orders are ever altered by a later promotion edit, deactivation, or deletion.
- **SC-005**: The admin can change the flat shipping rate and see it reflected at checkout within moments, with no deployment needed.

## Assumptions

- Every promotion in this project applies store-wide — no per-product or per-category scoping exists in feature 3's schema, and this feature doesn't add any; a promotion that needs product-level scoping in the future is a separate, later decision.
- "Shipping & fees" in this project currently means exactly one setting: the flat-rate shipping amount. No other shop-wide fee concept exists anywhere in the specs reviewed so far (tax is fully computed by TaxJar; calculated shipping is fully computed by Shippo) — if a real "fee" concept beyond shipping surfaces later, it's a separate amendment.
- Refunds, cancellations, and editing an order's actual contents/address/pricing after it's placed remain out of scope, consistent with feature 3's own Out of Scope section.
- A single admin role exists (per the constitution's "single owner role only") — this feature introduces no permission tiers.
- Shipping label generation and tracking numbers are not part of this feature — fulfillment status is a simple stage marker, not a shipping-carrier integration.
