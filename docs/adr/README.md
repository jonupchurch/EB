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

New decision? Copy `0000-template.md`.
