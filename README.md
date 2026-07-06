# Printing Website

**An online storefront for custom-printed goods — T-shirts, mugs, wood designs, and more — built and run by a real small business.**

📋 **[Status](status.md)** · 📜 **[Constitution](.specify/memory/constitution.md)** · 📝 **[Changelog](CHANGELOG.md)** · 🏛️ **[ADRs](docs/adr/)**

> This is a working commercial site, not a portfolio piece — but it's still built spec-driven (constitution → spec → plan → tasks → implement) so the process stays legible for a solo maintainer coming back to it later. See the constitution for why.

---

## The problem

A small print business (T-shirts, mugs, wood designs, and more) needs a real storefront: a catalog customers can browse, a checkout that actually charges them correctly, and a way for the owner to see what she needs to print and ship — without hand-rolling all of that from scratch or bolting a payment link onto a page.

## How it will work (MVP)

1. **Browse** — a fixed catalog of ready-made products with size/color/material variants. (No live design customizer yet — see [`docs/future-work.md`](docs/future-work.md).)
2. **Cart & checkout** — add items, check out through a server-validated, webhook-verified payment flow (Stripe, tentatively).
3. **Confirmation** — the customer gets an order confirmation; the order is recorded once the payment webhook is verified.
4. **Fulfillment** — the order lands in an authenticated admin queue (Google SSO), which the owner works from to print and ship it herself.

## Project status

**Not yet built.** The constitution is drafted (v1.0.0) but not yet ratified, and no product features have been specified, planned, or implemented. See [`status.md`](status.md) for the current build state and [`CHANGELOG.md`](CHANGELOG.md) for the full history of what's landed so far (scaffolding only, at this point).

## Tech stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · Zod · PostgreSQL (local for now — [ADR-0001](docs/adr/0001-postgres-persistence.md)) · Vitest · Playwright · GitHub Actions · Vercel. Payment provider (Stripe, tentative) and auth provider (Google SSO, implementation TBD) are open ADRs — see the constitution's Sync Impact Report.

## Run locally

There's no runnable app yet — that's the first feature to be specified and built (project setup: `package.json`, the Next.js app itself, dependencies). Once it exists, this will be:

```bash
npm install
cp .env.example .env.local   # fill in real values — a local Postgres instance and its DATABASE_URL, at minimum
npm run dev
```

## Testing & quality

Once the app exists:

```bash
npm run typecheck && npm run lint && npm run test   # unit
npm run test:e2e                                     # Playwright happy path
```

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, and an automated accessibility + e2e check on every push.

## Architecture decisions

Every non-trivial tradeoff gets a short ADR in [`docs/adr/`](docs/adr) — captured before or alongside the code that implements it. None accepted yet; see the index at [`docs/adr/README.md`](docs/adr/README.md).

## Payments & privacy

Real money and real customer data will move through this site — see [`docs/non-functional.md`](docs/non-functional.md) for the budgets and guardrails (payment handling, data limits, accessibility) this project holds itself to.

## License

Proprietary. Private repository for a real commercial storefront — not open source.
