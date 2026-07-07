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
- `docs: confirm plan-all-before-implement and per-unit commit
  discipline` (`95745cd`) — wrote two previously-implicit workflow
  preferences directly into the constitution: every MVP feature fully
  specified/planned/tasked before implementation starts on any of them,
  and a CHANGELOG.md/status.md update plus commit+push after every unit
  of work rather than batched.

## 2026-07-07 — Brand assets reviewed; accessibility bar softened

- `docs: review Resources/brand for accessibility` — checked every
  color used across the six logo SVGs that landed in
  `Resources/brand/` against WCAG contrast math. The logos themselves
  check out (all pass in their actual context of use, and all six have
  proper `role="img"` + `aria-label`s already). One forward-looking
  note: the light-mode tagline gray (`#8A8378`, 3.75:1 on white) is
  exempt as logotype text, but shouldn't be reused as real body/UI
  copy in light mode without darkening it first — same two-tier
  bright/"-strong" pattern a prior project used for its own
  near-miss colors.
- `docs: soften accessibility bar to a target, not a compliance gate`
  — amended the constitution's Principle III: WCAG 2.1 AA stays the
  goal, but is no longer a hard CI-blocking rule — a close miss
  doesn't block a merge. Reflects that this is a small business's site,
  not one under the compliance exposure that would make WCAG a legal
  requirement here. Updated `docs/non-functional.md`'s Accessibility
  section to match.
