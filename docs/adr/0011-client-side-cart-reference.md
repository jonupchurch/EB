# ADR-0011: Client-held cart reference, not a server-persisted table

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Jon Upchurch

## Context

Feature 3 (cart & checkout) needs a cart. This project has no customer
account system anywhere — a cart is inherently anonymous, pre-purchase
state tied to a single visitor's browser, not a login.

## Decision

The cart is a small reference held in a first-party cookie — an array
of `{ productId, selectedOptionIds, quantity }`. No `carts`/`cart_items`
table exists. Every time the cart is viewed or checkout proceeds, the
server re-fetches each referenced product fresh and recomputes pricing
via `src/lib/pricing.ts` — the cookie never carries a price.

## Alternatives considered

- **A server-persisted `carts` table keyed by a session ID** — a
  legitimate pattern, especially useful for cross-device recovery or
  abandoned-cart analytics. Rejected for MVP: neither need exists yet
  (no accounts, no marketing/analytics scope in this feature), and it
  would add a table and its lifecycle (expiry/cleanup of abandoned
  carts) for no immediate benefit at this business's scale.

## Consequences

Because the cookie is never trusted for price (Principle II, extended
from features 1–2's admin/storefront pricing to the pre-purchase
flow), a visitor editing it directly can only ever ask the server
"price this combination for me" — never claim a price outright. If
cross-device cart recovery or abandoned-cart analytics ever become
real requirements (e.g., once a customer account system exists), a
persisted cart table is the natural follow-up — not a redesign of this
decision, an addition on top of it.
