# Data Model: AI Product Description Writer/Editor

Phase 1 output for `specs/008-ai-product-descriptions/plan.md`. **No new
table, column, or migration.** This feature's only "data" is a pair of
transient request/response shapes that never reach the database directly
— they exist only for the duration of one Server Action call, and only
ever affect a product's real `description` column via the Product
Editor's pre-existing save action (feature 1), unchanged by this
feature.

## DescriptionSuggestionRequest (transient, not persisted)

The context sent to the model — assembled entirely from the Product
Editor's current, possibly-unsaved form state, never re-fetched from the
database (so a not-yet-saved edit, e.g. a name the admin just typed, is
what the model actually sees):

| Field | Type | Notes |
|---|---|---|
| `name` | string, required | FR-011 — request is rejected before any model call if blank |
| `categoryName` | string, optional | The currently-selected category's label, if any |
| `stylingLabels` | string[], optional | Labels of the currently-selected styling options |
| `materialLabels` | string[], optional | Labels of the currently-selected material options |
| `basePriceCents` | integer, optional | Included as price context; never itself altered by this feature |
| `currentDescription` | string, optional | Absent → "Generate" (US1); present → "Improve" (US2) — see `research.md`'s "one Server Action" decision |

## DescriptionSuggestionResult (transient, not persisted)

| Field | Type | Notes |
|---|---|---|
| `description` | string | The model's suggested draft text — validated by `generateObject`'s Zod schema before this value is ever constructed (Principle II) |

This value is handed straight to the Product Editor's existing local
`description` state (the same state the textarea already controls) —
it becomes the product's real, saved description only if the admin then
uses the existing Save action, exactly like any manually-typed edit
(FR-003, FR-004).

## Validation rules (Zod, enforced server-side per Principle II)

- `suggestDescription(request)`: `name` MUST be a non-empty, trimmed
  string (FR-011) — checked before any model call is attempted, so an
  under-specified product never spends a real request.
- The model's response MUST parse against `{ description: string }` via
  `generateObject`'s schema — any failure to parse is treated as a
  provider error (FR-009), never a partial or malformed value reaching
  the client.

## State transitions

None. This feature introduces no entity with state — a suggestion is
either successfully returned for review or the request fails outright;
there is no saved, in-progress, or draft record anywhere in the
database. The one real state transition this feature can ever cause is
the Product Editor's own, pre-existing `description` field going from
its old value to admin-accepted new text — the exact same transition a
manual edit already causes, via the exact same save action.
