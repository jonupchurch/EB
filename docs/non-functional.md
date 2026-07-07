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
| Largest Contentful Paint (product/catalog pages) | TBD |
| Checkout step transition | TBD |
| Interaction responsiveness | no blocking main-thread work > 50ms |

## Cost

- TBD once it's decided whether any feature calls a paid external API
  (e.g. an AI-assisted design feature) — if so, log usage/cost per
  request the same way any other paid dependency is metered.

## Limits & abuse

| Guard | Default | Why |
|---|---|---|
| Max custom design upload size | TBD | bounds storage/cost; needs a decision on image dimensions/DPI required for print quality |
| Accepted upload file types | TBD | print-file quality requirements vs. browser upload convenience |
| Rate limit (checkout/order endpoints) | TBD | abuse control, especially pre-auth if accounts are optional |

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

- TBD: payment provider (e.g. Stripe via Vercel Marketplace) — PCI
  scope should be minimized by using the provider's hosted/embedded
  checkout rather than handling raw card data directly, but this is a
  decision to make explicitly (ADR) once the provider is chosen, not an
  assumption baked in here.

## Reliability & observability

- Every checkout/order-state transition MUST degrade to a clear,
  user-visible error rather than a silent failure or a lost order.
- Structured logs: request id, phase, latency, outcome — no full
  payment card data, ever (provider tokens/references only).

## Compatibility

- Latest 2 versions of evergreen browsers.
- Responsive down to 360px width (customers will be shopping on phones).
