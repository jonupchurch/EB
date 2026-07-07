# Research: Admin Product Management

Phase 0 output for `specs/001-admin-product-management/plan.md`. No
`[NEEDS CLARIFICATION]` markers remained in the Technical Context — the
ratified constitution and accepted ADRs already settled the surrounding
infrastructure. The decisions below are specific to this feature.

## Product/options schema shape

- **Decision**: relational tables per option category — `categories`,
  `products`, `processing_options`, `styling_options`,
  `material_options`, `size_options`, `color_options`, and
  `design_location_options`, each option table foreign-keyed to
  `products` and carrying its own `price_adjustment_cents`.
- **Rationale**: the Product Editor wireframe already treats these six
  option kinds as visually and functionally distinct sections (each
  with its own "add" affordance), so the schema should mirror that
  rather than force them into one generic shape. Separate typed tables
  also give Drizzle real relational queries for later features (e.g.,
  a future storefront asking "what sizes does this product offer, and
  at what upcharge?") without JSON-path querying, and let each
  option's Zod schema be genuinely specific to that option kind rather
  than a lowest-common-denominator shape.
- **Alternatives considered**:
  - **A generic key-value "product_options" table** with a `type`
    discriminator column and shared nullable columns — rejected;
    would accumulate option-kind-specific nullable columns (e.g.,
    `model_number` only makes sense for materials) and weakens
    type-level validation.
  - **A single JSONB `options` column on the product row** — rejected;
    simplest migrations, but loses relational integrity and
    query-ability, and pushes all shape validation to the application
    layer with no DB-level structure to lean on. Doesn't fit Drizzle's
    schema-first strength (ADR-0002's own rationale for choosing it).
- **This is a real, project-visible tradeoff** — `docs/adr/0007-product-options-schema.md`
  MUST be authored during `/speckit-tasks`/implementation.

## Money representation

- **Decision**: all prices (base price, every option's price
  adjustment) are stored as integer cents, never floating-point
  dollars.
- **Rationale**: floating-point currency arithmetic accumulates
  rounding error — unacceptable for a feature whose entire purpose is
  accurate pricing (spec.md SC-005: totals must never drift from the
  exact sum). Integer cents is the standard, uncontroversial fix.
- **Alternatives considered**: storing decimal dollars as a SQL
  `numeric`/`decimal` type — a legitimate alternative that also avoids
  float drift, but integer cents is simpler to reason about in
  TypeScript (plain `number`/`bigint` arithmetic, no decimal library
  needed) for a single-currency (USD-only, per the constitution) MVP.

## Auth.js allow-list enforcement

- **Decision**: enforce the two-account allow-list in Auth.js's
  `signIn` callback (reject the sign-in itself if the Google account's
  email isn't on the list), with the `/admin` layout also checking for
  a valid session server-side as defense in depth.
- **Rationale**: rejecting at the `signIn` callback is the earliest,
  cleanest point — no session is ever created for an unauthorized
  account in the first place (spec.md FR-002's "MUST NOT expose any
  product data or admin functionality"). The layout-level session check
  is a second, independent guard so a route can never render for an
  unauthenticated request regardless of how it was reached.
- **Alternatives considered**: allow-list check only at the route/layout
  level (letting any Google account sign in, then gating afterward) —
  rejected; leaves a session cookie issued to an unauthorized account
  even if no UI renders for them, a weaker posture than never issuing
  one at all.

## Admin mutation rate limiting

- **Decision**: a simple, generous rate limit on the product
  create/update/duplicate Server Actions (e.g., an in-memory per-session
  counter), sized for normal single-owner data-entry pace, not tuned
  for abuse resistance.
- **Rationale**: Principle II requires "sensible rate limits" on admin
  endpoints, but the realistic threat model here is different from a
  public endpoint — exactly two authenticated, known accounts can ever
  reach this code path at all. The limit exists to catch a runaway
  client bug or script, not to stop abuse from an anonymous public.
- **Alternatives considered**: no rate limit at all — rejected, since
  Principle II states it as a MUST regardless of how narrow the actor
  set is; a persistent/distributed rate limiter (e.g., Redis-backed) —
  rejected as unjustified complexity for two trusted users on a single
  Fluid Compute deployment.

## Reused infrastructure (not re-decided)

- **Database, ORM, migration discipline**: unchanged from ADR-0001/0002
  — Postgres locally, Drizzle for schema/queries, migrations committed
  and reviewed per ADR-0002's Consequences.
- **Auth provider**: unchanged from ADR-0006 — Auth.js, Google provider.
  This feature is the first to actually implement that decision.
- **Accessibility bar**: unchanged from Principle III as amended — WCAG
  2.1 AA is the target, not a hard CI-blocking gate; the two known
  wireframe-review exceptions (ADR-0003) and the fixed muted-text token
  (ADR-0004) carry forward into the real theme built from this feature.

## Architecture Decision Records

- `docs/adr/0007-product-options-schema.md` (new, per "Product/options
  schema shape" above) — the only new ADR this feature owes. Everything
  else (database, ORM, auth provider, accessibility bar) is inherited
  from ADR-0001/0002/0003/0004/0006 and not re-litigated.
