# Quickstart: Percentage-Off Discounts

Validation guide for this feature once implemented. See
`contracts/actions.md` for the action interface changes, `data-model.md`
for the schema, and `spec.md` for the requirements each scenario traces
to.

## Prerequisites

- `npm install`
- `.env.local` filled in per `.env.example` (unchanged by this feature —
  no new provider, no new env var)
- Signed in as one of feature 1's two allow-listed Google accounts
- The new migration applied (local dev: `npm run db:migrate`;
  Production: via the existing `/api/admin/migrate` endpoint, same as
  every prior feature)
- At least one existing `flat`-type or `promo_code`-type promotion, to
  confirm this feature changes nothing about it

## Automated checks

```sh
npm run typecheck
npm run lint
npm run test        # Vitest: percentage math, cap enforcement, validation
npm run test:e2e    # Playwright: admin discounts (extended)
```

All four MUST pass (Constitution Principle V).

## Manual validation scenarios

1. **Percentage promo code, uncapped (US1, FR-001–FR-003)**: create a promo code, value mode "Percentage," 15%, no cap. Enter it at checkout against a known $100.00 subtotal. Confirm the discount is exactly $15.00.
2. **Percentage promo code, capped (US1, FR-004–FR-005)**: create a promo code, 20% off, $25.00 max discount. Enter it at checkout against a $200.00 subtotal. Confirm the discount is capped at $25.00, not $40.00.
3. **Percentage promo code, no cap set (US3, FR-006)**: create a promo code, 20% off, no cap. Enter it against a $200.00 subtotal. Confirm the full $40.00 discount applies with no ceiling.
4. **Invalid percentage rejected (FR-003, edge cases)**: attempt to save a percentage promotion with 0%, a negative value, or 101%. Confirm each is rejected with a clear field error.
5. **Active window honored (US1, FR-007)**: create a percentage promo code with an `endsAt` in the past. Confirm it's rejected at checkout the same way an expired flat promo code already is.
6. **Active/inactive toggle (US1/US2, FR-008)**: deactivate a percentage promotion. Confirm it's immediately no longer offered (automatic) or accepted (promo code).
7. **Automatic percentage promotion (US2, FR-001–FR-002)**: create an automatic (no-code) percentage promotion, e.g. 10% off. Check out with no code entered. Confirm the 10% discount is applied automatically.
8. **Best-value-wins across mixed types (US2, FR-009)**: activate one automatic flat-$5 promotion and one automatic 10%-off promotion at the same time. Check out with a subtotal where the percentage is worth more (e.g. $80, where 10% = $8 > $5) and confirm the percentage promotion wins; then repeat with a subtotal where flat is worth more (e.g. $30, where 10% = $3 < $5) and confirm flat wins.
9. **Never stacked (FR-010)**: with an automatic percentage promotion active, also enter an unrelated valid promo code at checkout. Confirm only one promotion's discount applies, never both.
10. **No regression on existing types (FR-011, SC-003)**: re-run each of feature 5's original promotion types (flat, BOGO, promo-code flat, cart threshold, free shipping) exactly as `specs/005-admin-orders-discounts/quickstart.md` scenario 8 describes, and confirm each produces the identical checkout total it did before this feature.
11. **Admin list clarity (FR-013)**: open `/admin/discounts` with at least one flat and one percentage promotion. Confirm the list visibly distinguishes a percentage rate (and cap, if set) from a flat dollar amount.
12. **`cart_threshold` unaffected (FR-014)**: confirm the admin form offers no percentage/value-mode option at all when creating or editing a `cart_threshold` promotion.

## Privacy/security check

13. Confirm the discounts screen remains unreachable without signing in as one of the two allow-listed Google accounts — unchanged from feature 5, no new surface introduced.
