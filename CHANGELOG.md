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
- `docs: review proposed launch catalog` — added
  `Resources/products/Launch Catalog.html`: a proposed 22-SKU,
  5-category day-one launch list (Apparel, Drinkware, Wood & Signs,
  Totes & Bags, Home & Decor; $12-54; 14 made-to-order/8 stockable),
  with Gifts & Keepsakes and Stickers & Crafts held for a phase-2 drop.
  Verified the summary numbers against every row. Clarified in the
  constitution that the catalog's "stockable" label is an internal
  fulfillment note only, not customer-facing inventory tracking —
  Principle IV's inventory exclusion stands as originally written, no
  scope change. Flagged in `docs/future-work.md`: the Recipe Board's
  "handwriting-to-engrave" variant is confirmed to be a customer photo
  upload, conflicting with the deferred custom-design boundary — needs
  resolving (cut or restrict to plain custom text) before the catalog
  is finalized.
- `docs: review checkout & confirmation wireframe, fix stale Stripe
  reference` — added `Resources/wireframes/Checkout & Confirmation.html`
  (desktop + mobile checkout, and order confirmation). Confirms the
  promo-code field lives on checkout (as assumed earlier), and the
  full pricing breakdown/personalization/confirmation-timeline all
  match decisions already made. Found the Payment section defaulted to
  "Credit / debit card — via Stripe" with PayPal as a secondary
  redirect option — contradicting ADR-0005. Confirmed with Jon this is
  stale content, not a reconsideration: updated ADR-0005 with a note
  that checkout should build PayPal-only for MVP (including PayPal's
  own direct-card-entry option), and that the express PayPal button's
  low-contrast "Pal" text is PayPal's own brand color, not something to
  redesign — use their official Buttons SDK rather than hand-rolling
  it. Updated `docs/future-work.md` and `status.md` to match.
- `docs: decide on Auth.js for Google SSO (ADR-0006)` — Auth.js over
  Clerk for the admin queue's Google SSO: the actual requirement is
  narrow (exactly two known accounts gating one admin area), so a full
  managed auth product was more than needed. Updated the constitution's
  Technology Constraints, the ADR index, and the Sync Impact Report's
  follow-up TODOs (Google SSO item resolved). Added `AUTH_SECRET` to
  `.env.example`/`.env.local`.
- `docs: reorder MVP build sequence — admin product management first`
  — decided the build order: admin product management (Auth.js shell +
  Products list + Product Editor) ships as feature 1, specifically so
  real products can be loaded before any storefront work begins. Order
  queue, Discounts, and Shipping & Fees settings move to sequence
  with/after checkout instead, since they're not useful until real
  orders exist. Updated `status.md`'s feature table and next steps.
- `docs: ratify the constitution, v1.0.0` — closed out the Sync Impact
  Report's day-and-a-half drafting narrative (preserved in this file
  and `status.md`, not repeated in the constitution itself) and
  updated the Ratified/Last Amended dates to 2026-07-07. All six ADRs
  (PostgreSQL, Drizzle, three accessibility-token decisions, PayPal,
  Auth.js), the expanded MVP scope (promotions/tax/shipping), and the
  target-not-gate accessibility bar are now the settled ground rules.
  Refreshed `README.md` to match (PayPal/Auth.js named directly, ADR
  count updated, build-order note added). Next: `/speckit-specify` for
  feature 1, admin product management.
- `spec: admin product management` (`specs/001-admin-product-management/`)
  — ran `/speckit-specify` for feature 1. Four prioritized user stories
  (create a product P1, view the products list P2, edit an existing
  product P3, duplicate a product P4), 13 functional requirements, 5
  measurable success criteria, and a documented set of assumptions
  (evolvable category list, no hard delete, Draft products never
  customer-visible). No `[NEEDS CLARIFICATION]` markers needed — the
  ratified constitution, accepted ADRs, and reviewed wireframes/product
  models already had informed defaults for every ambiguous point.
  Quality checklist (`checklists/requirements.md`) passed clean on the
  first pass. Next: `/speckit-plan`.
- `plan: admin product management` (`specs/001-admin-product-management/`)
  — ran `/speckit-plan`. Added `plan.md` (Technical Context, Constitution
  Check — all six principles pass), `research.md` (product/options
  schema shape, money-as-integer-cents, Auth.js allow-list enforcement,
  admin rate-limiting approach), `data-model.md` (Category, Product,
  and six option-type entities), `contracts/actions.md` (Server Action
  interfaces: getProducts, getCategories, getProduct, createProduct,
  updateProduct, duplicateProduct), and `quickstart.md`. One new ADR
  owed: `docs/adr/0007-product-options-schema.md` (relational tables
  per option category, over a generic key-value table or a JSON blob),
  to be authored during `/speckit-tasks`/implementation. Constitution
  Check re-passed after design with no violations.
- `fix: connect to Postgres lazily, not at module import` (`4dc0cd8`)
  — provisioned **Neon** Postgres and **Vercel Blob** via the Vercel
  Marketplace, connected to the `ericaburnsthings` project's Production/
  Preview environments. Linking and verifying the connection surfaced a
  real bug: `src/db/index.ts` validated `DATABASE_URL` and connected to
  Postgres eagerly at module import time — but Marketplace-provisioned
  secrets are runtime-only and aren't present during `next build`'s
  page-data collection step (which imports every route module), so
  every Production build failed with "DATABASE_URL is not set" despite
  the variable being correctly configured. Fixed by making the client
  connect lazily on first query, via a `Proxy`-wrapped `db` export.
  Verified end-to-end: a fresh Production deployment builds
  successfully and `GET /api/health` on the live deployment returns
  `{"status":"ok","db":"connected"}`. Also cleaned up a `.gitignore`
  env-file pattern that `vercel link` had re-broken (the negation must
  stay last to win). Recorded as [ADR-0008](docs/adr/0008-neon-for-hosted-postgres.md)
  — closes the constitution's "choose hosted Postgres provider"
  follow-up (constitution v1.0.0 → v1.0.1, patch). Vercel Blob was
  provisioned but not fully connected at first: no `BLOB_READ_WRITE_TOKEN`
  existed (only `BLOB_STORE_ID`/`BLOB_WEBHOOK_PUBLIC_KEY`). Fixed via
  `vercel integration-resource disconnect`/`connect` (scoped to
  Production/Preview), which provisioned the token correctly. Verified
  with a real upload/fetch/delete round-trip against the live store.
  Both pieces of real infrastructure are now confirmed working
  end-to-end.
- `tasks: admin product management` (`specs/001-admin-product-management/tasks.md`)
  — ran `/speckit-tasks`. 31 tasks: 2 Setup, 12 Foundational (schema +
  migration; Auth.js config with the two-account `signIn` allow-list
  callback and a test-only Credentials provider for deterministic e2e
  sign-in; shared pricing/rate-limit/Zod-schema helpers; category
  actions), then US1–US4 in priority order (US1 create is the
  independently-shippable MVP slice; US2's list, US3's edit, and US4's
  duplicate each reuse US1's shared Product Editor component), and a
  Polish phase (full `quickstart.md` pass, an accessibility spot-check
  against ADR-0003/0004, the full check suite, and a status/changelog
  update). Next: `/speckit-specify` for feature 2 (catalog & browsing),
  per the plan-all-before-implement workflow.
- `docs: amend admin product management for 1..n product images`
  — caught a real gap before drafting feature 2's spec: feature 1's
  data model never captured a product image, despite Vercel Blob
  having been provisioned specifically for that purpose. Amended
  `spec.md` (FR-014/FR-015, new acceptance scenario, edge cases,
  `Product Image` entity, SC-006), `data-model.md` (`product_images`
  table), `research.md` (server-side `put()` upload decision),
  `contracts/actions.md` (`addProductImage`, `removeProductImage`,
  `reorderProductImages`; `getProduct`/`duplicateProduct` extended),
  `plan.md` (`@vercel/blob` dependency, new file), and regenerated
  `tasks.md` (31 → 37 tasks, clean renumbering since nothing had been
  implemented yet). New [ADR-0009](docs/adr/0009-vercel-blob-for-product-images.md)
  records the upload-mechanism decision (server-side `put()` via a
  Server Action, not a client-direct-upload token flow — product
  photos are small and Vercel Functions now accept 100MB bodies).
  Constitution bumped to v1.0.2 (patch): Vercel Blob recorded as the
  file-storage choice in Technology Constraints, alongside Neon.
- `spec: catalog & browsing` (`specs/002-catalog-browsing/`) — ran
  `/speckit-specify` for feature 2. Two prioritized user stories (P1
  browse by category, P2 view a product and configure it to see an
  accurate price), 10 functional requirements, 5 measurable success
  criteria, zero `[NEEDS CLARIFICATION]` markers. Explicitly excludes
  processing options that need the still-deferred customer
  design-upload flow from customer selection (FR-006) rather than
  offering a broken choice — consistent with feature 1's own scoping.
  Zero new persisted entities: this feature reads feature 1's
  `Product`/`Category`/option tables, filtered to `status = active`.
  Quality checklist passed clean on the first pass. Next: `/speckit-plan`.
- `docs: amend admin product management for FR-016 and shared pricing`
  — while planning feature 2, caught two more small cross-feature gaps
  before they could cause rework. Feature 1 gains FR-016 and a
  `requiresCustomerUpload` boolean on Processing Option, so feature 2
  can exclude not-yet-orderable options (e.g., "bring your own
  design") by a real flag rather than guessing from label text. The
  shared running-total function also moves from
  `src/lib/admin/pricing.ts` to `src/lib/pricing.ts`, since feature 2's
  product detail page reuses it too. Both changes cost nothing since
  neither feature had been implemented yet.
- `plan: catalog & browsing` (`specs/002-catalog-browsing/`) — ran
  `/speckit-plan`. Added `plan.md` (Technical Context, Constitution
  Check — all six principles pass), `research.md` (SSR over ISR for
  Draft-hiding correctness, reused pricing logic, a separate
  `(storefront)` route group so the real shell never wraps `/admin`,
  server-side processing-option filtering), `data-model.md` (zero new
  tables — a pure read layer over feature 1, filtered to
  `status = 'active'`), `contracts/queries.md` (three read-only
  queries: `getActiveCategories`, `getActiveProductsByCategory`,
  `getActiveProduct`), and `quickstart.md`. One new ADR owed:
  `docs/adr/0010-catalog-rendering-strategy.md`. Constitution Check
  passed with no violations.
- `tasks: catalog & browsing` (`specs/002-catalog-browsing/tasks.md`)
  — ran `/speckit-tasks`. 17 tasks: a lean Setup+Foundational (the
  ADR, a placeholder image asset, real branding metadata replacing the
  scaffold placeholder, and the `(storefront)` route-group shell), then
  US1 (browse — the independently-shippable MVP slice) and US2
  (product detail + accurate live pricing, reusing feature 1's pricing
  function outright rather than reimplementing it), and a Polish phase
  that folds a concrete LCP target back into `docs/non-functional.md`.
  No new database tables or Server Actions anywhere in this feature —
  a pure read layer over feature 1's data. Next: `/speckit-specify` for
  feature 3 (cart & checkout).
- `docs: amend admin product management for shipping weight/dimensions`
  — while scoping feature 3, caught that `Product` had no weight or
  package dimensions despite the constitution already committing to
  calculated/carrier-rate shipping for MVP. Amended feature 1 (FR-017,
  `data-model.md`, `contracts/actions.md`'s `createProduct` input,
  `tasks.md`) to add optional `weightOz`/`lengthIn`/`widthIn`/`heightIn`
  fields — one packaged value per product, not per option, since
  per-size-exact weight isn't needed at this business's scale.
- `spec: cart & checkout` (`specs/003-cart-checkout/`) — ran
  `/speckit-specify` for feature 3. Three prioritized user stories (P1
  build/review a cart, P2 an accurate checkout total with promo/tax/
  shipping, P3 pay via PayPal with a webhook-verified paid order), 15
  functional requirements, 5 measurable success criteria, zero
  `[NEEDS CLARIFICATION]` markers. Finalizes **TaxJar** as the tax
  provider (the constitution's prior "leaning TaxJar" note is now a
  real decision). Explicitly excludes admin promotion/shipping/tax
  configuration UI and the customer-facing confirmation page — both
  separate, later features. Flags a real Cart (live-recomputed) vs.
  Order (frozen historical snapshot) distinction for planning. Quality
  checklist passed clean on the first pass. Next: `/speckit-plan`.
- `plan: cart & checkout` (`specs/003-cart-checkout/`) — ran
  `/speckit-plan`. Closed two long-open constitution follow-ups:
  **TaxJar** for sales tax, **Shippo** for calculated/carrier-rate
  shipping (chosen after confirming a later provider swap stays
  contained — one interface, one module). Decided the cart is a
  client-held cookie reference, never a server table (research.md's
  "Cart architecture" decision) — nothing is persisted until an Order
  exists. Decided PayPal integration is direct REST calls (Orders v2 +
  Webhooks), no SDK, for full transparency around webhook signature
  verification. `order_items` deliberately snapshots as JSON at
  purchase time — the one considered exception to this project's
  typed-table preference, since a paid order is history, not live
  data. Four new ADRs owed: 0011 (cart architecture), 0012 (TaxJar),
  0013 (Shippo), 0014 (PayPal REST integration). Added `contracts/actions.md`
  (cart/checkout Server Actions plus the PayPal webhook Route Handler)
  and `quickstart.md`. Added `TAXJAR_API_KEY`/`SHIPPO_API_KEY` to
  `.env.example`/`.env.local`. Constitution Check passed with no
  violations.
- `tasks: cart & checkout` (`specs/003-cart-checkout/tasks.md`) — ran
  `/speckit-tasks`. 32 tasks: Setup (dependencies + 4 ADRs), a
  substantial Foundational phase (schema; the checkout rate limiter;
  the cart-cookie helper; and all four external-integration modules —
  tax, shipping, promotions, PayPal — each shipping with a
  deterministic test fake from the start, this project's established
  pattern), then US1 (cart — the MVP slice), US2 (accurate checkout
  total), and US3 (real, webhook-verified payment), plus Polish. Flags
  that this feature's tasks depend on features 1–2 being *implemented*
  already, not just planned, since it imports their code directly.
  Next: `/speckit-specify` for feature 4 (order confirmation).
- `spec: order confirmation` (`specs/004-order-confirmation/`) — ran
  `/speckit-specify` for feature 4. Three prioritized user stories (P1
  an accurate confirmation page right after paying, gracefully
  handling a still-verifying payment; P2 a one-time confirmation email
  via **Resend**, confirmed with Jon before drafting; P3 the page
  working correctly on a later revisit), 12 functional requirements, 4
  measurable success criteria, zero `[NEEDS CLARIFICATION]` markers.
  Flags the confirmation URL's own unguessability as a genuine security
  requirement, since no customer account system exists. Adds no new
  core entity, just a small "email already sent" flag on feature 3's
  Order. Quality checklist passed clean on the first pass. Next:
  `/speckit-plan`.
- `docs: amend cart & checkout for confirmation token and email tracking`
  — while planning feature 4, added `confirmationToken` (a dedicated
  random public identifier — this project's IDs are otherwise
  sequential, and FR-012 requires the confirmation URL be
  unguessable) and `confirmationEmailSentAt` (for a one-time-send
  guarantee) to feature 3's `orders` table. Zero cost — feature 3
  isn't implemented yet.
- `plan: order confirmation` (`specs/004-order-confirmation/`) — ran
  `/speckit-plan`. One new ADR owed: `docs/adr/0015-resend-for-transactional-email.md`
  (confirmed with Jon before drafting the spec). The brief
  "confirming payment" window is handled with simple client polling
  (2s interval, 60s timeout) rather than push/WebSockets — judged
  unjustified complexity for a state that resolves in seconds for the
  overwhelming majority of orders. No new database table — this
  feature reads feature 3's `orders`/`order_items` plus the two
  columns added above. Added `contracts/actions.md`
  (`getOrderConfirmation`, the internal `sendConfirmationEmail`) and
  `quickstart.md`. Added `RESEND_API_KEY` to `.env.example`/`.env.local`.
  Constitution Check passed with no violations.
- `tasks: order confirmation` (`specs/004-order-confirmation/tasks.md`) — ran
  `/speckit-tasks`. 15 tasks: Setup (the `resend` dependency and its
  ADR), a one-task Foundational phase (`getOrderConfirmation`, shared
  by US1 and US3), then US1 (confirmation page + confirming→paid
  polling — the MVP slice), US2 (the one-time email, wired into
  feature 3's PayPal webhook handler), and US3 (dynamic rendering +
  a revisit/privacy test — deliberately thin, since US1's fresh-fetch
  design already does most of the work), plus Polish. Smallest task
  count of the four MVP features tasked so far. Next: `/speckit-specify`
  for feature 5 (admin: orders, discounts, shipping & fees) — the last
  MVP feature.
- `spec: admin orders, discounts, shipping & fees` (`specs/005-admin-orders-discounts/`)
  — ran `/speckit-specify` for feature 5, the last MVP feature. Three
  prioritized user stories (P1 work the order queue through to
  fulfillment, P2 create/manage promotions, P3 set the flat shipping
  rate), 13 functional requirements, 5 measurable success criteria,
  zero `[NEEDS CLARIFICATION]` markers. The fulfillment state machine
  only allows one forward step at a time (`paid`->`in production`->`shipped`;
  `placed`->`paid` stays webhook-only, never admin-settable). This
  feature is the first to actually CRUD feature 3's `promotions` table
  — feature 3 only read/applied it. "Shipping & fees" resolved to
  exactly one setting (the flat-rate amount) since tax/calculated
  shipping stay fully dynamic via TaxJar/Shippo. Quality checklist
  passed clean on the first pass. Next: `/speckit-plan`.
- `docs: amend cart & checkout for feature 5's order status and promotion FK`
  — while planning feature 5, amended feature 3's `orders` table
  (not yet implemented, zero cost): `status`'s enum now includes
  `in production`/`shipped` up front (avoids a later `ALTER TYPE`),
  and `promotionId`'s foreign key now explicitly specifies
  `ON DELETE SET NULL` (the schema-level guarantee that deleting a
  promotion never touches or blocks deleting order history).
- `plan: admin orders, discounts, shipping & fees` (`specs/005-admin-orders-discounts/`)
  — ran `/speckit-plan`. Zero new ADRs owed — every technology here
  (database, Auth.js, admin rate limiter) was already decided by
  features 1/3; this feature composes them. Order status transitions
  go through an explicit allowed-transition map
  (`src/lib/admin/order-status.ts`), directly implementing Principle
  II's state-machine requirement. Adds one new table, `shop_settings`
  — a deliberate single-row table (not a generic key-value store) for
  the one shop-wide setting this project currently has. Polish phase
  finally adds the "full vertical slice" Playwright e2e Principle V
  has required since ratification — uncompletable until this feature's
  admin queue existed. Added `contracts/actions.md` (orders, promotions,
  shipping settings Server Actions) and `quickstart.md`. Constitution
  Check passed with no violations.
- `fix: add feature 3's missing Playwright e2e task` — while drafting
  feature 5's tasks, found that feature 3's `tasks.md` never actually
  created the Playwright e2e task its own `plan.md` had committed to
  (features 1, 2, and 4 each have one). Added `e2e/cart-checkout.spec.ts`
  as feature 3's new T028 (the full browse -> cart -> checkout -> pay
  vertical slice via the fake PayPal provider), renumbering its Polish
  phase (T028-T032 -> T029-T033). Zero cost -- feature 3 isn't
  implemented yet.
- `tasks: admin orders, discounts, shipping & fees` (`specs/005-admin-orders-discounts/tasks.md`)
  — ran `/speckit-tasks`. 21 tasks: a nearly-empty Setup (no new
  dependencies or ADRs), a 3-task Foundational phase (`shop_settings`),
  then US1 (order queue/fulfillment — the MVP slice), US2 (promotion
  CRUD), and US3 (the flat shipping rate — deliberately thin, matching
  its own P3 rationale), plus Polish. Polish adds
  `e2e/full-vertical-slice.spec.ts` — the one happy-path end-to-end
  test Constitution Principle V has required since ratification,
  finally completable now that the admin queue exists.

**All five MVP features are now specified, planned, and tasked.** Next:
`/speckit-implement`, starting with feature 1's `tasks.md`.
- `fix: add Postgres service to CI` (`.github/workflows/ci.yml`) — a
  pre-implementation review found CI had no database access at all
  (no service container, no `DATABASE_URL`), yet
  `tests/db/connection.test.ts` and `e2e/health.spec.ts` already assert
  a live, connected database — both the `quality` and `accessibility`
  jobs were at risk of failing the moment either ran. Added a
  `postgres:16` service container, a `DATABASE_URL` env pointing to
  it, and an `npm run db:migrate` step before tests, on both jobs.
  Caught before feature 1 adds real schema and substantially more
  DB-backed tests.
