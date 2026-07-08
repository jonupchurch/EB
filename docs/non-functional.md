# Non-Functional Requirements & Budgets

The feature specs say *what* the site does; this says *how well* it has
to do it. These budgets apply across the whole site, not to any single
feature, which is why they live here rather than being repeated — or
drifting — across specs. Architectural decisions that implement these
budgets get their own ADRs under `docs/adr/` once `/speckit-plan` reaches
the feature that needs them; this doc records the target, the ADRs
record the how.

Figures below are placeholders until the constitution is ratified and
the first features are planned — each is marked TBD where it depends on
a decision not yet made (payment provider, whether an AI feature exists,
etc.).

## Performance

| Metric | Target |
|---|---|
| Largest Contentful Paint (product/catalog pages) | < 2.5s (Core Web Vitals "Good" threshold) |
| Checkout step transition | TBD |
| Interaction responsiveness | no blocking main-thread work > 50ms |

## Cost

- The tax-calculation API and (if used) a calculated/carrier-rate
  shipping API are both paid external calls in scope for the MVP now —
  log usage/cost per request the same way any other paid dependency is
  metered, same discipline as an AI-assisted feature would need if one
  is ever added.

## Limits & abuse

| Guard | Default | Why |
|---|---|---|
| Rate limit (checkout/order endpoints) | TBD | abuse control, especially pre-auth if accounts are optional |
| Promo code attempts per session | TBD | prevent brute-forcing discount codes |

Upload-size/file-type limits for custom-design uploads aren't listed
here yet — that's the fast-follow product-customizer feature (out of
MVP scope per Constitution Principle IV), and belongs here once it's
actually being planned.

Over-limit input gets a clear, actionable error — never a silent
truncation or a stuck cart.

## Accessibility

- **Target**, not a compliance gate (Constitution Principle III) — this
  is a small business's storefront, not one under the kind of
  compliance exposure that would make WCAG a legal requirement here.
  WCAG 2.1 AA contrast, keyboard operability, visible focus states, and
  semantic landmarks/roles are all things to aim for and close on; a
  close miss doesn't block a merge.
- `prefers-reduced-motion` respected for any animated states (product
  customizer, cart transitions).
- Automated axe checks SHOULD run in CI to surface issues, but findings
  are prioritized by real impact (can a customer actually complete an
  order?) rather than treated as an all-or-nothing gate.

## Payments & compliance

- **PayPal** for MVP ([ADR-0005](adr/0005-paypal-for-mvp-payments.md))
  — Stripe deferred to a fast-follow integration. PCI scope should be
  minimized by using PayPal's hosted/embedded checkout rather than
  handling raw card data directly.

## Promotions, tax & shipping

- Promotions/discounts are in MVP scope: a flat promotional discount,
  BOGO, promo codes, a cart-amount-threshold discount, and optional
  free shipping/processing — all configurable from the admin queue.
- Sales tax is computed via a tax-calculation API (provider TBD, ADR
  owed) — never hand-rolled tax-rate logic or a flat guessed rate.
- Shipping supports both a flat rate and a calculated/carrier-rate
  option (provider TBD if the latter is used, ADR owed).
- All of the above MUST degrade to a clear error at checkout if the
  tax/shipping API is unavailable — never a silent $0 tax or a stuck
  cart.

## Reliability & observability

- Every checkout/order-state transition MUST degrade to a clear,
  user-visible error rather than a silent failure or a lost order.
- Structured logs: request id, phase, latency, outcome — no full
  payment card data, ever (provider tokens/references only).

## Compatibility

- Latest 2 versions of evergreen browsers.
- Responsive down to 360px width (customers will be shopping on phones).
