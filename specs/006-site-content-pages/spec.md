# Feature Specification: Site Content Pages

**Feature Branch**: `006-site-content-pages`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "Site content pages: extend the existing storefront footer with links to a Privacy Policy page, a Terms of Use page, and an About Us page. Each page's content (title + rich formatted body — headings, paragraphs, bold/italic, lists, links) is managed by the admin through a rich text editor in the admin console, not hardcoded — the business owner needs to be able to update these without a code change, the same way products/promotions/shipping settings already work. Starter content: seed the Privacy and Terms pages from the existing (name-swapped, not yet fully rewritten) content in Resources/shared/privacy.md and Resources/shared/terms and condition.md; the About page starts blank/placeholder for the owner to write herself. These are exactly three known pages (privacy, terms, about) — not a generic arbitrary-slug CMS. Out of scope: multi-language content, page versioning/revision history, additional page types beyond these three, and public commenting."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a policy or About page from the storefront (Priority: P1)

As a customer, I want to reach the Privacy Policy, Terms of Use, and About Us pages from anywhere on the site, so I can read the business's policies or learn more about who I'm buying from.

**Why this priority**: These pages carry real legal/trust weight for a business handling real customer data and payments — they need to actually exist and be reachable, independent of whether the owner has customized their wording yet.

**Independent Test**: From any storefront page, click each of the three footer links and confirm each opens a real page showing a title and formatted body content, not a broken link or blank screen.

**Acceptance Scenarios**:

1. **Given** any storefront page, **When** the customer looks at the footer, **Then** they see links to "Privacy Policy," "Terms of Use," and "About Us."
2. **Given** a customer clicks one of those links, **When** the page loads, **Then** it shows that page's current title and full formatted body (headings, paragraphs, bold/italic text, lists, and links all render correctly).
3. **Given** the Privacy or Terms page has never been edited by the admin, **When** a customer visits it, **Then** it shows the seeded starter content (not a blank or broken page).
4. **Given** the About page has never been edited by the admin, **When** a customer visits it, **Then** it shows a clear placeholder message rather than a blank or broken page.

---

### User Story 2 - Edit page content without a code change (Priority: P2)

As the business owner, I want to edit the title and body of the Privacy, Terms, and About pages myself, using a rich text editor, so I can correct or rewrite them whenever needed without asking anyone to change code.

**Why this priority**: The whole point of this feature over just hardcoding three pages — the existing Privacy/Terms content is known-wrong placeholder text (drafted for a different business) that the owner needs to be able to fix herself, and the About page doesn't exist yet until she writes it.

**Independent Test**: Sign in as the admin, open the content editor for each of the three pages, change the title and body (using headings, bold/italic, a list, and a link), save, and confirm the public page reflects the change immediately.

**Acceptance Scenarios**:

1. **Given** the admin is signed in, **When** they open the content editor for one of the three pages, **Then** they see that page's current title and body loaded into a rich text editor.
2. **Given** the admin changes the title and/or body and saves, **When** a customer (or the admin) then visits that page, **Then** the updated content shows immediately — no deployment or code change involved.
3. **Given** the admin formats text with headings, bold/italic, a bulleted or numbered list, and a link, **When** they save and view the public page, **Then** all of that formatting renders correctly and safely.
4. **Given** someone who isn't signed in as one of the two allow-listed admin accounts, **When** they try to reach the content editor, **Then** they're redirected to sign in, the same as every other admin capability.

---

### Edge Cases

- What happens when a page's content has never been edited? It must still render a real page (seeded starter content for Privacy/Terms, a clear placeholder for About) — never a 404, a crash, or a blank white page.
- What happens if the admin enters formatting or a pasted link that could be unsafe (e.g., a script-like value)? The system MUST neutralize it before it's ever stored or shown publicly — no admin-entered content may execute as code on the public site.
- What happens if the admin saves an empty title or body? The system should still save without crashing; an empty body simply renders as an empty page area under whatever title exists.
- What happens if two people (the two allow-listed admin accounts) edit the same page around the same time? The most recent save wins — no merge conflict handling is required (matches this project's existing "single owner role" scale).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The storefront footer MUST show links to the Privacy Policy, Terms of Use, and About Us pages, visible from every storefront page.
- **FR-002**: Each of the three pages MUST display its current title and rich-formatted body content (headings, paragraphs, bold/italic, lists, links) to any visitor, no sign-in required.
- **FR-003**: An authenticated admin MUST be able to edit each page's title and body through a rich text editor supporting headings, paragraphs, bold/italic, lists, and links.
- **FR-004**: A saved edit MUST be reflected on the public page immediately, with no deployment or code change required.
- **FR-005**: All admin-entered content MUST be sanitized before storage or rendering, so no injected script or unsafe markup can ever execute on the public site.
- **FR-006**: The Privacy and Terms pages MUST be seeded with the existing content from `Resources/shared/privacy.md` and `Resources/shared/terms and condition.md` respectively; the About page MUST start with a clear placeholder message.
- **FR-007**: The content editor MUST be reachable only by an authenticated, allow-listed admin account — the same gate as every other admin capability.
- **FR-008**: The system supports exactly these three pages (privacy, terms, about) — this feature provides no way to create, delete, or add further pages.

### Key Entities *(include if feature involves data)*

- **Site Page**: one of exactly three fixed pages (privacy, terms, about). Holds a title and a rich-formatted body. Publicly readable by anyone; editable only by an authenticated admin. Edits take effect immediately — no draft, preview, or version history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can reach any of the three pages from the storefront footer in one click, from any page on the site.
- **SC-002**: An admin can edit a page's content and see the change live on the public page within moments of saving, with zero code changes or deployments.
- **SC-003**: 100% of admin-entered content renders safely on the public page — no injected script ever executes, across every save.
- **SC-004**: Immediately after this feature ships, the Privacy and Terms pages show real (if still placeholder-labeled) content rather than a blank or missing page.

## Assumptions

- Edits take effect immediately on save; no draft/preview state or revision history — consistent with how this project's other admin-editable data (promotions, the flat shipping rate) already works.
- Only the two existing allow-listed Google accounts can edit page content — no new admin role is introduced.
- The seeded Privacy/Terms content is still the known placeholder text drafted for a different business (see `status.md`'s 2026-07-07 entry) — this feature makes it admin-editable so the owner can fix it; it does not rewrite the content itself.
- The About page has no existing draft anywhere in `Resources/` — it starts with a placeholder message the owner is expected to replace.
- Rich text formatting scope is exactly what's listed (headings, paragraphs, bold/italic, lists, links) — no images, embedded media, tables, or raw HTML, matching the modest actual need for informational/legal pages.
