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
- `docs: expand MVP to include promotions, tax, and calculated
  shipping` — reviewed `Resources/models/{mug,shirt,totes,shoppingcart}.md`
  against the frozen MVP boundary. Confirmed the product-customizer /
  bring-your-own-design deferral stays as originally decided (every
  product's "Processing" options include it, but it's the priority
  fast-follow feature, not MVP). Expanded Principle IV's MVP to include
  promotions/discounts (flat, BOGO, promo codes, cart-threshold, free
  shipping/processing), tax-calculation-API-driven sales tax, and a
  calculated/carrier-rate shipping option — these were previously
  (incorrectly) listed as out of scope, before the actual product/cart
  requirements were reviewed. Payment provider is now documented as a
  genuine Stripe-vs-PayPal open choice (`Resources/shared/payment.md`
  lists both), not a "tentatively Stripe" default. Updated Technology
  Constraints, the Sync Impact Report's follow-up TODOs (tax-API and
  shipping-carrier-API ADRs now owed), and `docs/non-functional.md`
  (new "Promotions, tax & shipping" section; removed premature
  upload-limit rows for the deferred customizer feature).
- `docs: accept contrast exceptions in the Ember Design System v0.1
  mockup` — added `Resources/brand/Ember Design System.html` (a
  bundled/exported token+component mockup) and accepted
  [ADR-0003](docs/adr/0003-accepted-contrast-exceptions-ember-v0.1.md):
  three specific color pairings (a promo-code empty state + cart icon,
  a checkmark icon, and a "product photo" placeholder label) fail
  contrast despite the file's own claim of full WCAG AA compliance, but
  none are load-bearing to completing an order, so they're accepted
  as-is per Principle III's target-not-gate accessibility stance rather
  than fixed now. Updated the ADR index and `status.md`.
- `docs: review storefront wireframes` — added
  `Resources/wireframes/Store Pages.html` (browse/product/cart,
  desktop + mobile). Extended
  [ADR-0003](docs/adr/0003-accepted-contrast-exceptions-ember-v0.1.md)
  (retitled to cover mockups/wireframes generally, same file) with
  three more accepted contrast exceptions — one, a muted-gray filter
  label and per-category item counts, is the same color failing for
  the third independent time, now on permanent UI rather than a
  placeholder, and is called out as the one to fix for real if it
  recurs again. Confirmed the wireframe's "Custom" nav placeholder is
  intentional (noted in `docs/future-work.md`, not a scope violation)
  and that the cart's missing promo-code field isn't a gap — that
  likely belongs to a not-yet-designed checkout-step wireframe.
- `resources: add brand icon set, reformat product/equipment reference`
  — added ~48 UI icons and refreshed logo exports to
  `Resources/brand/assets/`. Reformatted `Resources/products/productinfo.md`
  from unstructured plain text into proper markdown (equipment table +
  per-category sections) for readability. This file reveals a much
  larger real product range (dozens of categories: apparel, drinkware,
  home decor, weddings, jewelry, office, promo, restaurant, event, pet,
  kitchen, holiday, crafts, leather, acrylic, wood, metal, UV-printed,
  electronics) than the handful of example products used in wireframes
  so far — noted in `status.md` as relevant context for scoping the
  catalog feature later.
- `docs: fix the muted-gray contrast token, clarify custom-design scope`
  — added `Resources/wireframes/Admin Screens.html` (orders queue,
  order detail, products list, product editor, discounts, shipping &
  fees). The recurring `#9A9088`/`#8A8378`/`#7C756C` contrast failure
  hit table column headers and price-field currency symbols this time
  — core, unavoidable UI — crossing the threshold ADR-0003 set for
  when to stop excepting it. Accepted
  [ADR-0004](docs/adr/0004-darken-muted-text-token.md): darken the
  muted-text token to `#6B6560` (already used successfully elsewhere in
  the same wireframes, verified AA-safe against every light background
  in the palette). ADR-0003 updated to cross-reference this as
  superseding its gray-family entries. Also clarified in
  `docs/future-work.md`: the admin Product Editor's "Bring your own
  design"/"Custom design service" pricing configuration is fine to
  build as MVP scope (just data entry) — only the customer-facing
  storefront upload/ordering flow stays deferred to the fast-follow
  feature.
- `docs: decide on PayPal for MVP payments (ADR-0005)` — the admin
  wireframe's payment settings panel showed both Stripe and PayPal as
  simultaneously connectable, prompting a real decision rather than
  leaving it open: PayPal is the MVP payment processor
  ([ADR-0005](docs/adr/0005-paypal-for-mvp-payments.md)); Stripe is a
  planned fast-follow (`docs/future-work.md`), not multi-processor
  support at launch. Updated the constitution's Technology Constraints
  and Sync Impact Report, `docs/non-functional.md`'s Payments &
  compliance section, and swapped the `STRIPE_*` placeholder vars in
  `.env.example`/`.env.local` for `PAYPAL_*` ones (no real secrets
  involved — both were empty).
- `resources: format legal docs, swap business name` — formatted
  `Resources/shared/privacy.md` and `Resources/shared/terms and
  condition.md` into markdown and replaced "Bespoke Pet Design"
  (the unrelated business the template was drafted for) with "Erica
  Burns Things" throughout. Flagged clearly (in the files and in
  `docs/future-work.md`) that the substantive clauses still describe
  the wrong business — digital art commissions, an unconditional
  no-refunds policy conflicting with the Refund/Reprint order status,
  NFT rights language, Ohio jurisdiction/fulfillment — a real rewrite
  is deferred, not done, per a deliberate quick-pass choice.
