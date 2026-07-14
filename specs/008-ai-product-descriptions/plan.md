# Implementation Plan: AI Product Description Writer/Editor

**Branch**: `008-ai-product-descriptions` | **Date**: 2026-07-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-ai-product-descriptions/spec.md`

## Summary

Adds "Generate" (blank description → first draft) and "Improve" (existing description → polished alternative) actions to the admin Product Editor, both calling one small server-side function that sends the product's current, possibly-unsaved form data (name, category, styling/material, price, options, current description) to a text model through the Vercel AI Gateway and returns a single reviewable draft string. The draft only ever reaches the product record through the Product Editor's existing save action — this feature never persists anything on its own. This is the project's first AI/LLM integration, so it's the first feature to exercise Constitution Principle II's AI-specific clause directly: server-side-only, behind a small swappable-provider interface, Zod-validated output, with a deterministic fake for all automated tests (this project's established provider/fake-provider pattern, mirroring TaxJar/Shippo/PayPal/Resend).

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22.18.0 LTS (per `.nvmrc`) — unchanged

**Primary Dependencies**: Next.js 16.2.10 (App Router), React 19.2.7, Zod 4.4.3 — plus one new dependency, `ai` (Vercel AI SDK, ^6.x), used via plain `"provider/model"` strings so it routes through the Vercel AI Gateway automatically (no `@ai-sdk/<provider>` package, no manual API key — Gateway auth is OIDC-based)

**Storage**: PostgreSQL (Neon in Production/Preview, local for dev) — **no schema change**. This feature reads/writes nothing new; it returns a plain string to the client, which flows into the Product Editor's existing `description` field and existing save action (feature 1)

**Testing**: Vitest (the provider module's fake path — deterministic output shape, Zod validation of the model's structured output, the "name required" guard) and an extension of `e2e/admin-products.spec.ts` (Generate then Improve, through the real admin UI, using the deterministic fake — no real model call in CI)

**Target Platform**: Web, deployed to Vercel (Node.js runtime / Fluid Compute) — same target as every prior feature

**Project Type**: Web application — extends the existing single Next.js app; no new route. One new Server Action reachable only from the existing, already Auth.js-gated `/admin/products` Product Editor.

**Performance Goals**: A single generation/improvement request should resolve in a few seconds — folded into `docs/non-functional.md` as a concrete target during this plan (see below); no streaming UI (spec's Assumptions — a single request/response is sufficient at this scale).

**Constraints**: Every model call MUST be server-side only, behind a small swappable-provider interface with a deterministic fake gated the same way every other paid external dependency already is in this project (`CHECKOUT_FAKE_PROVIDERS`, despite its checkout-era name — feature 4's confirmation email already established the precedent of reusing this one project-wide switch rather than inventing a per-feature flag). The model's output MUST be validated against a Zod schema before it ever reaches the client (Principle II) — using the AI SDK's `generateObject` (schema-validated structured output) rather than raw `generateText`, so validation is enforced by the SDK itself, not bolted on after the fact. Every request MUST pass through the existing admin rate limiter (`checkAdminRateLimit`) — no new limiter. A request MUST NOT be attempted for a product with no name (FR-011) — enforced by the input Zod schema, not the model.

**Scale/Scope**: Same single-business scale as every other admin feature — a handful of concurrent uses by two known admin users, a modest product catalog; no performance concern beyond the per-request latency target above.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS | One new ADR owed: `docs/adr/0018-vercel-ai-gateway-for-product-descriptions.md` (Vercel AI Gateway over a direct provider SDK) — this project's first-ever AI/LLM provider decision, so unlike features 5–7 it isn't already covered by an earlier ADR. |
| II. Full-Stack Substance & Trustworthy Commerce | PASS | This is the feature Principle II's own AI-specific clause was written in anticipation of ("If a future feature adds an AI-assisted capability... it MUST follow this same discipline: server-side-only calls behind a small swappable provider interface, with Zod-validated output before use"). The plan below implements exactly that, plus the established fake-provider testing convention. |
| III. Designed, Accessible Experience | PASS | Two new buttons and a review/diff-style presentation inside the already-designed Product Editor form — no new screen. Loading/error states for the two new buttons need the same design discipline (Principle III) as every other admin action already has (e.g. image upload's pending/error states). |
| IV. Product Judgment & Scope Discipline | PASS | Matches `docs/future-work.md`'s "AI-assisted design feature" entry's own requirement ("it MUST follow the same server-side-only, swappable-provider, Zod-validated-output discipline as every other integration") and stays inside the boundary spec.md draws: admin-only, one product at a time, no customer-facing surface, no new persistence. |
| V. Test Discipline | PASS | Vitest covers the provider module's fake path and input validation; the e2e extension exercises Generate/Improve through the real UI using the deterministic fake, so CI never calls a real model (no cost, fully deterministic, matching the TaxJar/Shippo/PayPal/Resend precedent exactly). |
| VI. Legible History | PASS | Conventional Commits, `CHANGELOG.md`/`status.md` entry on push, per the established discipline. |

No unjustified violations — Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/008-ai-product-descriptions/
├── spec.md               # Feature specification (complete)
├── plan.md               # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── actions.md        # Phase 1 output — Server Action contract
├── quickstart.md         # Phase 1 output
└── tasks.md               # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
PrintingSite/
├── docs/
│   └── adr/
│       └── 0018-vercel-ai-gateway-for-product-descriptions.md   # NEW
├── src/
│   ├── lib/
│   │   └── admin/
│   │       └── description-writer.ts   # NEW — the swappable provider:
│   │                                   #       suggestProductDescription()
│   │                                   #       (real: AI Gateway generateObject;
│   │                                   #       fake: deterministic template string),
│   │                                   #       gated by the existing
│   │                                   #       CHECKOUT_FAKE_PROVIDERS flag
│   │   └── schemas.ts                  # EXTENDED — descriptionRequestSchema
│   │                                   #       (name required — FR-011)
│   └── app/
│       └── admin/
│           └── products/
│               ├── actions.ts          # EXTENDED — suggestDescription Server
│               │                       #       Action: auth + rate-limit + Zod,
│               │                       #       calls description-writer.ts,
│               │                       #       never touches the products table
│               └── product-editor.tsx  # EXTENDED — Generate/Improve buttons next
│                                       #       to the description field, a
│                                       #       pending/error state, and applying
│                                       #       the returned draft into the same
│                                       #       local `description` state the
│                                       #       textarea already uses (so the
│                                       #       existing Save button is what
│                                       #       actually persists it)
├── tests/
│   └── admin/
│       └── description-writer.test.ts  # NEW — Vitest: fake path's deterministic
│                                       #       output, Zod validation, the
│                                       #       "name required" guard
└── e2e/
    └── admin-products.spec.ts          # EXTENDED — Generate then Improve via
                                        #       the real admin UI (fake provider,
                                        #       gated by CHECKOUT_FAKE_PROVIDERS)
```

**Structure Decision**: No new route, table, or project boundary. One new lib module (the swappable AI provider, kept separate from the Server Action for the same testability reason `promotion-crud.ts`/`order-status.ts` already are — `requireAdminSession()` depends on `next/headers` and can't run outside a real request, but the provider logic itself can be unit-tested directly), one extended Server Action, one extended existing component. `docs/non-functional.md` gains a concrete generation-latency target (Phase 1).

## Complexity Tracking

*No entries — Constitution Check passed with no unjustified violations. One
new ADR is owed (this project's first AI/LLM provider decision), which is
expected and tracked above, not a violation.*
