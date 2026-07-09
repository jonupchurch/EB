# ADR-0015: Resend for transactional confirmation email

- **Status:** Accepted
- **Date:** 2026-07-09
- **Deciders:** Jon Upchurch

## Context

Feature 4 (order confirmation) needs to send exactly one confirmation
email per paid order. With no customer account system anywhere in this
project, that email (and the link it contains) is a customer's only
durable record of their order, so it needs a real transactional
delivery provider — not a hand-rolled SMTP client — consistent with
this project's general preference for established providers on
well-defined external services (ADR-0009's Vercel Blob decision,
ADR-0012's TaxJar decision).

## Decision

**Resend**, via its official Node client, sends the confirmation
email. Confirmed with Jon before this feature's spec was drafted.

## Alternatives considered

- **SendGrid, Postmark** — both legitimate, comparable transactional
  email providers. Resend was preferred for its simpler API and its
  developer-first fit with a Next.js/Vercel app at this project's
  small scale.
- **Hand-rolled SMTP** — rejected outright; this project already
  treats "well-defined external service, mature provider available" as
  the wrong place to hand-roll (see ADR-0009, ADR-0012, ADR-0013).

## Consequences

`src/lib/confirmation/email.ts` wraps Resend's client behind
`sendConfirmationEmail(orderId)`, gated by the same
`CHECKOUT_FAKE_PROVIDERS` flag as the PayPal/TaxJar/Shippo modules — a
deterministic fake is used in every automated test, so no test ever
depends on Resend's API being reachable. A real `RESEND_API_KEY`
(already in `.env.local`) is required for any live/manual send. A
delivery failure is caught and logged, never propagated — the
confirmation page's own correctness never depends on the email
succeeding (FR-009).
