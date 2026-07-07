# ADR-0005: PayPal for MVP payments, Stripe deferred to a fast-follow

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Jon Upchurch

## Context

The payment provider had been an open question since the constitution
was first drafted — `Resources/shared/payment.md` listed both Stripe
and PayPal without a clear preference, and Jon was waiting on
clarification from Erica about what she actually wanted. Reviewing
`Resources/wireframes/Admin Screens.html` surfaced the question again:
the Shipping & Fees screen's payment settings panel showed **both**
Stripe (Connected) and PayPal (Connect) as simultaneously available,
which raised whether the intent was genuine multi-processor support —
a meaningfully bigger integration scope than picking one.

## Decision

**PayPal is the MVP payment processor.** Stripe is deferred to a
fast-follow integration — not abandoned, just not part of the first
checkout. The wireframe's dual-processor panel was illustrative, not a
scope commitment to build both at once.

## Alternatives considered

- **Both Stripe and PayPal at MVP launch** — rejected as unnecessary
  scope for a first checkout; supporting two processors means two
  webhook-verification paths, two sets of provider-specific error
  handling, and twice the surface area to get right before the site can
  take a single real order. One working, trustworthy checkout beats two
  half-integrated ones (the same reasoning Principle IV already applies
  to product-type sprawl).
- **Stripe for MVP, PayPal deferred** — the earlier default assumption
  in this project's docs (Stripe is more common in Vercel-ecosystem
  tooling and has a more developer-friendly API), but superseded by
  Jon's direct call to start with PayPal instead.

## Consequences

Technology Constraints and `docs/non-functional.md` now name PayPal,
not Stripe, as the MVP processor — server-side only, webhook signature
verified before any order-state change (Principle II), same as any
processor would require. `docs/future-work.md` gets a new entry for
the Stripe fast-follow integration. The specific PayPal integration
approach (PayPal Checkout / Orders API v2 vs. an older API, webhook
event handling specifics) is an implementation detail for whenever the
checkout feature is actually planned, not fixed here. Tax-API provider
choice (still open, see the constitution's follow-up TODOs) should no
longer assume a Stripe-Tax-first default now that Stripe isn't the
MVP processor.
