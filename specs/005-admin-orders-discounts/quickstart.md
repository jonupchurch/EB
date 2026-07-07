# Quickstart: Admin: Orders, Discounts, Shipping & Fees

Validation guide for this feature once implemented. See
`contracts/actions.md` for the action interfaces, `data-model.md` for
the schema, and `spec.md` for the requirements each scenario traces
to.

## Prerequisites

- `npm install`
- `.env.local` filled in per `.env.example` (unchanged by this
  feature — no new provider, no new env var)
- Signed in as one of feature 1's two allow-listed Google accounts
- At least one real order (feature 3, using its fake PayPal provider
  in dev/test) to manage

## Automated checks

```sh
npm run typecheck
npm run lint
npm run test        # Vitest: order-status transitions, promotion CRUD
npm run test:e2e    # Playwright: admin orders, admin discounts, full-vertical-slice
```

All four MUST pass (Constitution Principle V).

## Manual validation scenarios

1. **Order queue (US1, FR-001)**: sign in as admin, open `/admin/orders`. Confirm every order is listed with customer name, item count, total, status, and placed date, most recent first.
2. **Order detail (US1, FR-002)**: open an order. Confirm every line item, the shipping address, the full breakdown, and the payment status show correctly, with no editable field for any of it.
3. **Advance status (US1, FR-003)**: on a `paid` order, mark it "in production." Confirm the status updates, and that order's confirmation page (feature 4) reflects the new stage.
4. **Advance again (US1, FR-003)**: on that same order, mark it "shipped." Confirm the status updates.
5. **Reject a skip (US1, FR-004)**: on a fresh `placed` (not yet paid) order, attempt to mark it "in production" or "shipped." Confirm both are rejected with a clear reason.
6. **Reject a reverse (US1, FR-004)**: on a `shipped` order, attempt to move it back a stage. Confirm it's rejected.
7. **Paid stays webhook-only (US1, FR-005)**: confirm there is no admin control anywhere that can set an order's status to `paid` directly.
8. **Create a promotion (US2, FR-006)**: create one promotion of each of the five types. Confirm each saves and immediately applies at checkout per its type's rule.
9. **Edit a promotion (US2, FR-007)**: edit an existing promotion's validity window. Confirm the change takes effect on the next checkout evaluated.
10. **Deactivate/delete safety (US2, FR-009)**: apply a promotion to a real order, then deactivate it, then delete it. Confirm that order's recorded discount is completely unchanged both times.
11. **Duplicate code rejected (US2, FR-010)**: attempt to create a second active promo-code promotion reusing an existing code (including different casing). Confirm it's rejected.
12. **Set the flat rate (US3, FR-011)**: set the flat-rate shipping amount. Confirm a checkout selecting flat-rate shipping reflects the new amount.
13. **Safe default (US3, FR-012)**: with the flat-rate setting never configured (fresh database), confirm checkout still completes with a safe, non-zero flat-rate amount rather than erroring.

## Privacy/security check

14. Confirm every screen and action in this feature is unreachable without signing in as one of the two allow-listed Google accounts (FR-013) — the same gate as feature 1.
