# Architecture Decision Records

Each ADR captures one decision that had a real tradeoff: the context,
the choice, the alternatives rejected, and the consequences accepted.
They're the "why" behind the code — read alongside the Spec Kit plan for
whichever feature introduced the decision (Constitution Principle I).

Format: lightweight [MADR](https://adr.github.io/madr/). Status is one of
`Proposed`, `Accepted`, `Superseded by ADR-XXXX`.

| # | Decision | Status |
|---|---|---|
| [0001](0001-postgres-persistence.md) | PostgreSQL for persistence, local instance for development | Accepted |
| [0002](0002-drizzle-orm.md) | Drizzle ORM (over Prisma) for the query/migration layer | Accepted |
| [0003](0003-accepted-contrast-exceptions-ember-v0.1.md) | Accept specific contrast exceptions in early design mockups/wireframes | Accepted |
| [0004](0004-darken-muted-text-token.md) | Darken the muted/secondary text token from #9A9088/#8A8378 to #6B6560 | Accepted |
| [0005](0005-paypal-for-mvp-payments.md) | PayPal for MVP payments, Stripe deferred to a fast-follow | Accepted |
| [0006](0006-authjs-for-google-sso.md) | Auth.js for Google SSO (admin queue) | Accepted |
| [0008](0008-neon-for-hosted-postgres.md) | Neon for hosted/production Postgres | Accepted |
| [0009](0009-vercel-blob-for-product-images.md) | Vercel Blob for product images, uploaded server-side | Accepted |

New decision? Copy `0000-template.md`.
