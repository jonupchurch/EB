# ADR-0014: PayPal via direct REST calls, no SDK

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Jon Upchurch

## Context

ADR-0005 already decided PayPal is the MVP payment processor. This
feature (cart & checkout) needs to decide *how* to integrate with it:
via PayPal's official Node SDK, or by calling its REST APIs directly.

## Decision

Call PayPal's **Orders v2 API** (create, capture) and **Webhooks API**
(signature verification) directly via `fetch` — no
`@paypal/checkout-server-sdk` or similar package.

## Alternatives considered

- **The official Node SDK** — reduces some boilerplate, but adds a
  dependency for a small, stable API surface this project can call
  directly with equal clarity. It would also add a layer of
  indirection around webhook signature verification specifically — the
  one step this project's Principle II treats as non-negotiable (no
  order is ever marked paid without it) — where full transparency and
  inspectability matter more than convenience.

## Consequences

`src/lib/checkout/paypal.ts` implements `createOrder`, `captureOrder`,
and `verifyWebhookSignature` as plain `fetch` calls against
`api-m.sandbox.paypal.com` (dev) / `api-m.paypal.com` (prod), using an
OAuth2 client-credentials token obtained from `PAYPAL_CLIENT_ID`/
`PAYPAL_CLIENT_SECRET`. A deterministic fake implementation of the same
interface is used in every automated test — no test ever depends on
PayPal's sandbox being reachable. `PAYPAL_WEBHOOK_ID` (obtained once
the webhook Route Handler's URL exists to register in PayPal's
dashboard) is required for real signature verification in any
live/manual check.
