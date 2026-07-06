# ADR-0002: Drizzle ORM (over Prisma) for the query/migration layer

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Jon Upchurch

## Context

ADR-0001 chose PostgreSQL as the database engine but explicitly left the
query layer/ORM open. The project's scaffold needs one now: a schema
definition format, a migration tool, and a typed query client the app
(and later, Zod-validated API boundaries per Constitution Principle II)
can build on.

## Decision

**Drizzle** — `drizzle-orm` (query client, using the `postgres-js`
driver locally), `drizzle-kit` (schema diffing/migrations), and
`drizzle-zod` (installed now for later use: deriving Zod schemas
directly from table definitions once real product tables exist).
Schema lives in `src/db/schema.ts`; the client is a single instance
exported from `src/db/index.ts`; migrations are generated into
`./drizzle` via `npm run db:generate` and applied via `npm run
db:migrate`.

## Alternatives considered

- **Prisma** — the default the project's owner asked to start from.
  Rejected in favor of Drizzle for this project specifically because:
  Drizzle's schema is plain TypeScript with no separate DSL or code-gen
  binary/engine step (`prisma generate`), which is one less moving part
  for a solo-maintained project; and `drizzle-zod` derives Zod schemas
  directly from the same table definitions the query layer uses, which
  lines up naturally with Principle II's "Zod-validated at every trust
  boundary" rule. Prisma remains a perfectly reasonable choice and has
  a smoother, more forgiving migration workflow (Prisma Migrate) than
  drizzle-kit out of the box — see Consequences below for how this
  project compensates for that gap.
- **Kysely** — a lighter, purely type-safe SQL query builder with no
  built-in migration tool of its own. Rejected: would need to be paired
  with a separate migration tool anyway, and Drizzle already gives a
  comparable type-safe query experience plus a maintained migration CLI
  in one package.
- **Raw SQL / a hand-rolled query layer** — rejected as premature
  minimalism; a schema-first tool with migration tracking is cheap to
  adopt now and pays for itself the moment the schema has more than one
  or two tables.

## Consequences

**Drizzle-kit is less forgiving than Prisma Migrate**, so this project
adopts explicit habits to keep migrations safe:
- Generated migration files under `./drizzle` are **committed to the
  repo**, never gitignored — they're the durable migration history, not
  build output.
- **Review the generated SQL** (`drizzle/*.sql`) before applying it,
  especially anything destructive (dropped/renamed columns) — `drizzle-kit
  generate` proposes a diff, it doesn't guarantee it's the intended one.
- **Never hand-edit the database schema outside a migration** (e.g. via
  an ad hoc `ALTER TABLE` in `psql`) — that desyncs the actual schema
  from `drizzle`'s migration journal, and drizzle-kit has no equivalent
  of Prisma's drift-detection safety net to catch it automatically.
- Prefer `db:generate` + `db:migrate` (tracked, reviewable) over `db:push`
  (direct, untracked schema sync) for anything beyond quick local
  scratch iteration.

**Connection pooling in production is a separate, still-open concern.**
The `postgres-js` driver used locally opens a normal TCP connection,
which doesn't suit a serverless deployment well — many concurrent
Vercel Function invocations can each open their own connection and
exhaust Postgres's connection limit. Whichever hosted Postgres provider
ADR-0001 eventually picks (e.g. Neon) needs either a serverless/HTTP
driver (e.g. `@neondatabase/serverless`) or a pooled connection string
(e.g. PgBouncer) swapped in for `src/db/index.ts` at that time — this
ADR covers local development only and does not assume the same driver
carries unchanged into production.
