# ADR-0009: Vercel Blob for product images, uploaded server-side

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Jon Upchurch

## Context

Feature 1 (admin product management) needs the owner to attach one or
more photos to a product. Vercel Blob storage was already provisioned
for this purpose ([ADR-0008](0008-neon-for-hosted-postgres.md)'s
sibling infrastructure), but how the owner's upload actually reaches
Blob storage — and where the resulting file reference is stored — was
undecided.

## Decision

The owner uploads an image through a Server Action that accepts the
file directly (`FormData`) and calls Vercel Blob's server-side `put()`.
The resulting URL is stored on a new `product_images` row
(`productId`, `url`, `sortOrder`) — see `data-model.md`. No separate
client-direct-upload or signed-token endpoint.

## Alternatives considered

- **Vercel Blob's client-direct-upload pattern** (`@vercel/blob/client`,
  with a token-issuing API route) — the standard choice when uploads
  are large or high-volume, so the file never passes through a
  Function. Rejected here: product photos are small, uploads are rare
  (one owner, occasional catalog updates), and Vercel Functions now
  accept request bodies up to 100MB — comfortably enough headroom that
  the extra token-endpoint complexity buys nothing at this scale.
- **Storing images outside Blob (e.g., base64 in Postgres)** — rejected
  outright; bloats the database and Blob is exactly the tool for this.

## Consequences

Every image upload/removal is a normal Server Action, consistent with
every other mutation in this feature (Principle II: server-side only,
Zod-validated on the metadata side). If product photo volume or size
ever grows past what's comfortable through a Function (e.g., a bulk
importer), the client-direct-upload pattern is the documented
fallback — revisit then, not preemptively.
