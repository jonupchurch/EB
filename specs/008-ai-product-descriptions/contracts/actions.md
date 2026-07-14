# Contracts: AI Product Description Writer/Editor

Phase 1 output for `specs/008-ai-product-descriptions/plan.md`. One new
Server Action, reachable only through feature 1's existing Auth.js-gated
`/admin/products` Product Editor, gated by the existing admin rate
limiter (`src/lib/admin/rate-limit.ts`) exactly like every other admin
mutation.

## Shared error shape (unchanged from every other admin action)

```text
{ ok: true, data: { description: string } }
| { ok: false, error: "not_authorized" | "validation_error" | "generation_failed", fieldErrors?: Record<string, string> }
```

## `suggestDescription(input)`

- **Purpose**: powers both the "Generate" (US1) and "Improve" (US2)
  buttons in the Product Editor, and "try again" (US3) is simply calling
  this again.
- **Input**: `{ name, categoryName?, stylingLabels?, materialLabels?, basePriceCents?, currentDescription? }`
  — every field is read from the Product Editor's current in-memory
  form state, never re-fetched from the database (so unsaved edits are
  what the model sees). `currentDescription` absent means "Generate"
  (US1); present means "Improve" (US2).
- **Behavior**: validates `name` is non-empty (FR-011), applies the
  existing admin rate limit (FR-008), builds a prompt from the given
  fields (a "write a first draft" prompt when `currentDescription` is
  absent, a "rewrite/polish this" prompt when present), calls the model
  via `src/lib/admin/description-writer.ts`'s `suggestProductDescription`
  (real: AI Gateway `generateObject`; fake: deterministic template, per
  `research.md`), and returns the single resulting draft string.
- **Output**: `{ description: string }` — never written to the
  `products` table by this action itself (FR-003).
- **Errors**: `not_authorized` (no admin session), `validation_error`
  (blank `name`, FR-011), `generation_failed` (any provider error,
  timeout, or output that fails the model-response schema — FR-009;
  the existing saved description is never touched on this path).

## Non-contract: how the draft is actually saved

There is deliberately no separate "accept" or "save draft" action. The
returned `description` string is placed into the Product Editor's
existing local form state (the same state the description textarea
already controls) — persisting it is entirely the job of the
already-existing `createProduct`/`updateProduct` Server Actions
(feature 1), unchanged by this feature. This is what makes FR-003
("never auto-published") true by construction rather than by an
additional check: there is no code path in this feature that writes to
the database at all.
