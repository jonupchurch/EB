# Future Work

Ideas that surface during a feature's build but are out of that
feature's (or the MVP's) frozen scope. Per the constitution's Scope
Discipline principle, a new idea found mid-build gets logged here
instead of implemented on the spot — this is the list to work from once
the core MVP is complete, not a queue to pull from early.

Each entry: what it is, which feature it came up during, and why it was
deferred rather than folded in. Resolved items get struck through with a
"Resolved {date}" note rather than deleted, so the reasoning stays
visible.

## Live product customizer / upload-your-own-design tool

Surfaced during: initial constitution drafting, 2026-07-06.

Customers uploading their own image/text and previewing it live on a
product (shirt, mug, wood sign, etc.) before ordering — the natural
next step beyond a fixed catalog.

Deferred rather than built now: the MVP (constitution Principle IV) is
scoped to a fixed catalog with variant selection only, so one real
checkout path ships first. This is the most likely first post-MVP
feature, but needs its own spec (upload validation/limits, print-file
generation requirements, preview rendering approach) once the MVP is
live.

Note (2026-07-07): the storefront wireframes
(`Resources/wireframes/Store Pages.html`) already show a "Custom" link
in the header nav on every page. That's intentional as a placeholder
for this future feature, not a sign this belongs in MVP — leave the
nav link in the wireframe as-is; whoever specs the catalog/nav feature
should decide whether it ships hidden/disabled or omitted entirely
until this feature actually exists.

Clarified (2026-07-07): the admin wireframes
(`Resources/wireframes/Admin Screens.html`) show the Product Editor's
"Processing" section with "Bring your own design" and "Custom design
service" as fully priced, toggleable options (with a live price
calculation including a "Custom design" line item), and a configured
"Custom design fee" on the Shipping & Fees screen. Confirmed this is
fine to build as MVP scope: the **admin-side pricing/configuration**
for these processing types isn't the deferred part — it's just data
entry, and the product data model should support these options and
their pricing from day one. What's still deferred to this fast-follow
feature is specifically the **customer-facing storefront flow**
(upload UI, live preview, actually placing a custom order). The
catalog/product data model (whenever it's specced) should account for
this distinction: processing-type pricing is MVP-scope schema, the
customer-facing upload/ordering flow is not.

Flagged (2026-07-07): the proposed launch catalog
(`Resources/products/Launch Catalog.html`) includes a "Recipe Board"
(Home & Decor) with a "handwriting-to-engrave" variant — confirmed
with Jon this means a customer uploads a photo of actual handwriting,
which **is** the deferred customer-facing upload flow, not a stylistic
preset. As written, this item shouldn't ship in the MVP launch
catalog — either cut it from day one, or restrict it to plain custom
text (matching the Family Name Sign/Engraved Oak Sign pattern) until
the customizer feature exists. Needs resolving when Erica confirms the
final catalog list, not decided here.

## Stripe as a second payment processor

Surfaced during: reviewing `Resources/wireframes/Admin Screens.html`,
2026-07-07.

The admin wireframe's payment settings panel showed both Stripe and
PayPal as connectable processors, which prompted deciding the payment
provider question for real: PayPal for MVP
([ADR-0005](adr/0005-paypal-for-mvp-payments.md)), Stripe deferred.

Deferred rather than built now: supporting two processors at launch
means two webhook-verification paths and twice the integration surface
before a single real order can be taken. Stripe support is a real,
planned fast-follow, not a rejected idea — revisit once PayPal
checkout is live.

Clarified (2026-07-07): `Resources/wireframes/Checkout &amp;
Confirmation.html` (added after ADR-0005) showed a "Credit / debit
card — via Stripe" option as the *default* payment method, with PayPal
as a secondary redirect — confirmed with Jon this is stale wireframe
content, not a reconsideration. The checkout feature should build
PayPal only for MVP (including PayPal's own direct-card-entry option
for guest checkout, not a redirect-only flow) — see ADR-0005's Update
section for the full note.

## Real privacy policy & terms of service content

Surfaced during: adding `Resources/shared/privacy.md` and
`Resources/shared/terms and condition.md`, 2026-07-07.

Both files were drafted from a generic template built for an unrelated
business (a digital pet-portrait commission studio) — only the
business name has been swapped to Erica Burns Things so far. The
substance still describes the wrong business entirely: digital art
commissions instead of physical custom-printed goods, an unconditional
"no refunds" clause that conflicts with the Refund/Reprint order
status already in the admin queue, NFT/portfolio rights language,
"reference photo of your pet" clauses, Ohio as the fulfillment
location and governing-law jurisdiction, and "digital delivery"
turnaround times.

Deferred rather than rewritten now: Jon explicitly chose the quick
pass (name swap only) over a substantive rewrite for this session.
Needs a real rewrite before these become live site pages — ideally
informed by the same real business facts flagged as open in
`status.md`/project memory (actual jurisdiction/location, real
refund/reprint policy, real shipping/turnaround times).

## AI-assisted design feature

Surfaced during: initial constitution drafting, 2026-07-06.

An AI-assisted capability — e.g. helping a customer turn a prompt or
rough idea into a design, or an AI support chat — was raised as a
possibility given the stack includes the Vercel AI SDK/Gateway, but no
specific feature was defined.

Deferred rather than built now: no AI feature is in the MVP scope. If
one is built later, constitution Principle II already requires it to
follow the same server-side-only, swappable-provider,
Zod-validated-output discipline as every other integration.
