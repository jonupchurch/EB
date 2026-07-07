# Feature Specification: Catalog & Browsing

**Feature Branch**: `002-catalog-browsing`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Catalog & browsing: the customer-facing storefront that replaces the current placeholder homepage, letting anyone browse and view the products loaded via admin product management (feature 1). No account/sign-in required — this is public. The customer needs a storefront shell (nav with real branding, footer) replacing the current bare placeholder layout/homepage; a Browse view showing every Active product (never Draft), organized by category, each shown with its primary image, name, and starting price, with categories coming from the real data created in feature 1; and a Product Detail view showing a product's full description, its images in owner-set order, and its available options (processing, styling, material, size, color, design location) so the customer can configure the exact item they want and see an accurate total price, computed the same way feature 1's admin editor computes it. Processing options that require a not-yet-built customer design-upload flow (bring your own design, custom design service) MUST NOT be offered as selectable. Out of scope: cart/checkout, customer accounts/order history/reviews/wishlists, search, the live product customizer/upload-your-own-design experience itself, and any inventory/stock-level display."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the catalog by category (Priority: P1)

As a visitor, I want to see the shop's real products grouped by category — each with a photo, name, and starting price — so I can find something I'm interested in buying.

**Why this priority**: This is the entry point to the entire storefront; nothing else in this feature (or in a future cart/checkout) matters if there's no way to see what's actually for sale.

**Independent Test**: With several Active products already loaded (via feature 1) across multiple categories, load the browse view and confirm each displays its image, name, and starting price grouped correctly under its category — independent of viewing a single product's detail or configuring its options.

**Acceptance Scenarios**:

1. **Given** several Active products exist across multiple categories, **When** a visitor loads the browse view, **Then** each product displays its primary image, name, and starting price, grouped under its category.
2. **Given** a product is saved as Draft, **When** a visitor loads the browse view, **Then** that product never appears anywhere in it.
3. **Given** a visitor selects a specific category, **When** browsing, **Then** only products in that category are shown.
4. **Given** a product has zero images attached, **When** it's shown in the browse view, **Then** a placeholder graphic is shown in place of a broken image.

---

### User Story 2 - View a product and configure it to see an accurate price (Priority: P2)

As a visitor, I want to open a specific product, see its description and photos, and choose from its available options (size, color, material, processing, design location) to see exactly what my configured version would cost, so I know the true price before deciding to buy.

**Why this priority**: Browsing alone doesn't let a visitor evaluate a specific configuration they actually want — this is the next essential step toward a future purchase, even though the purchase mechanism itself (cart/checkout) is a separate, later feature.

**Independent Test**: Open an existing product's detail page directly, select various available options, and confirm the displayed total updates accurately and always equals base price plus every currently selected option's adjustment — independent of the browse view or any cart/checkout mechanics.

**Acceptance Scenarios**:

1. **Given** a product configured with multiple option categories, **When** a visitor opens its detail page, **Then** its full description, all images (in the owner-set order), and every available option category are shown.
2. **Given** a visitor selects a priced option, **When** they do so, **Then** the displayed total price updates immediately to reflect the base price plus every currently selected option's adjustment.
3. **Given** a product has a processing option that requires the not-yet-built customer design-upload flow (e.g., "bring your own design"), **When** a visitor views that product's processing options, **Then** that specific option is not offered as selectable.
4. **Given** a visitor requests a Draft product's or a nonexistent product's detail page, **Then** no product data is shown — the page behaves as if the product doesn't exist.

---

### Edge Cases

- What happens when a product has zero images? A placeholder graphic is shown in the browse view and on its detail page, never a broken image.
- What happens when someone directly requests a Draft product's detail URL (e.g., an old or guessed link)? It MUST behave exactly as "not found" — no product data, name, price, or images ever returned.
- What happens when every processing option configured on a product requires the deferred upload flow (none are selectable)? The product MUST still be fully viewable and priceable using its base price plus its other option categories — a product simply has no selectable processing option in that case, not a broken page.
- What happens when a category has zero Active products (all Draft, or none yet created)? It MUST NOT appear as a browsable category with confusing emptiness — either it's omitted from the category list, or it clearly indicates "nothing here yet."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show every product with status Active to any visitor, with no account or sign-in required.
- **FR-002**: System MUST NOT expose any Draft product's data to a visitor under any circumstance, including direct navigation to its detail URL (carries forward feature 1's FR-007 guarantee to the customer-facing side).
- **FR-003**: System MUST organize Active products by category on the browse view, using the real categories created in admin product management (feature 1), not a fixed/hardcoded list.
- **FR-004**: For each product shown in the browse view, system MUST display its primary image (or a placeholder if it has none), name, and starting (base) price.
- **FR-005**: System MUST let a visitor open a specific product's detail view, showing its full description, all of its images in the order the owner set, and every option category it's been configured with (processing, styling, material, size, color, design location).
- **FR-006**: System MUST exclude, from the processing options a visitor can select, any option representing a not-yet-supported customer design upload (e.g., "bring your own design," "custom design service").
- **FR-007**: System MUST compute and display a running total price on the product detail view — base price plus every currently selected option's price adjustment — updating immediately as selections change, and MUST never drift from the exact sum (matching feature 1's SC-005 guarantee).
- **FR-008**: System MUST NOT display any inventory or stock-level indicator for any product, on any view (Principle IV — "stockable" stays an internal-only label).
- **FR-009**: System MUST treat a request for a nonexistent product's detail page identically to a Draft product's — not found, no data exposed.
- **FR-010**: System MUST present a real storefront shell (branded navigation and footer, using the reviewed brand assets) in place of the current placeholder homepage/layout.

### Key Entities *(include if feature involves data)*

This feature introduces no new persisted entities — it reads the `Product`, `Category`, and six option-type entities defined in feature 1's data model, filtered to `status = active` only. No new tables or admin-facing entity changes are required.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can go from the storefront's entry point to any specific Active product's detail view in 2 clicks or fewer.
- **SC-002**: 100% of Draft products are unreachable from any customer-facing view or direct URL guess.
- **SC-003**: 100% of displayed configuration totals exactly equal base price plus every selected option's adjustment — no drift, end-to-end from feature 1's pricing guarantee.
- **SC-004**: Every product in the real launch catalog (once seeded via feature 1, ~22 items across 5 categories) displays and prices correctly on both the browse view and its own detail view, with zero requiring a workaround.
- **SC-005**: No page a visitor can reach shows unbranded placeholder content — the real storefront shell fully replaces it.

## Assumptions

- Feature 1 (admin product management) is implemented and has real Active products — including images and priced options — before this feature is meaningfully testable end-to-end; this feature is purely a read layer over that data, introducing no new admin-facing capability.
- No account or sign-in exists for any part of this feature — entirely public, consistent with the constitution's customer-facing scope.
- "Starting price" shown in the browse view is the product's base price, not a computed minimum across every possible option combination.
- A visitor's in-progress option selection on a product detail page is not persisted anywhere (no session or cart state) — persisting a chosen configuration is feature 3's (cart & checkout) job, not this feature's.
- The "Custom" nav placeholder (already reviewed; see `docs/future-work.md`) continues to exist as an intentional, non-functional placeholder in the storefront shell built here, not built out as part of this feature.
