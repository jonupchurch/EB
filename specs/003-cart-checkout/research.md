# Research: Cart & Checkout

Phase 0 output for `specs/003-cart-checkout/plan.md`. No
`[NEEDS CLARIFICATION]` markers remained in the Technical Context. The
decisions below are specific to this feature — several of them close
long-open constitution follow-ups that could no longer be deferred
once checkout actually needed a real answer.

## Cart architecture: client-held reference, not a server table

- **Decision**: the cart is a small reference held in a first-party
  cookie — an array of `{ productId, selectedOptionIds, quantity }`.
  No `carts`/`cart_items` table exists. Every time the cart is viewed
  or checkout proceeds, the server re-fetches each referenced product
  fresh and recomputes pricing via `src/lib/pricing.ts` (feature 1's
  shared function) — the cookie never carries a price.
- **Rationale**: there's no customer account system anywhere in this
  project (spec.md's own framing), so a cart is inherently anonymous,
  ephemeral, pre-purchase state — exactly the case a lightweight
  client-held reference fits, and it avoids a table whose only job
  would be holding data that gets thrown away or superseded by an
  Order the moment checkout succeeds. Because the cookie is never
  trusted for price (Principle II, extended from features 1–2), an
  end user editing it can only ever ask the server "price this
  combination for me" — never claim a price directly.
- **Alternatives considered**: a server-persisted `carts` table keyed
  by a session ID — a legitimate pattern, especially useful for
  cross-device recovery or abandoned-cart analytics. Rejected for MVP:
  neither of those needs exists yet (no accounts, no marketing/analytics
  scope in this feature), and it would add a table and its lifecycle
  (expiry/cleanup of abandoned carts) for no immediate benefit at this
  business's scale.
- **This is a real, project-visible tradeoff** — `docs/adr/0011-client-side-cart-reference.md`
  MUST be authored during `/speckit-tasks`/implementation.

## Tax provider: TaxJar

- **Decision**: TaxJar, via its official `taxjar` Node client.
- **Rationale**: this closes the constitution's long-open "choose a
  tax-calculation API provider" follow-up. Ohio's Cuyahoga County adds
  its own county and RTA (transit authority) rate on top of the state
  rate, so a flat or hand-rolled rate table isn't safe even for
  in-state orders (established during the constitution's drafting).
  TaxJar directly supports address-level, destination-based
  calculation without requiring this project to maintain rate tables
  itself.
- **Alternatives considered**: Avalara — a legitimate competitor, but
  positioned toward larger/more complex multi-entity businesses;
  TaxJar's simpler, small-business-oriented API and pricing is a
  better fit for a single-owner shop. Hand-rolled Ohio rate logic —
  rejected outright; the constitution's own drafting already ruled
  this out as unsafe.
- **This is a real, project-visible tradeoff** — `docs/adr/0012-taxjar-for-sales-tax.md`
  MUST be authored during `/speckit-tasks`/implementation.

## Shipping provider: Shippo

- **Decision**: Shippo, via its official `shippo` Node client, for
  calculated/carrier-rate shipping — using the product weight/
  dimensions feature 1 now captures (FR-017). A flat-rate option
  remains available alongside it (spec.md FR-005).
- **Rationale**: this closes the constitution's other long-open
  shipping-provider follow-up. Shippo is aimed squarely at small/
  independent sellers — simple onboarding, pay-as-you-go, no minimum
  volume — a better match for this business's scale than a
  higher-commitment enterprise integration.
- **Alternatives considered**: EasyPost — a comparable multi-carrier
  rate API with similar coverage and pricing; a reasonable alternative
  with no clear technical advantage over Shippo at this scale. The
  choice came down to Shippo's small-business-first positioning.
  Flat-rate-only (deferring calculated rates) — rejected; the
  constitution already committed to calculated/carrier-rate shipping
  for MVP, and feature 1 was already amended (FR-017) specifically to
  support it.
- **Switching cost if this ever needs to change**: contained. The
  Shippo-specific request/response handling lives entirely inside
  `src/lib/checkout/shipping.ts`, behind a plain
  `getShippingRates(weight, dimensions, destination)` interface —
  nothing else in the app calls Shippo directly. Only a rate's amount
  and carrier/service name are ever persisted on an Order (both
  provider-agnostic), so switching providers later means rewriting
  this one module's internals and its API key, not touching checkout,
  cart, or order code.
- **This is a real, project-visible tradeoff** — `docs/adr/0013-shippo-for-carrier-shipping-rates.md`
  MUST be authored during `/speckit-tasks`/implementation.

## PayPal integration: direct REST calls, no SDK

- **Decision**: call PayPal's Orders v2 API (create, capture) and
  Webhooks API (signature verification) directly via `fetch` —
  no `@paypal/checkout-server-sdk` or similar package.
- **Rationale**: the actual surface needed is small (create an order
  with a server-computed total, capture on approval, verify one
  webhook event type) and PayPal's REST API for this is well
  documented and stable. Calling it directly keeps webhook signature
  verification fully transparent and inspectable — important given
  Principle II's requirement that no order is ever marked paid without
  it — rather than trusting an SDK's internal handling of exactly that
  step.
- **Alternatives considered**: the official Node SDK — reduces some
  boilerplate, but adds a dependency for a small, stable API surface
  this project can call directly with equal clarity and less
  indirection around the one step (webhook verification) that matters
  most for correctness.
- **This is a real, project-visible tradeoff** — `docs/adr/0014-paypal-direct-rest-integration.md`
  MUST be authored during `/speckit-tasks`/implementation.

## Promotions: one flexible table, not one-table-per-type

- **Decision**: a single `promotions` table covering all five types
  (flat amount, BOGO, promo code, cart-threshold, free shipping/
  processing) with nullable, type-specific columns — not six separate
  tables the way feature 1's product options are split.
- **Rationale**: unlike feature 1's option categories (which have
  genuinely divergent, actively-queried fields per type — a material's
  model number has no equivalent on a color), these five promotion
  types share more structure (a condition, an effect, an active
  window) and the admin UI to manage them doesn't exist yet (feature
  5) — its real shape isn't validated by any actual usage yet. A
  single reasonably-typed table is proportionate for what this feature
  actually needs (applying an already-seeded promotion), without
  over-committing to a schema feature 5 might need to revisit anyway.
- **Alternatives considered**: one table per type, mirroring feature
  1's pattern — rejected for now as premature structure around an
  admin experience that doesn't exist yet; six tables' worth of
  migration churn isn't justified until feature 5 clarifies real
  admin requirements.

## Order line items: a frozen JSON snapshot, deliberately

- **Decision**: `order_items` stores each purchased configuration as a
  denormalized snapshot — product name, unit price, quantity, line
  total, and the selected options (label + price adjustment each) as a
  JSON column — not as foreign keys back into feature 1's live option
  tables.
- **Rationale**: this is the one deliberate exception to this
  project's general preference for typed relational tables over JSON
  (ADR-0002, ADR-0007). That preference exists for *live, actively
  queried* data, where relational structure and type-level validation
  earn their keep. An order line item is the opposite: a historical
  record of what was actually charged at a specific moment, which must
  remain accurate even if the underlying product, option, or price is
  later renamed, changed, or removed. Snapshotting as JSON at write
  time (Principle II: computed and validated server-side, never
  client-submitted) captures exactly what happened without ever
  needing to query back into option tables that may no longer reflect
  it.
- **Alternatives considered**: FK references to feature 1's live
  option rows — rejected; a changed or deleted option would silently
  rewrite history, which is precisely wrong for a financial record.

## Promotion resolution rule

- **Decision**: at most one promotion ever applies to an order (per
  spec.md's Assumptions). If the customer enters a valid, applicable
  promo code, that promotion applies. Otherwise, if exactly one
  active, code-less (automatic) promotion exists and qualifies (e.g.,
  a cart-threshold discount), it applies automatically. If more than
  one automatic promotion would qualify, the one with the greatest
  discount to the customer applies — never stacked, never an
  arbitrary/unstated tie-break.
- **Rationale**: simple, predictable, and matches the constitution's
  already-decided "at most one promotion" scope. Given feature 5 (the
  admin UI to create promotions) doesn't exist yet, real-world
  collisions between multiple active automatic promotions are
  unlikely at launch — but the rule needs to be defined now regardless
  of how often it's actually exercised.

## Testing external integrations: this project's fake-provider pattern

- **Decision**: PayPal, TaxJar, and Shippo each get one deterministic
  fake implementation behind their respective `src/lib/checkout/*.ts`
  interface, used in Vitest and Playwright — real credentials are
  never exercised in automated tests.
- **Rationale**: this is the exact scenario this project's established
  testing convention exists for — one deterministic fake per external
  paid/nondeterministic dependency, so tests are reliable and free,
  and so CI never depends on three different vendors' sandboxes being
  up and correctly configured.

## Reused infrastructure (not re-decided)

- **Database, ORM**: unchanged from ADR-0001/0002/0008.
- **Pricing calculation**: unchanged from feature 1's `src/lib/pricing.ts`
  — this feature composes it per line item, never reimplements it.
- **Payment provider choice**: unchanged from ADR-0005 — PayPal for
  MVP, Stripe a deferred fast-follow. This feature only decides *how*
  to integrate with PayPal (direct REST), not *whether*.
- **Accessibility bar**: unchanged from Principle III as amended.

## Architecture Decision Records

- `docs/adr/0011-client-side-cart-reference.md` (new, per "Cart
  architecture" above)
- `docs/adr/0012-taxjar-for-sales-tax.md` (new, per "Tax provider"
  above)
- `docs/adr/0013-shippo-for-carrier-shipping-rates.md` (new, per
  "Shipping provider" above)
- `docs/adr/0014-paypal-direct-rest-integration.md` (new, per "PayPal
  integration" above)
- `docs/adr/0007-product-options-schema.md` and
  `docs/adr/0010-catalog-rendering-strategy.md` remain owed from
  features 1 and 2 respectively — unrelated to this feature, not
  re-litigated here.
