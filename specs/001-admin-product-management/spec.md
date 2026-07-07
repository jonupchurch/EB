# Feature Specification: Admin Product Management

**Feature Branch**: `001-admin-product-management`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Admin product management: an authenticated area where the business owner manages the products that will populate the storefront catalog. Access is restricted to exactly two authorized accounts (the business owner and the developer) via Google sign-in — no other identity providers, no additional admin roles or permission tiers. The owner needs a Products list view (all products at a glance: name, category, variant count, starting price, status) and a Product Editor to create or edit a product. Each product has a name, category, description, and base price, plus optional additively-priced configuration: processing options (incl. pricing for a future bring-your-own-design/custom-design service), styling options, material options (each with a model number/description and price), sizes (each with an optional upcharge), colors (open-ended), and design locations (each with an optional price). The editor shows a running price total, and lets the owner save as Active or Draft, and duplicate an existing product. Out of scope: the customer-facing storefront catalog itself, the customer-facing upload-your-own-design experience, discounts, shipping/tax settings, and the order queue. The real launch catalog is ~22 products across 5 categories (apparel, drinkware, wood & signs, totes & bags, home & decor), mixing made-to-order and pre-made items — the data model needs to represent that range, though seeding real data is an implementation task, not part of this spec."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a new product with pricing (Priority: P1)

As the business owner, I want to create a brand-new product — its name, category, description, base price, and any priced options it needs (processing, styling, material, sizes, colors, design locations) — so that a real, sellable product exists in the system with accurate pricing.

**Why this priority**: This is the entire point of the feature — until a product can be created here, nothing downstream (a future storefront, cart, or order) has anything to work with. Every other capability in this feature exists to support or refine this one.

**Independent Test**: Can be fully tested by signing in, creating a new product with a base price and at least one priced option, confirming the running total price is correct, and saving it — independent of the products list, editing, or duplication.

**Acceptance Scenarios**:

1. **Given** the owner is signed in and starting a new product, **When** she enters a name, category, description, and base price and saves without adding any optional pricing, **Then** the product saves successfully with a total price equal to the base price.
2. **Given** the owner is configuring a new product, **When** she adds a priced option (e.g., a material with a price adjustment, or a size upcharge), **Then** the displayed running total updates immediately to reflect the change.
3. **Given** the owner is configuring a new product, **When** she saves it as Draft, **Then** it is stored but flagged as not ready, distinct from Active products.
4. **Given** the owner attempts to save a product with no name or no base price, **Then** the system MUST reject the save with a clear, specific error identifying what's missing.
5. **Given** the owner is configuring a product, **When** she uploads one or more images, **Then** each image attaches to the product and displays in a defined, reorderable order — a product with zero images MUST still save successfully (images are optional, not part of FR-011's minimum).

---

### User Story 2 - View all products at a glance (Priority: P2)

As the business owner, I want to see a list of every product I've created — its category, how many variant options it has, its starting price, and whether it's Active or Draft — so I can keep track of my catalog as it grows and find what I need to work on.

**Why this priority**: Once products can be created, the owner needs a way to actually see and navigate them; without this, the feature would have no way to manage more than one product at a time.

**Independent Test**: Can be fully tested by signing in with existing products already in the system and confirming the list displays accurate summary information for each one — independent of creating, editing, or duplicating.

**Acceptance Scenarios**:

1. **Given** the owner has created several products, **When** she opens the products list, **Then** she sees each product's name, category, a count of its configured variant options, its starting (base) price, and its status (Active/Draft).
2. **Given** a mix of Active and Draft products exists, **When** the owner views the list, **Then** Active and Draft products are visually distinguishable from one another.

---

### User Story 3 - Edit an existing product (Priority: P3)

As the business owner, I want to open any existing product and change its details or pricing, so I can fix mistakes, adjust prices, or add new options as my offerings change.

**Why this priority**: Products won't stay correct forever — prices change and options get added — but this is secondary to being able to create and see products in the first place.

**Independent Test**: Can be fully tested by opening an existing product from the list, changing a detail or price, saving, and confirming the change persists and is reflected in the products list — independent of creating a new product from scratch or duplication.

**Acceptance Scenarios**:

1. **Given** an existing product, **When** the owner changes its base price or any option's price adjustment and saves, **Then** the new values persist and the running total reflects the change.
2. **Given** an existing Draft product, **When** the owner changes its status to Active and saves, **Then** the product's status updates accordingly.

---

### User Story 4 - Duplicate a product as a starting point (Priority: P4)

As the business owner, I want to duplicate an existing product's full configuration into a new product, so I can quickly create a close variant (e.g., the same item in a different material lineup) without re-entering everything from scratch.

**Why this priority**: A convenience that saves time once there's an existing catalog to draw from, but the least critical capability — everything else in this feature works without it.

**Independent Test**: Can be fully tested by duplicating an existing product and confirming a new, independent Draft product is created with the same configuration, and that editing the copy does not alter the original.

**Acceptance Scenarios**:

1. **Given** an existing product, **When** the owner duplicates it, **Then** a new product is created as a Draft with the same details and pricing configuration, clearly named as a copy.
2. **Given** a duplicated product, **When** the owner edits and saves the copy, **Then** the original product's data is unchanged.

---

### Edge Cases

- What happens when someone signs in with a Google account that isn't one of the two authorized accounts? The system MUST deny access with a clear message and MUST NOT expose any admin data or functionality.
- What happens when the owner adds a priced option (material, size, design location) without specifying a price adjustment? It MUST default to no additional charge (included) rather than blocking the save.
- What happens when the owner tries to save a product missing a required field (name, base price)? The system MUST reject the save and clearly identify what's missing, rather than saving incomplete data or failing silently.
- What happens when the owner needs a category that doesn't exist yet? The system MUST let her add a new category rather than being limited to a fixed, unchangeable list.
- What happens when a duplicated product is saved without renaming it? The system MUST still save it successfully (as a Draft) rather than blocking on an unedited name.
- What happens when the owner removes an image from a product? It MUST be removed from that product's display order immediately; it MUST NOT affect any other product (e.g., a duplicated product's copy of that image).
- What happens when the owner duplicates a product? The duplicate MUST get its own copy of the source's image references (same photos, same order), so removing an image from one product never affects the other.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict all access to the admin product management area to users signed in via Google, limited to a fixed, pre-authorized set of accounts — not open registration or self-signup.
- **FR-002**: System MUST deny access, with a clear message, to any authenticated Google account not on the authorized list, and MUST NOT expose any product data or admin functionality to it.
- **FR-003**: Owner MUST be able to create a new product with a name, category, description, and base price.
- **FR-004**: System MUST let the owner configure, per product, any combination of: processing options (each with its own price adjustment — including options representing a future "bring your own design" and "custom design service," priced here even though the customer-facing flow for them doesn't exist yet), styling options (each with its own price adjustment), material options (each identified by a model number/description, with its own price adjustment), sizes (each with an optional price adjustment), colors (open-ended, owner-defined, no fixed list), and design locations (one or many per product, each with an optional price adjustment).
- **FR-005**: System MUST display a running total price for the product being configured, equal to the base price plus every currently-selected option's price adjustment, and MUST update it immediately as selections change.
- **FR-006**: Owner MUST be able to save a product with a status of Active or Draft.
- **FR-007**: System MUST NOT make Draft products visible or available anywhere a customer could see them (a forward-looking guarantee for future features that read this data, even though no customer-facing surface exists yet).
- **FR-008**: Owner MUST be able to view a list of all products showing, at minimum, name, category, a count of configured variant options, starting (base) price, and status.
- **FR-009**: Owner MUST be able to open any existing product and edit any of its details or pricing configuration, saving changes on demand.
- **FR-010**: Owner MUST be able to duplicate an existing product, producing a new, independent Draft product pre-filled with the original's full configuration, without altering the original in any way.
- **FR-011**: System MUST validate that a product has at least a name and a base price before it can be saved, in either status, and MUST reject the save with a specific, actionable error if either is missing.
- **FR-012**: System MUST NOT silently drop, ignore, or fail to save any invalid input — every rejection MUST surface a clear, specific reason to the owner.
- **FR-013**: System MUST persist all product and pricing-option data durably, so it survives across sessions and browser restarts.
- **FR-014**: Owner MUST be able to attach zero or more images to a product, in a defined display order she can rearrange, and remove any attached image.
- **FR-015**: Owner MUST be able to duplicate a product's attached images along with its other configuration (FR-010), as independent copies that don't affect the source if either is later changed.

### Key Entities *(include if feature involves data)*

- **Product**: A sellable item the business offers. Attributes: name, category, description, base price, status (Active/Draft), and its configured set of pricing options below. Owns everything needed to represent one of the ~22 real launch-catalog items (or any future one).
- **Processing Option**: A way a product's design can be produced or applied (e.g., standard printing/engraving, bring-your-own-design, custom design service), each carrying its own price adjustment relative to the product's base price.
- **Styling Option**: A style/cut variant of a product (e.g., a garment cut), each carrying its own price adjustment.
- **Material Option**: A material choice for a product (e.g., a wood species or fabric blend), identified by a model number/description, each carrying its own price adjustment.
- **Size Option**: An available size for a product, each with an optional price adjustment.
- **Color Option**: An available color for a product; open-ended, defined per-product by the owner, not drawn from a fixed system-wide list.
- **Design Location Option**: A placement location for a design on a product (e.g., front, back, sleeve), one or many per product, each with an optional price adjustment.
- **Product Image**: A photo attached to a product, with a display order. A product may have zero or more; not required to save (FR-011's minimum is name + base price only).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The business owner can create a fully-configured product (all base details plus at least one priced option) and save it in under 5 minutes.
- **SC-002**: 100% of sign-in attempts from accounts outside the authorized list are denied, with no admin data exposed in any case.
- **SC-003**: Starting from sign-in, the owner can locate any existing product in the list and begin editing it within 3 interactions (e.g., clicks or taps).
- **SC-004**: The entire initial launch catalog (approximately 22 products across 5 categories) can be fully and accurately represented using only this feature's data model, with zero products requiring a workaround or unsupported configuration.
- **SC-005**: 100% of saved products have a running total price that exactly equals the sum of the base price and every selected option's price adjustment — no calculation ever drifts from that sum.
- **SC-006**: Every image the owner attaches to a product is retrievable and displays in the order she set, both immediately and after a save-and-reload cycle.

## Assumptions

- Categories form a manageable, evolvable list the owner can add to over time (starting with the launch catalog's 5 categories, plus the 2 already-identified phase-2 categories) — not a permanently fixed enumeration.
- No hard delete of products in this feature; a product is removed from future visibility by setting it to Draft. Permanent deletion, if ever needed, is a separate future decision.
- The "variant count" shown in the products list is a computed summary (e.g., how many option groups or combinations are configured), not a separately managed entity of its own.
- This feature operates entirely on the product catalog data model and has no dependency on orders, carts, customers, or any customer-facing surface — none of those exist yet.
- Seeding the real ~22-item launch catalog is something the owner does using this feature once it ships; building import/seed tooling is not part of this feature.
- The Google sign-in mechanism itself is the decision already recorded in `docs/adr/0006-authjs-for-google-sso.md` — this spec covers what the admin area does once signed in and how access is restricted, not the authentication implementation.
- Product images are standard web photo formats (JPEG/PNG/WebP) at typical camera/phone resolution — no specific file-size or dimension limit is enforced in this feature beyond what the storage layer itself requires; image editing (cropping, filters) is not in scope, only attach/reorder/remove.
