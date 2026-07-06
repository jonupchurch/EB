# Changelog

A human-readable log of notable pushes to this repository, in reverse
chronological order — updated each time a significant push lands.
Complements `git log` and the Spec Kit artifacts
(`.specify/memory/constitution.md`, `specs/`) with a narrative of how
the product and its architecture evolved.

## 2026-07-06 — Project scaffold & constitution draft

- `chore: scaffold Spec Kit project structure` — initialized `.specify/`
  (memory, scripts, templates, workflows) and `.claude/skills/` via
  GitHub Spec Kit; added the initial `.gitignore`.
- `chore: scaffold Spec Kit project structure and draft constitution`
  (`05c7749`) — drafted the Printing Website constitution v1.0.0
  (spec-driven process, full-stack substance & trustworthy commerce,
  designed/accessible UX, scope discipline, test discipline, legible
  history), adapted from a prior project's constitution but not yet
  ratified. Added `docs/adr/` (README + ADR template), `docs/future-work.md`,
  `docs/non-functional.md`, and a config scaffold (`tsconfig.json`,
  `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`,
  `.github/workflows/ci.yml`, `.nvmrc`).
- `docs: add README, status, and env scaffold` — added `README.md`,
  `status.md`, `CHANGELOG.md` (this file), and `.env.example` (the only
  one of the three env files tracked in the repo); fixed a `.gitignore`
  ordering bug that would have re-ignored `.env.example` after its own
  negation rule.
- `docs: decide on PostgreSQL for persistence` — accepted
  [ADR-0001](docs/adr/0001-postgres-persistence.md): PostgreSQL, running
  locally for development; hosted/production Postgres is still an open
  decision. Updated `.env.example`, the constitution's Technology
  Constraints, and `status.md` to match. No real credentials in any
  tracked file — the local instance's password lives only in the
  gitignored `.env.local`.
- `feat: scaffold the Next.js app` — added `package.json` (Next.js 16,
  React 19, TypeScript, Tailwind v4, Zod), `next.config.ts`,
  `postcss.config.mjs`, `src/app/{layout,page,globals.css}` (plain,
  undecorated baseline — no branding exists yet), and a `public/` folder
  for future static assets. Accepted
  [ADR-0002](docs/adr/0002-drizzle-orm.md): Drizzle ORM over Prisma for
  the query/migration layer, with an explicit note on migration
  discipline (commit generated SQL, review before applying, never
  hand-edit the schema outside a migration) and a flagged follow-up on
  serverless-safe connection pooling once a hosted Postgres provider is
  chosen. Added `src/db/{schema,index}.ts`, `drizzle.config.ts`, an
  initial migration (`drizzle/0000_true_lake.sql`, applied to the local
  database), and a `/api/health` route that proves the connection
  works end-to-end. Added a Vitest DB-connection test and a Playwright
  smoke test (home page + `/api/health`). Pinned `eslint` to `^9.39.4`
  after ESLint 10 crashed under `eslint-config-next@16.2.10`'s bundled
  `eslint-plugin-react` (a rule-context API it doesn't support yet).
  `typecheck`, `lint`, `test`, `build`, and `test:e2e` all pass.
