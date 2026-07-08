# ADR-0012: TaxJar for sales tax calculation

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Jon Upchurch

## Context

The constitution has carried a "choose a tax-calculation API provider"
follow-up since ratification. Erica's business is in Parma, Ohio
(Cuyahoga County), which layers its own county rate and a transit-
authority (RTA) add-on on top of Ohio's state rate — a flat or
hand-rolled rate table isn't safe even for in-state orders. Checkout
(this feature) is the first point where an actual tax figure is
required, so the decision can no longer be deferred.

## Decision

**TaxJar**, via its official `taxjar` Node client, computes sales tax
for every checkout — address-level, destination-based calculation,
never a hardcoded or hand-rolled rate.

## Alternatives considered

- **Avalara** — a legitimate competitor, but positioned toward larger/
  more complex multi-entity businesses; more integration surface and
  pricing structure than a single-owner shop needs.
- **Hand-rolled Ohio rate logic** — rejected outright; the county/RTA
  layering already established during the constitution's drafting
  rules this out as unsafe, even for in-state-only orders.

## Consequences

`src/lib/checkout/tax.ts` wraps TaxJar's `taxForOrder` behind a small
interface (`getSalesTax(...)`), with a deterministic fake used in every
automated test — no test ever depends on TaxJar's sandbox being
reachable. A real `TAXJAR_API_KEY` (sandbox, then live) is required for
any live/manual verification of this piece. If tax obligations ever
expand beyond Ohio in a way TaxJar can't cover, or pricing/fit changes,
the switch is contained to this one module.
