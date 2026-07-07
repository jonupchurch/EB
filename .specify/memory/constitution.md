<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (initial ratification)
Modified principles: N/A (initial creation)
Added principles:
  - I. Spec-Driven Development & Legible Architecture
  - II. Full-Stack Substance & Trustworthy Commerce
  - III. Designed, Accessible Experience
  - IV. Product Judgment & Scope Discipline
  - V. Test Discipline
  - VI. Legible History
Added sections: Technology Constraints, Development Workflow, Governance
Removed sections: none
Other changes: pre-ratification updates 2026-07-06 — database engine
  decided (PostgreSQL, local instance for now; see
  docs/adr/0001-postgres-persistence.md) and query layer decided
  (Drizzle ORM over Prisma; see docs/adr/0002-drizzle-orm.md), both
  folded into Technology Constraints below. Plan-all-before-implement
  (Development Workflow) confirmed as a firm rule rather than a
  tentative carryover; Principle VI (Legible History) tightened to
  require CHANGELOG.md/status.md updates and a commit+push after every
  unit of work, not just "significant" pushes. 2026-07-07: Principle
  III's accessibility bar softened from a hard CI-blocking gate to a
  target/best-effort goal — WCAG 2.1 AA is still the aim, but this is a
  small business's site, not one under compliance exposure requiring
  it; docs/non-functional.md updated to match. Also 2026-07-07,
  following review of Resources/models/*.md: Principle IV's MVP
  expanded to include promotions/discounts, tax-calculation-API-driven
  sales tax, and calculated/carrier-rate shipping (previously listed as
  out of scope) — the product/customizer decision itself was confirmed
  to stay out of MVP as already written. 2026-07-07, following review
  of Resources/wireframes/Admin Screens.html: accepted ADR-0004
  (darken the muted-gray text token) and ADR-0005 (PayPal for MVP
  payments, Stripe deferred to fast-follow) — Technology Constraints
  updated accordingly; also clarified that the admin product editor's
  processing-type pricing config is MVP scope even though the
  customer-facing custom-design flow itself remains deferred (see
  docs/future-work.md). 2026-07-07, following review of
  Resources/products/Launch Catalog.html (a proposed 22-SKU/5-category
  day-one launch list): confirmed the catalog's "stockable" label is
  fulfillment-only, not customer-facing inventory tracking (Principle
  IV's exclusion stands, clarified in place); flagged the Recipe
  Board's "handwriting-to-engrave" variant as an actual customer photo
  upload, conflicting with the deferred custom-design boundary — see
  docs/future-work.md. 2026-07-07: accepted ADR-0006 (Auth.js for
  Google SSO, over Clerk) — Technology Constraints updated. Still
  v1.0.0 draft, not yet ratified.
Templates requiring updates:
  ⚠ .specify/templates/plan-template.md — verify no hardcoded principle
    names before first /speckit-plan run.
  ⚠ .specify/templates/spec-template.md — verify compatibility.
  ⚠ .specify/templates/tasks-template.md — verify compatibility.
Follow-up TODOs:
  - Choose a hosted/production Postgres provider when deployment is
    actually being set up (docs/adr/0001-postgres-persistence.md).
  - Choose a tax-calculation API provider (e.g. TaxJar, Avalara, or
    PayPal's own tax tools) — ADR owed during the checkout feature's
    planning.
  - Choose a calculated/carrier-rate shipping provider (e.g. Shippo,
    EasyPost) if the flat-rate-only option isn't sufficient for MVP —
    ADR owed during the cart/checkout feature's planning.
  - Scope and plan the Stripe fast-follow integration once PayPal MVP
    checkout is live (docs/adr/0005-paypal-for-mvp-payments.md).
-->

# Printing Website Constitution

## Core Principles

### I. Spec-Driven Development & Legible Architecture (NON-NEGOTIABLE)

The constitution, spec, plan, and tasks are first-class artifacts: they
MUST be committed to the repository (never gitignored) and MUST be kept
genuinely in sync with the code — not written once and abandoned. Every
non-trivial decision with a real tradeoff (data model, payment
integration, order/fulfillment state machine, auth provider, storage
choice, error handling) MUST be captured in a short Architecture
Decision Record (ADR) before or alongside the code that implements it.
The README MUST read as a guided tour: problem → spec excerpt → key
architectural decisions (linking ADRs) → how to run.

Rationale: this is a live tool for a real small business, maintained
solo. A documented process is how a real production system handling
real orders and real money gets extended safely months later, by
someone (possibly future-Jon alone) who no longer remembers today's
context — the repository has to explain itself.

### II. Full-Stack Substance & Trustworthy Commerce

This is a real full-stack e-commerce application, not a static catalog
with a payment link bolted on. It MUST have a proper backend (Route
Handlers / Server Actions), a real persistent data layer (catalog,
cart/order, fulfillment state), and a genuine payment integration — all
server-side. The client is never trusted for a final price: every
checkout MUST be priced and validated server-side from the canonical
catalog, never from a client-submitted total. Payment-provider webhook
events MUST have their signatures verified before any order state
changes as a result. Order state (e.g., placed → paid → in production →
shipped) MUST be an explicit, validated state machine — never inferred
ad hoc from scattered booleans. All data crossing a trust boundary
(API input, webhook payload, admin mutation) MUST be validated against
Zod schemas before use — untrusted input is never trusted raw, the same
discipline a prior project applied to raw LLM output. Checkout and
admin endpoints MUST enforce sensible rate limits / auth checks and
degrade to a clear error rather than a silent failure or a lost order.

If a future feature adds an AI-assisted capability (e.g. a design
assistant — see `docs/future-work.md`), it MUST follow this same
discipline: server-side-only calls behind a small swappable provider
interface, with Zod-validated output before use — exactly as this
principle already requires of every other external integration.

Rationale: architectural depth — not a thin storefront wired directly
to a payment button — is what keeps this trustworthy as real money
starts moving through it. A bug here doesn't just look bad; it loses a
real customer's order or a real payment.

### III. Designed, Accessible Experience

The UI MUST have a distinctive visual identity — not default Tailwind,
not stock component-library defaults — reflecting the wireframes and
design assets produced collaboratively (Claude-assisted design work,
reviewed against the business's actual branding as it's established).
Typography, spacing, and color are deliberate choices. Every state MUST
be designed: empty cart, loading, error, checkout success, and mobile —
customers will be shopping from their phones. The accessibility
**target** is WCAG 2.1 AA — keyboard operability, visible focus,
semantic landmarks/roles, and AA contrast ratios. Automated axe checks
SHOULD run in CI to surface issues, but this is a goal to aim for and
close on, not a legal compliance gate: a close miss (e.g., a contrast
ratio just under 4.5:1) does not block a merge on its own. Judgment
applies — something that would actually leave a real customer unable
to complete an order (no keyboard access to checkout, an unlabeled
form field) gets fixed before a cosmetic near-miss does.

Rationale: this is a small business's storefront, not a project facing
the compliance exposure a larger commercial site would; WCAG AA is a
quality bar worth aiming for because it's good design discipline and
widens who can actually use the site, not because it's a legal
requirement being enforced here. Treating it as a target keeps that
motivation honest instead of dressing it up as a hard gate it doesn't
need to be.

### IV. Product Judgment & Scope Discipline (NON-NEGOTIABLE)

One vertical slice done excellently beats a broad, rough store. The MVP
is: a customer browses a fixed catalog of ready-made products (T-shirts,
mugs, wood designs, and other categories as they're added; "Standard
Printed" processing only — bring-your-own-design and custom design are
explicitly out of scope, see below) with size/color/material variants →
adds items to a cart, where promotions/discounts (a flat promotional
discount, BOGO, promo codes, a cart-amount threshold discount, and
optional free shipping/processing) may apply → checkout computes sales
tax via a tax-calculation API and shipping via either a flat rate or a
calculated/carrier-rate option → checks out via a server-validated,
webhook-verified payment flow → receives an order confirmation → the
order lands in an authenticated admin queue (items, variants,
quantities, shipping address, fulfillment status) with admin-configurable
promotion rules, gated behind Google SSO for the business owner, that
she works from to print and ship orders herself.

Explicitly out of scope for the MVP (logged to `docs/future-work.md`,
not built now):
- A live product customizer / upload-your-own-design tool / custom
  design — every product's "Processing" options include this, and it's
  the priority fast-follow feature right after MVP, but it's a
  deliberately separate slice from the base storefront, not attempted
  alongside it.
- Any AI-assisted feature (design generation, support chat, etc.).
- Identity providers beyond Google SSO, or multiple admin
  roles/permissions — a single owner role only.
- Inventory/stock tracking — confirmed 2026-07-07 against the proposed
  launch catalog (`Resources/products/Launch Catalog.html`), which
  labels some items "stockable" (pre-made in batches) vs. "made to
  order": that label is an internal fulfillment note for the owner,
  not a customer-facing feature — the site does not track quantity-
  on-hand or show out-of-stock states for any item in the MVP.
- Reviews/ratings, wishlists, multi-currency, and subscriptions/
  recurring orders.

Once `spec.md`'s MVP boundary is approved, it is frozen. Any new idea
surfaced mid-build MUST be logged to `docs/future-work.md` or an ADR
instead of being implemented, unless the spec is formally amended.

Rationale: the product range ("T-shirts, mugs, wood designs, and a lot
more") invites scope sprawl across many product types at once. A frozen
boundary — one real, working, trustworthy checkout path — protects
against shipping five half-built customization flows instead of one
that actually works.

### V. Test Discipline

Every non-trivial unit of business logic (cart/pricing calculation,
order state transitions, Zod schema validation, webhook payload
handling) MUST have Vitest unit tests before its task is considered
done. Tests and implementation may be written together; strict
write-order (test-before-code) is not enforced. One Playwright
happy-path end-to-end test MUST cover the full vertical slice (browse →
cart → checkout → confirmation → order visible in the admin queue).
Both unit and e2e tests MUST run against a deterministic fake payment
provider (keyed by scenario, with a deliberate failure-trigger path),
not live payment-provider test-mode network calls — mirroring the
provider/fake-provider pattern a prior project used for its LLM calls —
so the suite stays fast, free, and network-independent. GitHub Actions
CI MUST run typecheck, lint, test, and e2e on every push, and MUST be
green before merge.

Rationale: coverage of the logic that silently loses money or orders
when it breaks (pricing, state transitions, webhook handling) matters
more here than ceremony around write-order. A fake payment provider
keeps CI fast and free while still exercising the real failure paths
(a declined card, a malformed webhook) deterministically.

### VI. Legible History

Commits MUST use Conventional Commits prefixes (`feat`, `fix`, `docs`,
`test`, `chore`, `refactor`) and each commit MUST be one logical,
atomic, self-contained change, mapped to a `tasks.md` item where
practical — committing mid-task is fine where it makes sense, rather
than batching everything into one commit at the end. After each unit of
work, `CHANGELOG.md` and `status.md` MUST be updated to match (and any
ADR the work triggered MUST be written or updated), and the result
committed and pushed — not left staged for later. Trivial changes
(typo fixes, formatting) don't need a `CHANGELOG.md`/`status.md` entry,
but still get committed.

Rationale: legible history is how a solo maintainer safely picks this
back up later, and how a non-technical stakeholder (the business owner)
can be shown, in plain language, what changed and why. Pushing after
each unit of work — not batching — keeps `status.md` and
`CHANGELOG.md` trustworthy as a live read of where things stand, not a
document that's perpetually behind the actual code.

## Technology Constraints

Next.js (App Router) with TypeScript in strict mode; Tailwind CSS for
styling; npm as the package manager. A component layer may use
shadcn/ui only as a restyled base — components MUST NOT ship at default
appearance (see Principle III). Persistence is a real, durable database
from day one (products, carts/orders, fulfillment state) — unlike a
stateless-by-default MVP, durable storage is the expected baseline
here, not a deviation requiring justification. Database: PostgreSQL, a
local instance for development, queried through Drizzle (see
`docs/adr/0001-postgres-persistence.md`,
`docs/adr/0002-drizzle-orm.md`) — a hosted/production provider (e.g.
via the Vercel Marketplace) is still an open decision, owed its own ADR
when chosen, including a serverless-appropriate connection strategy
(see ADR-0002 Consequences). Payments: **PayPal** for MVP (see
`docs/adr/0005-paypal-for-mvp-payments.md`) — Stripe is deferred to a
fast-follow integration, not abandoned; server-side only, every
webhook signature verified before use (Principle II). Tax: sales tax is
computed via a tax-calculation API (provider TBD, ADR owed) — never
hand-rolled tax-rate logic. Shipping: both a flat rate and a
calculated/carrier-rate option are in scope; the carrier-rate provider
(if used) is an ADR made during planning. Identity: Google SSO gates
the admin queue, implemented via **Auth.js** (see
`docs/adr/0006-authjs-for-google-sso.md`), restricted to the two
authorized accounts. No LLM/AI provider is
part of the MVP; if one is added later (per Principle IV's future-work
list) it MUST follow Principle II's swappable-provider/Zod-validation
rule.

## Development Workflow

Spec Kit phases are worked in order: constitution → spec → plan → tasks
→ implement. Clarifying questions are asked before each major artifact
is generated. Decisions with a real tradeoff are presented as 2–3
options with pros/cons and a recommendation, rather than silently
decided. Given the MVP scope defined in Principle IV, tasks are
sequenced into demoable increments and sized realistically during
`/speckit-plan` and `/speckit-tasks`. Confirmed as this project's own
workflow (carried over from, and validated on, a prior project): once
the MVP feature list exists, every feature MUST be fully specified,
planned, and tasked before implementation begins on any of them —
infrastructure-only setup (e.g. the initial project scaffold) is built
immediately as a stated exception, since it isn't product surface —
unless the project owner explicitly asks to implement something
sooner.

## Governance

This constitution supersedes all other project practices. Amendments
require a documented Sync Impact Report (prepended to this file)
recording the version change, modified/added/removed sections, and any
templates flagged for follow-up.

Constitution versioning follows semantic versioning:
- **MAJOR**: backward-incompatible governance or principle removals/
  redefinitions.
- **MINOR**: a new principle or section added, or materially expanded
  guidance.
- **PATCH**: clarifications, wording, or non-semantic refinements.

Every `/speckit-plan` run MUST include a Constitution Check gate against
the principles above, and every `tasks.md` MUST be traceable back to
them. Any complexity that appears to violate a principle — especially
Principle IV (Scope Discipline) — MUST be justified in the plan's
Complexity Tracking table or rejected.

The project is proprietary — a private repository for a real
commercial storefront, not a public portfolio artifact.

Reference material from a prior project (fitt.d — its constitution,
ADR format, and spec/plan/research/quickstart/tasks structure) was used
as a structural template for this project's own Spec Kit scaffolding,
but MUST NOT be treated as this project's own authored decisions —
per Principle I, this project's committed ADRs, specs, and plans are
authored (or substantively reconciled) through this project's own
process, so the "process produced this" record stays genuine.

**Version**: 1.0.0 | **Ratified**: 2026-07-06 | **Last Amended**: 2026-07-06
