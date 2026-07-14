# Feature Specification: Percentage-Off Discounts

**Feature Branch**: `007-percentage-discounts`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Add a percentage-off discount type to the existing admin discounts/promotions feature (feature 5). Admins can create a promotion where the discount is a percentage of the cart subtotal (e.g. 15% off) instead of only a flat cents amount, applicable as: a standalone automatic/codeless percentage promotion, and as the discount mechanic for a promo code (percentage off instead of flat amount off). Should follow the same active-window (startsAt/endsAt), active/inactive, and best-value-wins-if-multiple-automatic-promotions rules already established for the other promotion types. Optionally support an optional max-discount cap in cents so a percentage-off promo code can't discount an unlimited amount on a very large order (admin's choice, not required per-promotion). Does not need to support percentage-off scoped to specific products/categories or cart-threshold combined with percentage (cart_threshold stays flat-amount-only for now) — this is purely adding 'percentage' as a value-calculation mode alongside the existing 'flat' one."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Promo code takes a percentage off (Priority: P1)

The business owner wants to run a marketing promotion like "15% off with code SUMMER15" instead of being limited to a flat dollar amount off. She creates a promo-code promotion in the admin discounts page, chooses "percentage" as the discount type, sets the rate, and publishes the code. A customer who enters that code at checkout sees their subtotal discounted by exactly that percentage.

**Why this priority**: Percentage-off promo codes are the most common and most requested style of promotion for a retail storefront — this is the primary reason this feature is being built.

**Independent Test**: Can be fully tested by creating a percentage promo code in the admin UI, entering it at checkout against a known cart subtotal, and confirming the discount equals the expected percentage of that subtotal.

**Acceptance Scenarios**:

1. **Given** an active promo code configured for 15% off with no cap, **When** a customer enters that code with a $100.00 subtotal, **Then** the discount applied is $15.00.
2. **Given** an active promo code configured for 20% off with a $25.00 maximum discount cap, **When** a customer enters that code with a $200.00 subtotal, **Then** the discount applied is capped at $25.00 rather than $40.00.
3. **Given** a percentage promo code outside its configured active date window, **When** a customer enters that code, **Then** the code is rejected the same way an out-of-window flat promo code is rejected today.

---

### User Story 2 - Automatic sitewide percentage promotion (Priority: P2)

The business owner wants to run a sitewide sale (no code required) where every order is automatically discounted by a percentage, the same way an automatic flat-amount promotion works today.

**Why this priority**: Sitewide percentage sales are a common secondary promotional lever, but less frequently used day-to-day than a shareable promo code.

**Independent Test**: Can be fully tested by activating a codeless percentage promotion and confirming it is automatically applied to a checkout with no code entered.

**Acceptance Scenarios**:

1. **Given** one active automatic percentage promotion and no promo code entered, **When** a customer checks out, **Then** the percentage discount is automatically applied to their subtotal.
2. **Given** one active automatic flat-amount promotion and one active automatic percentage promotion, both applicable, **When** a customer checks out with no code entered, **Then** the system applies whichever of the two yields the greater discount for that cart, exactly as it already does when comparing two automatic promotions today.

---

### User Story 3 - Capping a percentage promotion's maximum discount (Priority: P3)

The business owner wants the option, but not the requirement, to set a maximum dollar cap on any percentage-based promotion, so an unusually large order can't be discounted by an unlimited amount.

**Why this priority**: This is a protective refinement of User Stories 1 and 2 rather than a standalone capability — it only matters once percentage promotions already exist.

**Independent Test**: Can be fully tested by creating a percentage promotion with a cap and one without, then confirming the cap is enforced only on the promotion that has one.

**Acceptance Scenarios**:

1. **Given** a percentage promotion with no cap set, **When** it is applied to a cart of any size, **Then** the full uncapped percentage discount is applied.
2. **Given** a percentage promotion with a cap set, **When** the calculated percentage discount would exceed the cap, **Then** the applied discount is limited to the cap amount.

---

### Edge Cases

- What happens when an admin enters a percentage of 0, a negative number, or over 100? The system rejects the value with a clear validation message, the same way an invalid flat amount is rejected today.
- What happens when a percentage promotion (automatic or promo code) is deactivated? It stops being offered or accepted immediately, identical to existing promotion types.
- What happens when a percentage discount calculation produces a fractional cent (e.g. 15% of $10.03)? The result is rounded to the nearest whole cent before being applied.
- What happens if an admin tries to set a cap on a promotion that isn't percentage-based? The cap field is only meaningful for percentage promotions and is ignored/hidden for other types, matching how type-specific fields already behave (e.g. a promo code field only appearing for the promo-code type).
- What happens when a percentage promo code is combined with an automatic promotion? Only one promotion ever applies to an order, exactly as today — a percentage promotion does not change this "never stacked" rule.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an admin to configure a promotion whose discount is calculated as a percentage of the cart subtotal, rather than only a fixed cents amount.
- **FR-002**: The system MUST support a percentage-based discount both as a standalone automatic (no-code) promotion and as the discount mechanic behind a promo code, matching the two existing ways flat-amount discounts already work.
- **FR-003**: The system MUST reject a percentage value that is not greater than 0 or exceeds 100, with a clear, field-specific validation message.
- **FR-004**: The system MUST allow an admin to optionally set a maximum discount amount (in currency) on any percentage-based promotion; this cap is optional per-promotion, not required.
- **FR-005**: When a maximum discount cap is set on a percentage promotion, the system MUST never apply a discount greater than that cap, regardless of cart subtotal.
- **FR-006**: When no cap is set on a percentage promotion, the system MUST apply the full calculated percentage with no upper limit.
- **FR-007**: Percentage-based promotions MUST support the same optional active-date-window (start/end) behavior already available to every other promotion type.
- **FR-008**: Percentage-based promotions MUST support the same active/inactive toggle already available to every other promotion type, with identical effect (an inactive promotion is never offered or accepted).
- **FR-009**: When more than one automatic (no-code) promotion is active and applicable to a cart, the system MUST select the single highest-value promotion for that cart, and this comparison MUST correctly account for percentage-based promotions alongside flat-amount ones.
- **FR-010**: At most one promotion (of any type, including percentage) MUST ever apply to a single order — this feature MUST NOT introduce a way to stack multiple promotions.
- **FR-011**: All pre-existing promotion types (flat amount, buy-one-get-one, promo-code flat amount, cart-amount threshold, free shipping) MUST continue to behave exactly as they do today; this feature is additive only.
- **FR-012**: The percentage discount calculation MUST be performed server-side, from the canonical cart subtotal, using the same trust boundary already required of every other discount calculation — never a client-submitted amount.
- **FR-013**: The admin discounts management view MUST clearly display a percentage promotion's rate (and its cap, when one is set) in a way distinguishable from a flat-amount promotion's dollar value.
- **FR-014**: The cart-amount-threshold promotion type is explicitly out of scope for this feature and MUST remain flat-amount-only; percentage is added as an independent calculation mode, not merged into the threshold type.

### Key Entities

- **Promotion** (existing entity, extended): gains a percentage rate and an optional maximum-discount cap, both meaningful only when the promotion's discount is calculated as a percentage rather than a flat amount. All of the entity's existing attributes (active flag, start/end date window, optional promo code) apply to a percentage promotion exactly as they do to every other type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The business owner can create a working percentage-off promotion (automatic or promo code) from the admin discounts page in under one minute.
- **SC-002**: A customer applying a valid percentage promo code sees a checkout discount that exactly matches the configured percentage of their subtotal, correctly limited by the cap when one is configured.
- **SC-003**: Every pre-existing discount scenario (flat amount, BOGO, cart threshold, free shipping, flat-amount promo code) produces an identical checkout total after this change as it did before — zero regression.
- **SC-004**: When multiple automatic promotions of mixed type (flat and percentage) are active at once, the customer always receives whichever single promotion is worth more to them, with no manual intervention needed.

## Assumptions

- The percentage discount is calculated against the cart subtotal before tax and shipping are added, identical to how the existing flat-amount discount is calculated today.
- A percentage promo code may optionally use the same minimum-cart-subtotal threshold field the existing flat-amount promo code already supports — this is a reuse of an existing field, not a new capability.
- Fractional-cent results from a percentage calculation are rounded to the nearest whole cent using standard rounding.
- No product- or category-level scoping is introduced for percentage discounts, consistent with the fact that no other promotion type has this scoping today either.
- No redemption-count or per-customer usage-limit tracking is introduced by this feature; that remains explicitly deferred, as it already was for every other promotion type.
- "Up to 100" for the percentage range means a promotion can discount an order down to (but not below) $0 — a 100% discount is permitted, consistent with treating percentage as a genuine alternative to a flat amount that could already equal the full subtotal.
