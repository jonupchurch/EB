# ADR-0008: Neon for hosted/production Postgres

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Jon Upchurch

## Context

[ADR-0001](0001-postgres-persistence.md) chose PostgreSQL as the
engine but deliberately deferred the hosted/production provider until
deployment was actually being set up. That point has arrived: the
Vercel project (`ericaburnsthings`) needs a real Production/Preview
database.

## Decision

**Neon**, provisioned through the Vercel Marketplace (`neon-bole-planet`),
connected to Production and Preview environments. It's the first-class
Postgres option in Vercel's Marketplace — serverless-friendly (scales
to zero, connection pooling built in), and its pooled `DATABASE_URL`
works directly with the existing [ADR-0002](0002-drizzle-orm.md)
`drizzle-orm/postgres-js` setup with no driver change.

## Alternatives considered

- **Supabase** — also solid, but bundles auth/storage/realtime features
  this project doesn't need (Auth.js already covers auth per
  [ADR-0006](0006-authjs-for-google-sso.md); Vercel Blob covers file
  storage). Neon's narrower scope (just Postgres) matches what's
  actually needed.
- **`@neondatabase/serverless` driver** (HTTP/WebSocket-based, no
  TCP) — unnecessary for this project's needs; the standard pooled
  connection string over `postgres.js` is simpler and keeps one driver
  for local and hosted Postgres alike.

## Consequences

Real bug found and fixed while wiring this up: Vercel Marketplace
integrations provision `DATABASE_URL` as a **runtime-only** secret —
it's not available during `next build`'s page-data collection step. The
original `src/db/index.ts` connected (and validated `DATABASE_URL`)
eagerly at module import time, which that build step triggers by
importing every route module — so every Production build failed with
"DATABASE_URL is not set" even though the variable was correctly
configured. Fixed by making the client connect lazily, on first query,
via a `Proxy`-wrapped `db` export — `db.execute(...)` still reads
naturally at call sites, but nothing touches `process.env.DATABASE_URL`
until a request actually runs. Verified end-to-end: a fresh Production
deployment builds successfully and `GET /api/health` on the live
deployment returns `{"status":"ok","db":"connected"}`.

This closes the constitution's "choose hosted Postgres provider"
follow-up TODO.
