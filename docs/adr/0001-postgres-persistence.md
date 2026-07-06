# ADR-0001: PostgreSQL for persistence, local instance for development

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Jon Upchurch

## Context

Unlike a stateless-by-default MVP, this project's constitution
(Technology Constraints) requires a real, durable database from day
one — products, carts/orders, and fulfillment state all need to
persist. No database engine had been chosen yet; the constitution left
it as an open decision to make during planning.

## Decision

**PostgreSQL** is the database engine. For now, development runs
against a **local Postgres instance** — no hosted/managed database is
provisioned yet. Connection details live in `.env.local` (gitignored,
never committed); `.env.example` documents the expected `DATABASE_URL`
shape without any real credentials.

Hosted/production Postgres (e.g. via a Vercel Marketplace provider such
as Neon or Supabase) is intentionally **not** decided here — that's a
separate follow-up decision for when this project actually needs a
deployed environment, not a blocker for local development now.

## Alternatives considered

- **SQLite** — rejected for this project's needs: multiple concurrent
  writers (checkout, webhook handling, the admin queue) and an eventual
  hosted deployment make a client/server database a better fit than a
  single embedded file.
- **A hosted Postgres provider from the start** (Neon, Supabase, etc.)
  — deferred, not rejected. Nothing about local development requires
  committing to a hosted provider yet; that choice can wait until
  deployment is actually being set up, avoiding an account/credential
  dependency before it's needed.
- **MySQL** — no specific reason to prefer it here; Postgres has better
  alignment with the Vercel Marketplace's database options and is the
  more common default in this stack.

## Consequences

Local development requires a running Postgres instance and a
`DATABASE_URL` in `.env.local`. The choice of query layer/ORM (e.g.
Drizzle, Prisma) is still open and will be decided when the data model
is actually built (first real feature that needs persistence). A
follow-up ADR is owed once a hosted/production Postgres provider is
chosen — this ADR covers the engine choice and local setup only.
