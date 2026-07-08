# ADR-0013: Shippo for calculated/carrier-rate shipping

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Jon Upchurch

## Context

The constitution committed to supporting both flat-rate and
calculated/carrier-rate shipping for MVP, and carried a "choose a
shipping-rate provider" follow-up since ratification. Feature 1 was
already amended (FR-017) to capture each product's packaged
weight/dimensions specifically so a shipping-rate API would have what
it needs. Checkout (this feature) is the first point that actually
needs a real rate.

## Decision

**Shippo**, via its official `shippo` Node client, provides
calculated/carrier-rate shipping — using feature 1's `weightOz`/
`lengthIn`/`widthIn`/`heightIn` fields. A flat-rate option remains
available alongside it, per spec.md FR-005; the customer chooses
between the two methods at checkout.

## Alternatives considered

- **EasyPost** — a comparable multi-carrier rate API with similar
  coverage and pricing; a reasonable alternative with no clear
  technical advantage over Shippo at this scale. The choice came down
  to Shippo's small-business-first positioning (simple onboarding,
  pay-as-you-go, no minimum volume).
- **Flat-rate-only (skip calculated rates)** — rejected; the
  constitution already committed to calculated/carrier-rate shipping
  for MVP, and feature 1's FR-017 exists specifically to support it.

## Consequences

`src/lib/checkout/shipping.ts` wraps Shippo's `shipments.create` call
behind a plain `getShippingRates(weight, dimensions, destination)`
interface — nothing else in the app calls Shippo directly, and only a
rate's amount and carrier/service name (both provider-agnostic) are
ever persisted on an Order. For the "calculated" method, this feature
automatically selects the cheapest rate Shippo returns rather than
presenting a full carrier-choice UI — matching FR-005's two-method
scope (flat vs. calculated), not a carrier-picker feature. A
deterministic fake stands in for every automated test; a real
`SHIPPO_API_KEY` (sandbox, then live) is required for live/manual
verification. Switching providers later means rewriting this one
module's internals and its API key, not touching checkout, cart, or
order code.
