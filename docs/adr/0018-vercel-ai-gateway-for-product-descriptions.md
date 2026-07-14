# ADR-0018: Vercel AI Gateway (via the AI SDK) for AI product descriptions

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Jon Upchurch

## Context

Feature 8 (AI product description writer/editor) is this project's first
AI/LLM-backed capability — the constitution's Principle II already
anticipated this ("If a future feature adds an AI-assisted capability...
it MUST follow this same discipline: server-side-only calls behind a
small swappable provider interface, with Zod-validated output before
use"), but no model provider had actually been chosen yet. Something has
to generate a first-draft or improved product description server-side,
from a small amount of structured product context, behind that small
interface.

## Decision

Call the model through the **Vercel AI SDK's plain `"provider/model"`
string form**, which routes through the **Vercel AI Gateway**
automatically — no `@ai-sdk/<provider>` package, no manually-obtained or
stored API key. The Gateway authenticates via **OIDC** (`vercel env
pull` provisions a short-lived `VERCEL_OIDC_TOKEN`), auto-refreshed on
Vercel deployments. Output is retrieved via `generateObject` against a
small Zod schema (`{ description: string }`), so schema validation is
enforced by the SDK call itself, not a separate step after the fact.

**Model: Claude Haiku 4.5**, chosen specifically for cost ($1/$5 per
million input/output tokens) — confirmed directly with Jon, who wanted
the cheapest reasonable option for this task rather than the project's
usual "most capable" default, since writing/polishing a short product
description from a handful of structured fields has no need for a
larger model's reasoning depth. The exact Gateway model slug is resolved
via `gateway.getAvailableModels()` at implementation time rather than
hardcoded here, since Gateway slugs aren't guaranteed to match a
provider's raw API model ID exactly.

## Alternatives considered

- **A direct provider SDK** (e.g. `@ai-sdk/anthropic` or `@ai-sdk/openai`)
  — would require obtaining and storing a real vendor API key in
  `.env.local`/Vercel env vars, the same way TaxJar/Shippo/PayPal/Resend
  each needed one. Rejected: this feature has no requirement for any
  provider-specific capability (no computer use, no fine-tuned endpoint),
  so the Gateway's zero-markup pricing, built-in observability, and
  OIDC auth (no credential to manage at all) make it strictly simpler
  with no real capability given up.
- **`generateText` plus manual validation** of the returned string —
  rejected in favor of `generateObject`: validation-as-part-of-the-call
  is a stronger guarantee than validate-after-the-fact, and costs
  nothing extra to set up.

## Consequences

`src/lib/admin/description-writer.ts` is the one place a model is ever
called from — real (`generateObject` via the Gateway) behind
`CHECKOUT_FAKE_PROVIDERS`, a deterministic fake in front of it, mirroring
the exact pattern already established for TaxJar/Shippo/PayPal/Resend.
No new provider credential exists anywhere in this project's env files —
the only new local-dev step is keeping `VERCEL_OIDC_TOKEN` fresh via
`vercel env pull` (~24h lifetime), and enabling AI Gateway once in the
Vercel dashboard for real (non-fake) use. If a future feature needs a
provider-specific capability the Gateway doesn't expose, that feature
can add a direct SDK call alongside the Gateway without revisiting this
decision for the description-writer feature itself — the Gateway remains
the default per this project's (and Vercel's own) guidance unless a
specific need says otherwise.
