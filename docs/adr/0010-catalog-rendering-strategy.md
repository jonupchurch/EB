# ADR-0010: Dynamic (SSR) rendering for catalog/product pages, not ISR

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Jon Upchurch

## Context

Feature 2 (catalog & browsing) needs to decide how the storefront's
Browse view and Product Detail view get their data: rendered fresh on
every request, or statically generated with time-based revalidation
(ISR). Feature 1's admin editor lets the owner flip a product between
Active and Draft at any time, and feature 2's FR-002/SC-002 require
that a Draft product is never reachable by a visitor, under any
circumstance.

## Decision

Catalog and product detail pages render dynamically (SSR) — every
request queries Postgres fresh. No static generation, no ISR, for
these routes.

## Alternatives considered

- **ISR with a short revalidation window** (e.g. 60s) — rejected. A
  cached page could keep serving a now-Draft product's data for the
  length of its revalidation window. That's a real correctness gap
  (FR-002 is a hard requirement, not a nice-to-have), not just
  staleness the business can tolerate.
- **Full static generation at build time** — rejected outright. The
  catalog changes whenever the owner edits a product in the admin
  area; static generation can't reflect that without a rebuild.

## Consequences

Every storefront page load costs a real database query — acceptable
at this business's scale (one small shop's traffic, not a
high-traffic site), so there's no meaningful performance cost being
traded away for a caching benefit that isn't needed yet. If traffic
ever grows enough that this becomes a real cost, revisit with ISR
plus an explicit revalidation hook fired from the admin's
Active/Draft toggle (so a flip is reflected immediately rather than
waiting out a window) — not a blanket time-based cache.
