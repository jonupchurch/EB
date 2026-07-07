# Implementation Plan: Order Confirmation

**Branch**: `004-order-confirmation` | **Date**: 2026-07-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-order-confirmation/spec.md`

## Summary

A public confirmation page, keyed by a random (not sequential) token rather than an order's internal ID, that shows a paid order's details and gracefully handles the brief window before PayPal's webhook is verified — plus a one-time confirmation email via Resend, triggered from feature 3's webhook handler the moment an order actually becomes paid. This feature adds no new database table: `confirmationToken` and `confirmationEmailSentAt` were added directly to feature 3's `orders` table (amended alongside this feature's planning, since feature 3 is the one that creates the row).

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22.18.0 LTS (per `.nvmrc`)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Drizzle ORM + `postgres` driver, Zod, Tailwind CSS v4; `resend` (official Node client) for the confirmation email

**Storage**: PostgreSQL — same Neon/local database as features 1–3. **No new tables** — this feature reads/updates two columns (`confirmationToken`, `confirmationEmailSentAt`) already added to feature 3's `orders` table

**Testing**: Vitest (the email-send-once idempotency logic) and Playwright (confirmation page happy path; a still-verifying → paid transition using feature 3's fake PayPal provider; a nonexistent-token request)

**Target Platform**: Web, deployed to Vercel (Node.js runtime / Fluid Compute) — same target as features 1–3

**Project Type**: Web application — extends the existing single Next.js app; adds one route to the `(storefront)` group and a small addition to feature 3's PayPal webhook handler

**Performance Goals**: Same storefront LCP target as feature 2 (<2.5s) for the initial page load. The "confirming payment" state polls for an update every 2 seconds and gives up with a "this may need attention" message after 60 seconds (FR-005) — generous headroom given PayPal webhooks normally resolve in seconds, without leaving a customer waiting indefinitely

**Constraints**: `confirmationToken` MUST be generated with a cryptographically random source (not a predictable one) — it's the feature's only access control (FR-012), so its unguessability comes from entropy, not from rate-limiting; a confirmation-page view is a public read with no mutation, so Principle II's rate-limit requirement (scoped to "checkout and admin endpoints") doesn't apply here. Sending the confirmation email MUST be idempotent even under near-simultaneous webhook redeliveries — checking and setting `confirmationEmailSentAt` MUST happen atomically enough that two deliveries can never both send (FR-008)

**Scale/Scope**: Same single-business scale as features 1–3

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS, with a task obligation | This feature makes one new architectural call: Resend as the transactional email provider. `docs/adr/0015-resend-for-transactional-email.md` MUST be authored during `/speckit-tasks`/implementation. (Polling for the confirming→paid transition is a minor implementation detail, not a project-visible tradeoff — documented in `research.md` without its own ADR, matching how not every feature-2/3 decision needed one.) |
| II. Full-Stack Substance & Trustworthy Commerce | PASS | The confirmation email is sent only after Principle II's own webhook-verification gate (feature 3) has already been satisfied — this feature adds no new trust boundary, it reads what feature 3 already verified. The one real correctness requirement here is idempotency (FR-008), not rate-limiting or Zod validation at a mutation boundary, since this feature's only "mutation" is the one-time, server-triggered email send. |
| III. Designed, Accessible Experience | PASS | Built from the already-reviewed `Resources/wireframes/Checkout & Confirmation.html`'s order-confirmation timeline section. Every state (confirming, paid, timed-out, not-found) gets designed, not just the happy path. WCAG 2.1 AA is the target per the softened Principle III. |
| IV. Product Judgment & Scope Discipline | PASS | Scope matches spec.md exactly: the confirmation page and its one-time email only. No admin order management, no further status transitions, no refunds, no email-resend tooling — all explicitly deferred. |
| V. Test Discipline | PASS | Vitest covers the email-send-once idempotency logic. One Playwright e2e covers the confirmation page's happy path, the confirming→paid transition (via feature 3's fake PayPal), and a nonexistent-token request. |
| VI. Legible History | PASS | Conventional Commits, `CHANGELOG.md` entry on push, per the confirmed per-unit-of-work discipline. |

No unjustified violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-order-confirmation/
├── spec.md               # Feature specification (complete)
├── plan.md               # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── actions.md        # Phase 1 output — Server Action contracts
├── quickstart.md         # Phase 1 output
└── tasks.md               # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
PrintingSite/
├── src/
│   ├── app/
│   │   ├── (storefront)/
│   │   │   └── orders/
│   │   │       └── [token]/
│   │   │           ├── page.tsx          # NEW — confirmation page: order details, timeline,
│   │   │           │                      #       a "confirming payment" state that polls
│   │   │           │                      #       until paid or a 60s timeout (US1)
│   │   │           └── actions.ts        # NEW — getOrderConfirmation(token): the same call
│   │   │                                 #       used for the initial render and every poll
│   │   └── api/
│   │       └── webhooks/
│   │           └── paypal/
│   │               └── route.ts          # MODIFIED (feature 3) — after verifying and marking
│   │                                      #       an order paid, calls sendConfirmationEmail
│   └── lib/
│       └── confirmation/
│           └── email.ts                  # NEW — Resend-backed sendConfirmationEmail(order);
│                                          #       idempotent via confirmationEmailSentAt (FR-008)
├── tests/
│   └── confirmation/
│       └── email.test.ts                 # NEW — Vitest: send-once idempotency (already-sent
│                                          #       and not-yet-paid cases never send)
└── e2e/
    └── order-confirmation.spec.ts        # NEW — Playwright: happy path, confirming→paid
                                          #       transition (fake PayPal), nonexistent token
```

**Structure Decision**: Single existing Next.js app, extended — no new project/package boundary needed. The confirmation page lives under the existing `(storefront)` route group, keyed by `[token]` rather than an internal order ID. Feature 3's webhook handler gets one small addition (a call to `sendConfirmationEmail`) rather than this feature owning webhook logic itself — the verification gate stays exactly where Principle II already put it.

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations. The
ADR obligation above is a documentation commitment stemming from a real
decision, not a complexity violation requiring justification.*
