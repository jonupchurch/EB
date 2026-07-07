# Research: Order Confirmation

Phase 0 output for `specs/004-order-confirmation/plan.md`. No
`[NEEDS CLARIFICATION]` markers remained in the Technical Context. The
decisions below are specific to this feature.

## Email provider: Resend

- **Decision**: Resend, via its official Node client, confirmed with
  Jon before drafting this feature's spec (not silently assumed).
- **Rationale**: a well-established transactional email provider with
  a simple API and good fit for a Next.js/Vercel app; avoids
  hand-rolling SMTP, which this project's general pattern (ADR-0009's
  Vercel Blob decision, ADR-0012's TaxJar decision) already treats as
  the wrong tradeoff for a well-defined external service with a
  mature, purpose-built provider available.
- **Alternatives considered**: SendGrid, Postmark — both legitimate,
  comparable transactional-email providers; Resend was preferred for
  its straightforward API and its focus on developer-first,
  Next.js-friendly integration at this project's small scale.
- **This is a real, project-visible tradeoff** — `docs/adr/0015-resend-for-transactional-email.md`
  MUST be authored during `/speckit-tasks`/implementation.

## Confirmation URL: a dedicated random token, not the order's internal ID

- **Decision**: `orders.confirmationToken` (unique, cryptographically
  random, generated at order creation in feature 3) is the public
  identifier in every confirmation URL. The order's internal `id` is
  never exposed in a customer-facing URL.
- **Rationale**: this project's identifiers otherwise follow a
  sequential-integer convention (e.g., `health_check.id` is `serial`),
  which would make an order's internal ID a small, guessable number —
  directly violating FR-012 (spec.md) if used as the public URL
  identifier. A dedicated random token, generated once and stored
  alongside the order, keeps the internal ID free to stay sequential
  (simple joins/indexing) while giving the public-facing surface the
  unguessability it actually needs.
- **Alternatives considered**: switching `orders.id` itself to a UUID
  — would also solve the guessability problem, but is a broader,
  unrelated schema convention change with no benefit beyond this one
  requirement; a dedicated token is the narrower, more proportionate
  fix.

## Payment-status update: short-interval client polling, not push

- **Decision**: while an order is still `placed` (payment not yet
  webhook-verified), the confirmation page polls `getOrderConfirmation(token)`
  every 2 seconds, for up to 60 seconds, before showing the "this may
  need attention" message (FR-005).
- **Rationale**: PayPal's webhook normally arrives within seconds, so
  this is a brief, rare transitional state, not a sustained real-time
  feature. Simple polling is proportionate at this scale and traffic
  volume — no dedicated ADR is owed for this (unlike the four in
  feature 3), since it's an implementation detail with no real
  alternative-tradeoff of lasting consequence, not a project-visible
  architectural commitment.
- **Alternatives considered**: Server-Sent Events or WebSockets (both
  genuinely supported on this project's Vercel/Fluid Compute target)
  — rejected as unjustified complexity for a state that resolves in
  seconds for the overwhelming majority of orders; polling is simpler
  to reason about and test (including with feature 3's fake PayPal
  provider, which can simulate a delayed webhook deterministically).

## Access control: token entropy, not rate-limiting

- **Decision**: the confirmation page's protection against
  unauthorized access comes entirely from `confirmationToken`'s
  randomness (FR-012) — no dedicated rate limiter guards this route.
- **Rationale**: Principle II's rate-limit requirement is explicitly
  scoped to "checkout and admin endpoints" — a confirmation-page view
  is a public read with no mutation, so it isn't one of those. A
  sufficiently random token (effectively unguessable by brute force
  regardless of request rate) is the actual security mechanism here;
  adding a rate limiter on top would be a second, unnecessary layer
  for a threat model the token's entropy already closes.

## Reused infrastructure (not re-decided)

- **Database, ORM**: unchanged from ADR-0001/0002/0008. No new tables
  in this feature — `confirmationToken`/`confirmationEmailSentAt` were
  added directly to feature 3's `orders` table.
- **Payment verification**: unchanged from feature 3 — this feature
  never re-verifies anything; it only reacts to an already-verified
  paid order.
- **Fake-provider testing pattern**: extended to Resend, alongside
  this project's existing fakes for PayPal/TaxJar/Shippo.
- **Accessibility bar**: unchanged from Principle III as amended.

## Architecture Decision Records

- `docs/adr/0015-resend-for-transactional-email.md` (new, per "Email
  provider" above) — the only new ADR this feature owes. Everything
  else (database, payment verification, accessibility bar) is
  inherited from earlier features' decisions and not re-litigated.
