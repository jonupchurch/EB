# Contracts: Order Confirmation

Phase 1 output for `specs/004-order-confirmation/plan.md`. This
feature's interface is one public Server Action (used for both the
initial page render and every subsequent poll) plus one internal
function called from feature 3's webhook handler.

## `getOrderConfirmation(token)`

- **Purpose**: power the confirmation page (US1) — both its first
  render and its polling refresh while payment is still confirming.
- **Input**: `{ token }` (the `confirmationToken`, never an internal
  order ID).
- **Output**: `{ items: [...], shippingAddress, subtotalCents, discountCents, shippingCents, taxCents, totalCents, status: "placed" | "paid", confirmationId }` per `data-model.md`'s Confirmation view. `confirmationId` is a customer-facing display identifier (may be the token itself or a short derived value — an implementation choice, not a contract detail).
- **Errors**: `not_found` if `token` doesn't match any order (FR-011) — no other error case exists; there's no auth gate to fail.

## `sendConfirmationEmail(orderId)` (internal — not client-facing)

- **Purpose**: send the one-time confirmation email (US2), called from
  `src/app/api/webhooks/paypal/route.ts` (feature 3) immediately after
  it marks an order paid.
- **Input**: `{ orderId }`.
- **Behavior**: within one operation, checks the order is `status = 'paid'`
  and `confirmationEmailSentAt IS NULL`; if both hold, sends via Resend
  and sets `confirmationEmailSentAt`. If either doesn't hold (not yet
  paid, or already sent), it's a no-op — never an error, never a retry
  loop (FR-006, FR-007, FR-008).
- **Output**: `{ sent: boolean }` — `false` on a no-op, for the
  caller's own logging, not surfaced to any customer-facing flow.
- **Errors**: a Resend delivery failure is caught and logged; it MUST
  NOT propagate back to the webhook handler in a way that could affect
  the order's `paid` status or the confirmation page's own
  correctness (FR-009).

## Shared error shape

```text
{ ok: true, data: ... } | { ok: false, error: "not_found" }
```

No `not_authorized` or `validation_error` — this feature has no auth
gate and accepts no user-submitted data beyond the token itself.
