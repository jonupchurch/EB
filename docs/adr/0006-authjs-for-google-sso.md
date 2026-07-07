# ADR-0006: Auth.js for Google SSO (admin queue)

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Jon Upchurch

## Context

The constitution requires the admin order queue to be gated behind
Google SSO, restricted to two specific accounts
(`ericaburnsthings@gmail.com`, `jonupchurch@gmail.com` — see the
Shipping & Fees wireframe). The implementation was left open between
Auth.js and a managed provider like Clerk.

## Decision

**Auth.js** (next-auth), using its Google OAuth provider, restricted at
the application layer to the two authorized email addresses.

## Alternatives considered

- **Clerk** — a managed auth provider with a native Vercel Marketplace
  integration, less code to own, built-in UI components. Rejected here
  because the actual requirement is narrow (exactly two known Google
  accounts gating one admin area, not general-purpose
  signup/login/session management for a customer-facing user base) —
  a full managed auth product is more than this needs, and Auth.js's
  Google provider covers it directly.
- **A hand-rolled OAuth flow** — rejected; Auth.js already handles the
  OAuth/session mechanics correctly (CSRF, token refresh, secure
  cookies) for a well-understood single-provider case, so there's
  nothing to gain from reimplementing it.

## Consequences

The admin queue's auth check is: valid Auth.js session + email in an
allow-list of exactly two addresses (config, not a database-backed
roles table — consistent with Principle IV's "single owner role only,"
Identity providers beyond Google SSO are still out of scope).
Session/JWT secret and Google OAuth client credentials are required
env vars, added to `.env.example` when the admin feature is actually
built. If customer accounts are ever added (not currently planned —
checkout is guest-only), that would be a separate, explicit decision,
not an automatic extension of this one.
