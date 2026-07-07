# Quickstart: Order Confirmation

Validation guide for this feature once implemented. See
`contracts/actions.md` for the action interfaces, `data-model.md` for
the confirmation view shape, and `spec.md` for the requirements each
scenario traces to.

## Prerequisites

- `npm install`
- `.env.local` filled in per `.env.example`: `RESEND_API_KEY`, plus
  everything feature 3 already needs (a paid order can't exist without
  it)
- A completed checkout (feature 3, using its fake PayPal provider in
  dev/test) to produce a real order with a `confirmationToken`

## Automated checks

```sh
npm run typecheck
npm run lint
npm run test        # Vitest: email send-once idempotency
npm run test:e2e    # Playwright: happy path, confirming->paid, not-found
```

All four MUST pass (Constitution Principle V). The e2e suite reuses
feature 3's fake PayPal provider (to control payment timing) and a
fake Resend provider (to assert exactly one email attempt, without
sending real mail).

## Manual validation scenarios

1. **Immediate confirmation (US1, FR-001–FR-002)**: complete a
   checkout where payment verifies quickly. Confirm the resulting page
   shows every line item, the shipping address, the full breakdown,
   and an order identifier.
2. **Status timeline (US1, FR-003)**: on that same page, confirm
   "placed" and "paid" show as reached, and "in production"/"shipped"
   show clearly as upcoming, not reached.
3. **Still-confirming state (US1, FR-004)**: using the fake PayPal
   provider's delayed-webhook mode, land on the confirmation page
   before verification completes. Confirm it shows a clear "confirming
   payment" state, then updates to "paid" on its own within a few
   seconds of the webhook actually arriving — no manual refresh
   needed.
4. **Timeout message (US1, FR-005)**: using the fake provider's
   never-arrives mode, confirm the page eventually (around 60s) shows
   a "this may need attention" message instead of confirming
   indefinitely.
5. **Not found (FR-011, Edge Cases)**: visit a confirmation URL with a
   made-up token. Confirm it shows "not found," never partial data.
6. **One-time email (US2, FR-006–FR-008)**: after an order is verified
   paid, confirm exactly one confirmation email is sent (via the fake
   Resend provider in tests, or a real sandbox address in manual
   testing), containing the same details as the page. Manually
   trigger the webhook handler a second time for the same order (or
   replay the event) and confirm no second email is sent.
7. **Email failure isolation (FR-009, Edge Cases)**: force the fake
   email provider to fail and confirm the confirmation page still
   works normally — the order's `paid` status and the page's own
   correctness are unaffected.
8. **Revisit later (US3, FR-010)**: save a confirmation URL, then
   reload it fresh (e.g., in a different browser/incognito session)
   and confirm it still shows accurate, current data — not anything
   carried over from the original checkout session.
9. **Unguessable URL (FR-012, SC-003)**: confirm the confirmation
   token is not a small sequential value (inspect a few real tokens
   generated in sequence and confirm no discernible pattern), and that
   requesting a different order's actual token never appears on a
   page for the wrong order.

## Privacy/security check

10. Confirm no confirmation page, past or present, ever displays a
    different order's data — test by comparing two real orders' pages
    side by side.
