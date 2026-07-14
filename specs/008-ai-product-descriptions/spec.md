# Feature Specification: AI Product Description Writer/Editor

**Feature Branch**: `008-ai-product-descriptions`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Add an AI-assisted product description writer/editor to the admin Product Editor (feature 1). The business owner (Erica) can click 'Generate' to have an AI produce a first-draft description for a product from its existing structured data (name, category, styling/material, price, options) when the description field is blank, and click 'Improve' on an existing description to get a rewritten/polished alternative. In both cases the AI's output is shown to the admin for review and only saved if she explicitly accepts/edits and saves it via the existing product save flow — never auto-published. This must follow this project's established discipline for AI-assisted features (Constitution Principle II): server-side-only model calls behind a small swappable provider interface, Zod-validated output before use, admin-only (same Auth.js gate as the rest of the Product Editor), and rate-limited the same way other admin mutations are. No customer-facing surface at all — this is purely an admin content-authoring aid, distinct from the deferred customer-facing 'upload your own design' customizer already logged in docs/future-work.md."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a first-draft description (Priority: P1)

Erica has just configured a new product (name, category, styling/material, price, options) but hasn't written its description yet. Instead of writing from scratch, she clicks "Generate" and the system produces a draft description built from that product's own configured data, which she can then read, edit, and save.

**Why this priority**: Writing descriptions from a blank page for every new product is the most tedious, highest-friction part of adding a product — this is the core value of the whole feature.

**Independent Test**: Can be fully tested by configuring a product with no description, clicking "Generate," confirming a draft appears that reflects that product's actual name/category/options, and confirming it only becomes the real description once saved.

**Acceptance Scenarios**:

1. **Given** a product with a name, category, and price but no description, **When** the admin clicks "Generate," **Then** a draft description appears for review, and the product's saved description is unchanged until she saves.
2. **Given** a generated draft is showing, **When** the admin edits the text and clicks the normal product Save action, **Then** her edited version (not the raw AI output) becomes the product's saved description.
3. **Given** a generated draft is showing, **When** the admin navigates away without saving, **Then** the product's description reverts to whatever it was before (blank), with no partial or draft text ever persisted.

---

### User Story 2 - Improve an existing description (Priority: P2)

Erica already has a description written for a product — maybe written manually, maybe a much older AI draft — and wants a polished alternative without rewriting it herself. She clicks "Improve" and reviews the suggested rewrite.

**Why this priority**: Valuable and reuses the same mechanism as Generate, but only applies to products that already have a description, so it matters less on day one than the blank-description case.

**Independent Test**: Can be fully tested by opening a product that already has a description, clicking "Improve," confirming a rewritten alternative appears based on the current text and the product's data, and confirming the original is untouched unless she saves the new version.

**Acceptance Scenarios**:

1. **Given** a product with an existing description, **When** the admin clicks "Improve," **Then** a rewritten alternative appears for review, and the original saved description is unchanged until she saves.
2. **Given** an improved alternative is showing, **When** the admin decides she prefers the original, **Then** she can discard the suggestion and the original description remains exactly as it was.

---

### User Story 3 - Try again before committing (Priority: P3)

The first draft or improved alternative isn't quite right, so Erica requests another one before deciding what to keep.

**Why this priority**: A real quality-of-life refinement on top of US1/US2, but not essential to the feature delivering value the first time it's used.

**Independent Test**: Can be fully tested by generating or improving a description, requesting another attempt, and confirming the newest suggestion replaces the prior one for review (still unsaved) with no accumulation of stale drafts.

**Acceptance Scenarios**:

1. **Given** a draft is showing for review, **When** the admin requests another attempt, **Then** a new suggestion replaces it for review, and nothing is saved until she explicitly does so.

---

### Edge Cases

- What happens when an admin tries to generate a description for a product with no name yet (essentially no data to work from)? The system declines with a clear message rather than producing a meaningless or generic result.
- What happens when the AI service errors or times out? The admin sees a clear, specific error, and the product's existing (saved) description is completely unaffected — never partially overwritten or cleared.
- What happens if an admin clicks Generate/Improve repeatedly in quick succession? Requests beyond the standard admin rate limit are rejected with a clear message, the same way other admin mutations are already throttled.
- What happens if the admin closes the Product Editor (or it crashes) while a draft is showing? Nothing was ever persisted, so the product's description is exactly what it was before the draft was requested.
- What happens for a product with a very sparse configuration (name only, no category/options/price yet)? The system still attempts a draft from whatever data exists, since a partial draft is more useful than none, but the admin remains free to edit or discard it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an admin to request an AI-generated first-draft description for a product whose description field is currently empty, using that product's existing configured data (name, category, styling/material, price, options) as the basis for the draft.
- **FR-002**: System MUST allow an admin to request an AI-improved alternative description for a product that already has a description, using the current description and the product's configured data as the basis for the rewrite.
- **FR-003**: AI-generated or AI-improved text MUST be presented to the admin as a reviewable draft and MUST NOT be written to the product's saved description until the admin explicitly saves it through the existing product save action.
- **FR-004**: The admin MUST be able to edit AI-provided text before saving, exactly as she can edit any manually-typed description.
- **FR-005**: The admin MUST be able to discard an AI draft, leaving the product's existing (or blank) saved description completely unchanged.
- **FR-006**: The admin MUST be able to request another attempt (regenerate/re-improve) before deciding what to keep, with each new attempt replacing the prior unsaved suggestion rather than accumulating multiple drafts.
- **FR-007**: This capability MUST be reachable only by an authenticated admin, under the same access gate as the rest of the Product Editor.
- **FR-008**: Every generation or improvement request MUST be subject to the same rate limiting already applied to other admin mutations, to guard against runaway cost or misuse.
- **FR-009**: If the AI request fails or errors for any reason, the system MUST show a clear, specific error and MUST leave the product's existing saved description completely unaffected.
- **FR-010**: This capability MUST NOT be exposed to customers or reachable from any unauthenticated or storefront surface.
- **FR-011**: The system MUST decline to generate a first draft for a product that lacks even a name, with a clear message explaining more product information is needed first.

### Key Entities

- No new persisted entity. This feature reads the existing Product's configured data (name, category, styling/material, price, options, current description) and writes back to that same Product's existing description field, through the existing save action — an AI draft itself is a transient, in-review value that is never independently stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can get a usable first-draft description for a newly-configured product without leaving the Product Editor or writing any text herself.
- **SC-002**: An admin can get a polished alternative for an existing description in the same amount of effort — one click plus a review.
- **SC-003**: 100% of AI-generated or AI-improved text requires an explicit, separate admin save action before it can ever appear on the live storefront — no AI output is ever auto-published.
- **SC-004**: A failed or errored AI request never alters a product's existing saved description — it remains exactly as it was before the request, every time.

## Assumptions

- This feature reuses the Product Editor's existing save action entirely — no new persistence path, table, or "draft" field is introduced.
- The specific AI model/provider is a technical decision made during planning (per Constitution Principle II's swappable-provider requirement), not part of this specification.
- Generation is a single request/response per click; no streaming UI is required at this business's scale (a handful of admins, a modest catalog).
- No second-admin approval workflow is introduced — consistent with this project's existing single-owner-role scope (Constitution Principle IV).
- This is a one-product-at-a-time tool used from within the Product Editor; bulk/batch generation across many products at once is out of scope for this feature and would be a separate future enhancement if ever wanted.
- The AI's input context is limited to the product's own currently-configured data at the moment of the request (name, category, styling/material, price, options, current description) — no external data (customer reviews, market research, competitor listings) is used, since none exists in this project.
