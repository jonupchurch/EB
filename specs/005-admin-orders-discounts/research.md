# Research: Admin: Orders, Discounts, Shipping & Fees

Phase 0 output for `specs/005-admin-orders-discounts/plan.md`. No
`[NEEDS CLARIFICATION]` markers remained in the Technical Context. This
feature introduces no new external integration — every decision below
is about how to structure what's genuinely new (the state machine, the
shop setting) or how to safely extend already-decided schema.

## Order status: an explicit allowed-transition map, not a free-form field

- **Decision**: `src/lib/admin/order-status.ts` holds a small map of
  which `status` values may follow which (`paid` → `in production`,
  `in production` → `shipped`) and a single `advanceOrderStatus`
  function that checks the order's current status against that map
  before writing — any other requested transition (skip, reverse, or
  setting `paid` directly) is rejected with a specific reason.
- **Rationale**: this is a direct implementation of Principle II's own
  requirement — "Order state ... MUST be an explicit, validated state
  machine — never inferred ad hoc from scattered booleans." A single
  source of truth for legal transitions, checked server-side on every
  attempt, is what makes FR-003/FR-004/FR-005 actually enforceable
  rather than merely documented.
- **Alternatives considered**: validating inline wherever status is
  written — rejected, since it invites the exact "scattered booleans"
  pattern Principle II warns against; a full workflow/state-machine
  library — rejected as unjustified weight for four states and two
  legal transitions.

## Shop settings: a single-row table, not a generic key-value store

- **Decision**: `shop_settings` is a table with exactly one row
  (a fixed `id`), holding `flatRateShippingCents` (nullable integer)
  and `updatedAt`. Reading it always means reading that one row;
  writing it always means updating that one row.
- **Rationale**: this project prefers typed relational structure over
  generic key-value/EAV storage for live, actively-queried data
  (ADR-0002, ADR-0007's reasoning, feature 3's promotions-table
  decision). Right now there is exactly one shop-wide setting. A
  generic `settings(key, value)` table would be premature structure
  for a single value with no near-term second setting in view — if a
  second genuinely distinct setting appears later, revisiting this
  table's shape then costs nothing more than adding a column does now.
- **Alternatives considered**: a generic key-value settings table —
  rejected for the same reason feature 3 rejected six promotion tables
  in the other direction: matching structure to actual, current needs,
  not anticipated ones. An environment variable — rejected; FR-011
  requires the admin to change this without a deployment (SC-005).

## Cross-feature amendment: feature 3's `orders`/`promotions` schema

- **Decision**: while planning this feature, amended feature 3's
  (not-yet-implemented) `data-model.md` and `tasks.md` directly: (1)
  `orders.status`'s enum now includes `in production`/`shipped` from
  the start — this feature is the first to ever set them, but defining
  all four values up front avoids a later `ALTER TYPE` migration; (2)
  `orders.promotionId`'s foreign key now explicitly specifies
  `ON DELETE SET NULL` — the schema-level guarantee behind FR-009 (a
  deleted promotion never blocks or cascades into deleting order
  history; the order's own `discountCents` was already the frozen,
  actually-charged amount regardless of whether the promotion row
  still exists).
- **Rationale**: both changes are zero-cost right now — feature 3 has
  no implemented schema or migration yet — and each closes a gap that
  would otherwise require a real migration once orders already exist.
  This mirrors the exact pattern already used for feature 4's
  `confirmationToken`/`confirmationEmailSentAt` columns.
- **Alternatives considered**: leaving feature 3's schema as originally
  planned and handling both concerns entirely in this feature's own
  migration (`ALTER TYPE ... ADD VALUE`, `ALTER TABLE ... DROP
  CONSTRAINT ... ADD CONSTRAINT ... ON DELETE SET NULL`) — technically
  possible, but strictly more migration churn for zero benefit, since
  feature 3 isn't implemented yet.

## The full-vertical-slice Playwright test: finally completable

- **Decision**: this feature's Polish phase adds
  `e2e/full-vertical-slice.spec.ts` — the single happy-path end-to-end
  test Constitution Principle V has required since ratification
  ("browse → cart → checkout → confirmation → order visible in the
  admin queue"), but which no earlier feature could complete, since
  the admin order queue this test's final step depends on didn't exist
  until now.
- **Rationale**: closes a real, standing constitutional obligation
  rather than leaving it implicitly assigned to "whichever feature
  finishes last." This is additive to (not a replacement for) each
  feature's own scoped e2e spec, which covers that feature's specific
  edge cases (e.g., feature 4's not-found/still-confirming states) that
  a pure happy-path test intentionally doesn't exercise.
- **Alternatives considered**: leaving this requirement unassigned and
  hoping a future pass adds it — rejected; Principle I requires the
  spec/plan/tasks to stay genuinely in sync with a real, standing
  requirement, not silently defer it.

## Reused infrastructure (not re-decided)

- **Database, ORM**: unchanged from ADR-0001/0002/0008.
- **Admin auth gate & rate limiter**: unchanged from feature 1
  (`src/auth.ts`'s allow-list, `src/lib/admin/rate-limit.ts`) — every
  mutation in this feature reuses both directly, no new mechanism.
- **Promotion resolution/application logic**: unchanged from feature 3
  (`src/lib/checkout/promotions.ts`) — this feature only creates/edits/
  deletes rows in the table that logic already reads.
- **Accessibility bar**: unchanged from Principle III as amended.

## Architecture Decision Records

- None owed by this feature. Every technology and architectural pattern
  used here (database, Auth.js, admin rate limiter, typed relational
  schema preference) was already decided and ADR'd by features 1
  and 3 — this feature composes existing decisions rather than making
  a new one.
