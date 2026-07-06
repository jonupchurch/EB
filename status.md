# Printing Website — Status & Plan Review

**Purpose of this document:** a plain-language summary of where this project stands and what's planned — for anyone following along without reading the technical specs in detail. Updated as work progresses; the full technical detail behind any item lives in `specs/` once a feature reaches planning, or in [`CHANGELOG.md`](CHANGELOG.md) for a push-by-push history.

**Where things stand:** the app itself now exists and runs (Next.js scaffold, database connectivity, CI-checkable), but no product feature has been built. The project's constitution — the ground rules for how this gets built (scope, quality bar, process) — is drafted but not yet ratified. No feature has been specified, planned, or implemented through the Spec Kit cycle yet. The table below is a provisional read of the MVP from the constitution, not a committed plan — the real breakdown gets finalized as each feature goes through `/speckit-specify`.

---

## At a glance

| # | Feature | Status | One-liner |
|---|---|---|---|
| — | Project setup | ✅ Scaffolded | Next.js app, TypeScript/Tailwind/Zod, PostgreSQL via Drizzle, a `/api/health` check, and CI all wired up and passing. |
| — | Catalog & browsing | Not started | A fixed catalog of ready-made products (shirts, mugs, wood designs) with size/color/material variants. |
| — | Cart & checkout | Not started | Add to cart, pay via a server-validated, webhook-verified flow (Stripe, tentative). |
| — | Order confirmation | Not started | Customer sees confirmation; the order is recorded once the payment webhook is verified. |
| — | Admin order queue | Not started | Google-SSO-gated view of orders (items, variants, shipping address, fulfillment status) the owner works from to print and ship. |

Deliberately **not** in the MVP (see [`docs/future-work.md`](docs/future-work.md) for the reasoning): a live product customizer / upload-your-own-design tool, any AI-assisted feature, extra admin roles, inventory tracking, discounts, reviews, or multi-currency support.

---

## What's happened so far

- **2026-07-06** — Scaffolded the Spec Kit project structure (`.specify/`, `.claude/skills/`), drafted the constitution (v1.0.0, not yet ratified), and added the initial docs/config scaffold (ADR template, `future-work.md`, `non-functional.md`, TypeScript/ESLint/Vitest/Playwright config, CI workflow). Decided the database: PostgreSQL, running locally for now ([ADR-0001](docs/adr/0001-postgres-persistence.md)) — hosted/production Postgres is still an open decision.
- **2026-07-06** — Scaffolded the actual Next.js app: `src/app` (App Router), Tailwind v4, a `public/` folder for static assets, and a `/api/health` route that proves the database connection works. Decided the query layer: Drizzle ORM over Prisma ([ADR-0002](docs/adr/0002-drizzle-orm.md)), with an initial migration applied to the local database. Typecheck, lint, unit tests, build, and e2e all pass. See `CHANGELOG.md` for the exact commits.

## Next steps

1. Ratify the constitution (or amend it first, if anything above needs adjusting).
2. Run `/speckit-specify` for the first real product feature — the app now runs, but no product feature (catalog, cart, checkout, admin queue) has gone through the Spec Kit cycle yet.
3. Work through the MVP feature list above in order, each through the full spec → plan → tasks → implement cycle.
