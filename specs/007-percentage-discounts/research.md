# Research: Percentage-Off Discounts

Phase 0 output for `specs/007-percentage-discounts/plan.md`. No `[NEEDS
CLARIFICATION]` markers remained in the Technical Context. This feature
introduces no new external integration — every decision below is about
how to safely and cleanly extend an already-live schema and calculation.

## An orthogonal `valueMode`, not new `type` enum values

- **Decision**: add a new `promotion_value_mode` enum (`flat` |
  `percentage`) plus `discountPercent`/`maxDiscountCents` columns to the
  existing `promotions` table, rather than adding `percentage` and
  `percentage_promo_code` values to the existing `promotion_type` enum
  (`flat` | `bogo` | `promo_code` | `cart_threshold` | `free_shipping`).
  `type` continues to mean "what mechanic triggers this promotion"
  (automatic vs. promo-code vs. BOGO vs. threshold vs. free shipping);
  `valueMode` is a new, independent dimension meaning "how is the
  discount amount computed," applicable only to the two types that have
  a computed dollar value (`flat`, `promo_code`).
- **Rationale**: this is exactly how the feature was described — "purely
  adding 'percentage' as a value-calculation mode alongside the existing
  'flat' one" (spec.md's own framing). It also sidesteps a real
  migration-safety question: the existing `promotion_type` enum backs a
  table that already holds live Production rows (unlike every earlier
  cross-feature schema amendment in this project, which always landed
  before the target table was implemented) — leaving that enum
  untouched means the migration is a pure additive `ALTER TABLE ... ADD
  COLUMN` plus a brand-new enum type, with no risk around
  `ALTER TYPE ... ADD VALUE`'s well-known transactional restrictions.
- **Alternatives considered**: adding `percentage`/`percentage_promo_code`
  as new `type` values — rejected: it would double the type surface for
  what is really one orthogonal toggle, and would require an
  `ALTER TYPE ... ADD VALUE` against `promotion_type`. That statement is
  actually safe here (confirmed against `drizzle-orm`'s postgres-js
  migrator, which wraps a whole migration run in one `session.transaction`
  — PostgreSQL 12+, which both Neon and local dev run, permits
  `ALTER TYPE ... ADD VALUE` inside a transaction as long as the new
  value isn't referenced within that same transaction, which it wouldn't
  be here), but it's still unnecessary complexity once the orthogonal
  field is on the table anyway.

## Percentage stored as a whole-number integer (1–100), not a decimal

- **Decision**: `discountPercent` is a plain integer column, valid range
  1–100 inclusive, meaning whole percentage points only (e.g. `15` for
  15% off) — no fractional percentages (e.g. 12.5%).
- **Rationale**: matches this project's consistent preference for
  integers over floating-point for anything money-adjacent (all prices
  are integer cents, never floats — same discipline `ADR-0007`/the cents
  convention already establishes). The feature description's own example
  ("15% off") and every real-world promo example a small print shop would
  run are whole numbers; fractional percentages aren't a real requirement
  here.
- **Alternatives considered**: a `numeric`/decimal column supporting
  fractional percentages — rejected as unrequested precision that would
  also complicate the rounding rule in `calculateDiscount()` for no real
  business benefit at this scale.

## Rounding: standard round-to-nearest-cent

- **Decision**: `Math.round(subtotalCents * discountPercent / 100)`
  determines the raw discount before the optional cap is applied.
- **Rationale**: standard, unsurprising rounding behavior; matches the
  spec's Assumptions section. No existing calculation in
  `calculateDiscount()` does fractional-cent math today (every other
  type is a stored, already-whole-cents amount), so this is a genuinely
  new but simple piece of arithmetic.
- **Alternatives considered**: always rounding down (favors the
  business) or always rounding up (favors the customer) — rejected;
  standard rounding is the least-surprising default and the spec doesn't
  call out a reason to bias either direction.

## Cap enforcement order: percentage first, then cap, then subtotal

- **Decision**: `calculateDiscount()`'s percentage branch computes the
  raw rounded percentage amount, then clamps it to `maxDiscountCents`
  when set, then (as every other branch already does) clamps the result
  to `subtotalCents` so a discount can never exceed the cart itself.
- **Rationale**: matches FR-005/FR-006 exactly and reuses the existing
  `Math.min(x, subtotalCents)` pattern every other branch already uses
  for its final safety clamp — one consistent shape across all branches.
- **Alternatives considered**: none genuinely competing — the order
  follows directly from the requirements.

## Reused infrastructure (not re-decided)

- **Database, ORM, migration deployment**: unchanged from
  ADR-0001/0002/0008; deployed the same way feature 1/5/6's migrations
  were (via `/api/admin/migrate` against the live Neon database).
- **Best-value-wins automatic-promotion comparison**
  (`resolveApplicablePromotion` in `src/lib/checkout/promotions.ts`):
  unchanged — it already compares `discountCents` generically across
  whatever candidates `calculateDiscount()` returns, so a percentage
  promotion participates in that comparison with zero changes to the
  comparison logic itself (FR-009).
- **Admin auth gate & rate limiter**: unchanged from feature 1.
- **Duplicate-promo-code enforcement**: unchanged — the existing
  case-insensitive unique index on `promoCode` already covers a
  percentage-based promo code identically to a flat one.
- **Accessibility bar**: unchanged from Principle III as amended.

## Architecture Decision Records

- None owed by this feature. It composes existing, already-ADR'd
  decisions (database, ORM, integer-cents/whole-unit convention) rather
  than making a new one.
