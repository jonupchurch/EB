# Research: AI Product Description Writer/Editor

Phase 0 output for `specs/008-ai-product-descriptions/plan.md`. No `[NEEDS
CLARIFICATION]` markers remained in the Technical Context. This is the
project's first AI/LLM feature, so — unlike features 5–7 — several
genuinely new decisions are made here rather than composed from an
earlier ADR.

## Provider: Vercel AI Gateway, not a direct provider SDK

- **Decision**: call the model through the Vercel AI SDK's plain
  `"provider/model"` string form (e.g. `"anthropic/claude-sonnet-4.6"`),
  which routes through the Vercel AI Gateway automatically. No
  `@ai-sdk/anthropic` (or any other provider-specific package), no
  manually-obtained API key.
- **Rationale**: the Gateway authenticates via OIDC (`vercel env pull`
  provisions a short-lived `VERCEL_OIDC_TOKEN`) — there is no separate
  account to create or API key to store, unlike TaxJar/Shippo/PayPal/
  Resend, which each needed a real vendor credential in `.env.local`.
  This is also this session's default Vercel guidance: prefer plain
  gateway model strings unless a feature explicitly needs a specific
  provider's own capability. Zero markup either way, and switching
  models later is a one-line string change, not a new integration.
- **Alternatives considered**: a direct provider SDK — rejected, since
  it would require obtaining and storing a real provider API key for a
  feature that has no requirement for any provider-specific capability
  (e.g. computer use, a fine-tuned endpoint); the Gateway's zero-markup
  pricing and OIDC auth make it strictly simpler here.
- **ADR owed**: `docs/adr/0018-vercel-ai-gateway-for-product-descriptions.md`
  — this project's first AI/LLM provider decision.

## Model: Claude Haiku 4.5, chosen for cost

- **Decision**: default to Anthropic's **Claude Haiku 4.5** ($1/$5 per
  million input/output tokens) rather than a larger model. The exact
  Vercel AI Gateway slug string is confirmed at implementation time via
  `gateway.getAvailableModels()` rather than hardcoded from memory here
  — Gateway slugs aren't guaranteed to match a provider's raw API model
  ID 1:1, and guessing risks a 400 on a model string that doesn't exist.
- **Rationale**: writing or polishing a short product description from
  a handful of structured fields (name, category, styling/material,
  price, options) is a lightweight text-generation task with no
  multi-step reasoning, tool use, or long-context need — exactly what a
  small, fast model is for. Explicitly confirmed with Jon (2026-07-14):
  cost is the deciding factor here, not maximum quality.
- **Alternatives considered**: a larger/more capable model (e.g.
  Sonnet-tier) — rejected as unnecessary cost for this task's actual
  difficulty; a similarly-cheap model from another provider (e.g.
  Gemini Flash) — not rejected on merit, just not chosen, since Jon
  confirmed proceeding with the Anthropic option rather than comparing
  further. Switching later is a one-line model-string change, per the
  Gateway's own no-lock-in design (research.md's provider decision
  above) — this choice is cheap to revisit if description quality ever
  disappoints.

## Structured output via `generateObject`, not `generateText` + manual parsing

- **Decision**: call the AI SDK's `generateObject` with a small Zod
  schema (`{ description: string }`), not `generateText` with the raw
  string treated as the answer.
- **Rationale**: Constitution Principle II requires "Zod-validated
  output before use" for any AI-assisted capability — `generateObject`
  enforces that validation as part of the call itself (it throws if the
  model's response doesn't parse against the schema), rather than
  trusting raw text and validating it after the fact as a bolted-on
  afterthought. This mirrors how every other trust-boundary crossing in
  this project (webhook payloads, admin mutations) is validated by a
  Zod schema at the point of use, not downstream of it.
- **Alternatives considered**: `generateText` plus a manual
  `z.string().safeParse()` on the result — rejected as strictly weaker
  for no benefit; `generateObject` gets the same guarantee for free and
  additionally structures the response for straightforward future
  extension (e.g. a second field) without a new parsing layer.

## One Server Action, not two ("Generate" and "Improve" are the same call)

- **Decision**: a single `suggestDescription` Server Action (backed by a
  single `suggestProductDescription` provider function) takes an
  optional `currentDescription`. When absent, the prompt asks the model
  to write a first draft from the product's structured data alone
  (US1); when present, the prompt asks it to rewrite/polish that text
  using the same structured data as context (US2). The Product Editor's
  "Generate" and "Improve" buttons are simply two call sites for the
  same action, differing only in whether they pass the current
  textarea value.
- **Rationale**: US1 and US2 share every real concern — auth, rate
  limiting, input shape, output shape, error handling — and differ only
  in one optional field and the wording of the prompt built from it.
  Two near-identical Server Actions (and two near-identical fakes to
  keep in sync) would be needless duplication for a distinction that's
  really just "is there a `currentDescription` argument."
- **Alternatives considered**: separate `generateDescription`/
  `improveDescription` actions — rejected as pure duplication; nothing
  about auth, rate limiting, validation, or error handling differs
  between the two modes.

## Reusing `CHECKOUT_FAKE_PROVIDERS` as the fake-provider gate

- **Decision**: `description-writer.ts` checks
  `process.env.CHECKOUT_FAKE_PROVIDERS === "true"` — the exact same flag
  TaxJar/Shippo/PayPal/Resend already use — rather than introducing a
  new, feature-specific flag.
- **Rationale**: feature 4's confirmation email (`src/lib/confirmation/
  email.ts`) already established that this flag means "don't call any
  real external paid/nondeterministic service in automated tests,"
  despite its checkout-era name, not "checkout-specific behavior only."
  `vitest.setup.ts` and `playwright.config.ts`'s `webServer.env` already
  force this flag for every automated test run — reusing it means this
  feature's tests are deterministic and cost nothing with zero new test
  infrastructure, and there's exactly one switch to reason about for
  "are we faking external providers right now" across the whole app.
- **Alternatives considered**: a new `PRODUCT_AI_FAKE_PROVIDER` flag —
  rejected; it would need its own wiring into both test configs for no
  behavioral difference from the existing single switch, and would
  fragment what this project has consistently treated as one concern.

## The fake: a deterministic template, not a canned constant string

- **Decision**: the fake path builds a short, deterministic string
  directly from the input fields it was given (e.g. interpolating the
  product name and category into a fixed template), rather than always
  returning one hardcoded sentence regardless of input.
- **Rationale**: makes the Vitest/e2e assertions actually verify that
  the real input data reaches the provider call (name, category,
  styling, price, current description) rather than merely proving a
  Server Action can be called — the same reasoning `tax.ts`'s fake uses
  a computed rate rather than a hardcoded tax figure.
- **Alternatives considered**: a single hardcoded string — rejected,
  since it can't distinguish "the right data reached the function" from
  "the function was called at all."

## Rate limiting and error handling: fully reused, nothing new

- **Decision**: `suggestDescription` calls the existing
  `checkAdminRateLimit()` exactly like every other admin mutation, and
  returns the project's standard `{ ok: false, error: ... }` shape on
  any failure (validation, rate limit, or a caught provider error) —
  never a thrown, uncaught exception reaching the client, and never any
  write to the `products` table on any path.
- **Rationale**: FR-008/FR-009 ask for exactly the behavior this
  project's admin actions already have; there's no reason to design
  something new when the existing pattern already satisfies the
  requirement.
- **Alternatives considered**: a dedicated, more permissive rate limit
  for AI calls (since they cost real money per call, unlike a database
  write) — considered and rejected for now: at this business's scale
  (two admins, a modest catalog) the existing 60/minute admin-wide
  limit is already far more conservative than realistic usage would
  ever approach; revisit only if real cost data ever suggests otherwise.

## Non-functional target folded in

- **Decision**: adds a concrete latency target to
  `docs/non-functional.md`'s Performance table — a single
  generate/improve request completes in a few seconds — and notes the
  cost-per-request logging expectation `docs/non-functional.md` already
  flagged as owed "if an AI feature is ever added" (it now has been).
- **Rationale**: closes a standing placeholder the non-functional doc
  has carried since the constitution was drafted, the same way feature
  2/3 closed the LCP/checkout-step-transition placeholders when they
  were the first feature to need a real number.

## Reused infrastructure (not re-decided)

- **Admin auth gate & rate limiter**: unchanged from feature 1
  (`src/auth.ts`'s allow-list, `src/lib/admin/rate-limit.ts`).
- **Product Editor's save flow**: entirely unchanged — this feature
  only ever writes into the same client-side `description` state the
  textarea already controls; the existing `createProduct`/
  `updateProduct` Server Actions are what persist it, exactly as today.
- **Accessibility bar**: unchanged from Principle III as amended.

## Architecture Decision Records

- One ADR owed: `docs/adr/0018-vercel-ai-gateway-for-product-descriptions.md`
  (Vercel AI Gateway over a direct provider SDK — this project's first
  AI/LLM provider decision).
