# Printing Website

**An online storefront for custom-printed goods — T-shirts, mugs, wood designs, and more — built and run by a real small business.**

📋 **[Status](status.md)** · 📜 **[Constitution](.specify/memory/constitution.md)** · 📝 **[Changelog](CHANGELOG.md)** · 🏛️ **[ADRs](docs/adr/)**

> This is a working commercial site, not a portfolio piece — but it's still built spec-driven (constitution → spec → plan → tasks → implement) so the process stays legible for a solo maintainer coming back to it later. See the constitution for why.

---

## The problem

A small print business (T-shirts, mugs, wood designs, and more) needs a real storefront: a catalog customers can browse, a checkout that actually charges them correctly, and a way for the owner to see what she needs to print and ship — without hand-rolling all of that from scratch or bolting a payment link onto a page.

## How it will work (MVP)

1. **Admin loads products first** — a Google-SSO-gated (Auth.js) admin area with a Product Editor (variant/pricing config) ships before any storefront work, so the catalog has real data to read from day one.
2. **Browse** — a fixed catalog of ready-made products with size/color/material variants. (No live design customizer yet — see [`docs/future-work.md`](docs/future-work.md).)
3. **Cart & checkout** — add items (with promotions/discounts), tax and shipping calculated, check out through a server-validated, webhook-verified **PayPal** flow (Stripe is a planned fast-follow, not MVP).
4. **Confirmation** — the customer gets an order confirmation; the order is recorded once the payment webhook is verified.
5. **Fulfillment** — the order lands in an admin order queue, discounts, and shipping/tax settings that the owner works from to print and ship it herself.

## Project status

**Constitution ratified, no product features built yet.** The Next.js app runs, connects to PostgreSQL, and passes its full quality bar (typecheck/lint/test/build/e2e). The full purchase flow (storefront, checkout, admin) is wireframed and cross-checked against the constitution in `Resources/`; the build order is decided (admin product management first). See [`status.md`](status.md) for the current build state and [`CHANGELOG.md`](CHANGELOG.md) for the full history.

## Tech stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · Zod · PostgreSQL via Drizzle ORM (local for now — [ADR-0001](docs/adr/0001-postgres-persistence.md), [ADR-0002](docs/adr/0002-drizzle-orm.md)) · PayPal for payments ([ADR-0005](docs/adr/0005-paypal-for-mvp-payments.md)) · Auth.js for Google SSO ([ADR-0006](docs/adr/0006-authjs-for-google-sso.md)) · Vitest · Playwright · GitHub Actions · Vercel. Tax-calculation API and shipping-carrier-rate provider are still open — see the constitution's Sync Impact Report.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in real values — a local Postgres instance and its DATABASE_URL, at minimum
npm run db:migrate           # applies committed migrations from ./drizzle
npm run dev
```

## Testing & quality

```bash
npm run typecheck && npm run lint && npm run test   # unit
npm run test:e2e                                     # Playwright happy path
```

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, and an automated accessibility + e2e check on every push.

## Architecture decisions

Every non-trivial tradeoff gets a short ADR in [`docs/adr/`](docs/adr) — captured before or alongside the code that implements it. Six accepted so far (database, ORM, payment provider, auth provider, and two accessibility-token decisions); see the index at [`docs/adr/README.md`](docs/adr/README.md).

## Payments & privacy

Real money and real customer data will move through this site — see [`docs/non-functional.md`](docs/non-functional.md) for the budgets and guardrails (payment handling, data limits, accessibility) this project holds itself to.

## License

Proprietary. Private repository for a real commercial storefront — not open source.
