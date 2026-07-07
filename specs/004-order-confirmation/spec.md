# Feature Specification: Order Confirmation

**Feature Branch**: `004-order-confirmation`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Order confirmation: what a customer sees and receives immediately after completing payment via feature 3's checkout, replacing the minimal placeholder acknowledgment feature 3 built as a stand-in. The customer needs a real confirmation page (line items, shipping address, full price breakdown, an order/confirmation identifier) with a visual order-status timeline (placed, paid, upcoming stages shown as not-yet-reached) that handles a still-verifying payment gracefully and resolves on its own once verification completes, with a fallback message if verification takes unusually long; a confirmation email sent once (and only once) the order is verified paid, via a real transactional email provider (Resend), containing the same information as the page; and the confirmation page must be fully reachable and accurate on its own (bookmark, or the emailed link), re-fetching everything fresh, with an unguessable URL since no customer account system exists to otherwise protect it. Edge cases: a confirmation URL for a nonexistent order (not found, never partial data), the email failing to send (the page must keep working regardless), repeated visits/refreshes (never resend the email or duplicate anything), and payment verification that never completes (must eventually surface as needing attention, not spin forever). Out of scope: admin order management, fulfillment status changes beyond what's already reachable, refunds/cancellation, editing a placed order, SMS notifications, and email-resend support tooling."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See an accurate confirmation immediately after paying (Priority: P1)

As a customer, I want to see a clear confirmation page right after I complete payment, showing exactly what I bought, what I'll pay, where it's going, and my order's current status, so I know my purchase went through and what happens next.

**Why this priority**: This is the moment of reassurance right after paying real money — without it, a customer has no way to know their purchase actually succeeded.

**Independent Test**: Complete a checkout (feature 3) and confirm the resulting confirmation page shows accurate line items, shipping address, price breakdown, an order identifier, and a status timeline — independent of the email or a later revisit.

**Acceptance Scenarios**:

1. **Given** a customer has just completed payment and their order is already verified paid, **When** they land on the confirmation page, **Then** it shows every purchased line item (name, configuration, quantity, price), the shipping address, a complete price breakdown (subtotal, discount, shipping, tax, total), an order/confirmation identifier, and a timeline showing "placed" and "paid" as reached.
2. **Given** a customer lands on the confirmation page before payment verification has completed, **When** the page loads, **Then** it shows a clear "confirming your payment" state — never incomplete or incorrect order details — and updates to the paid state on its own once verification completes shortly after.
3. **Given** payment verification is taking unusually long, **When** the customer is still waiting on the confirmation page, **Then** it eventually shows a clear message that something may need attention, rather than appearing to hang indefinitely.
4. **Given** a URL for an order that doesn't exist, **When** anyone visits it, **Then** the page shows "not found" — never partial or placeholder order data.

---

### User Story 2 - Receive a confirmation email (Priority: P2)

As a customer, I want a confirmation email once my payment is verified, so I have a durable record of my purchase even after I close the browser tab.

**Why this priority**: Without any customer account system, the email (and the link within it) is the customer's only lasting record of their order — important, but secondary to the immediate on-screen confirmation.

**Independent Test**: Complete a checkout through to a verified-paid order and confirm exactly one confirmation email arrives, containing the same order details as the confirmation page — independent of whether the customer ever revisits the page itself.

**Acceptance Scenarios**:

1. **Given** an order has just been verified paid, **When** the system processes that, **Then** a confirmation email is sent to the customer containing the same line items, shipping address, price breakdown, and order identifier shown on the confirmation page.
2. **Given** an order is not yet verified paid, **Then** no confirmation email is ever sent for it.
3. **Given** an order has already had its confirmation email sent, **When** anything (including a webhook redelivery) processes that same order again, **Then** the email is never sent a second time.
4. **Given** the email provider fails to send the email, **When** that happens, **Then** the confirmation page itself is entirely unaffected — email is additive, not a dependency of the page working.

---

### User Story 3 - Revisit the confirmation later via a saved link (Priority: P3)

As a customer, I want to reopen my confirmation page later (from a bookmark or the emailed link) and still see accurate, current information, so I can check on my order without needing an account.

**Why this priority**: A real robustness property once the primary flows (US1, US2) work — valuable, but the feature already delivers its core purpose without it being separately exercised.

**Independent Test**: Save a confirmation page's URL, close everything, and reopen it later (potentially after the order's status has changed) — confirm it still shows accurate, current information, fetched fresh rather than relying on anything from the original checkout session.

**Acceptance Scenarios**:

1. **Given** a confirmation page's URL saved from an earlier visit, **When** it's opened again later, **Then** it shows the order's current, accurate state — not a stale snapshot from the original visit.
2. **Given** two different orders' confirmation URLs, **When** one is visited, **Then** it never exposes any detail of the other order.

---

### Edge Cases

- What happens when a confirmation URL doesn't correspond to any real order? It MUST show "not found" — never partial, placeholder, or another order's data.
- What happens when the confirmation email fails to send? The confirmation page MUST continue working normally regardless — the failure MUST be handled without affecting the order or the page.
- What happens when a customer visits or refreshes the confirmation page many times? It MUST never resend the email or duplicate any action as a result.
- What happens when payment verification never completes? The page MUST eventually present a clear "this may need attention" message instead of an indefinite "confirming" state.
- What happens if someone tries to guess or enumerate confirmation URLs to find other customers' orders? It MUST NOT be practically possible — this is a real security requirement, not a cosmetic one, since no account system exists to otherwise gate access.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show a confirmation page immediately after a customer returns from completing payment (feature 3), for the order they just placed.
- **FR-002**: Confirmation page MUST display every purchased line item (name, selected configuration, quantity, price), the shipping address, a complete price breakdown (subtotal, discount, shipping, tax, total), and an order/confirmation identifier.
- **FR-003**: Confirmation page MUST display the order's status via a timeline showing only stages actually reached (placed, and paid once verified) as complete, with later stages (in production, shipped) shown as upcoming/not-yet-reached — never implying a stage happened before it did.
- **FR-004**: If payment verification hasn't completed when the customer arrives, the confirmation page MUST show a clear "confirming payment" state and MUST update to reflect verified payment on its own, without requiring the customer to take any action other than waiting.
- **FR-005**: If payment verification takes unusually long, the confirmation page MUST present a clear message that something may need attention, rather than continuing to show a "confirming" state indefinitely.
- **FR-006**: System MUST send a confirmation email — containing the same order details as the confirmation page — once, and only once, an order is verified paid.
- **FR-007**: System MUST NOT send a confirmation email for an order that isn't verified paid.
- **FR-008**: System MUST NOT send more than one confirmation email for the same order, regardless of how many times the underlying paid-order event is processed.
- **FR-009**: A confirmation-email delivery failure MUST NOT affect the confirmation page's own correctness or availability.
- **FR-010**: Confirmation page MUST be fully reachable and accurate independent of the checkout session that created it — from a bookmark or the emailed link — re-fetching all data fresh rather than depending on anything carried over from checkout.
- **FR-011**: A request for a nonexistent order's confirmation page MUST show "not found," never partial or placeholder order data.
- **FR-012**: The confirmation page's URL MUST NOT be a small, sequential, or otherwise practically guessable identifier — it is the only thing protecting one customer's order details from another's request, since no customer account system exists.

### Key Entities *(include if feature involves data)*

This feature introduces no new core entity — it reads and displays feature 3's `Order`/`Order Line Item` data. It adds one small piece of state to track: whether an order's confirmation email has already been sent, so FR-008's exactly-once guarantee holds regardless of how many times a paid-order event is processed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer sees accurate, complete confirmation details within moments of completing payment, under normal (non-delayed-webhook) conditions.
- **SC-002**: 100% of confirmation emails are sent only after an order is verified paid, and exactly once per order — never zero times for a paid order, never more than once.
- **SC-003**: 0% of requests to any confirmation URL ever expose a different order's details.
- **SC-004**: 100% of confirmation page visits — whether immediately after payment or via a saved link days later — reflect the order's actual current state, never a stale or carried-over value.

## Assumptions

- Feature 3 (cart & checkout) is implemented and produces real `placed`/`paid` orders before this feature is meaningfully testable — this feature is a read (plus one send-once email action) layer on top of that data, not a new source of order truth.
- Resend is the transactional email provider — a real integration, not a hand-rolled SMTP client — consistent with this project's general preference for using established providers for well-defined external services (e.g., ADR-0009's Vercel Blob decision, ADR-0012's TaxJar decision).
- No customer account system exists anywhere in this project (unchanged from features 1–3) — this feature's only access control is the confirmation URL's own unguessability.
- The order-status timeline may visually depict "in production" and "shipped" as future stages for context, but this feature does not drive those transitions — that remains a separate, later admin feature's responsibility.
- Resending a confirmation email on customer request (e.g., "I didn't get my email") is a manual support action outside this feature's scope, not a self-service tool built here.
