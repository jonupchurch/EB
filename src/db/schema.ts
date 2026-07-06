import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";

// Infrastructure-only table used to prove the connection/migration
// pipeline works end-to-end (see src/app/api/health/route.ts and
// tests/db/connection.test.ts). The real product schema (products,
// orders, cart, fulfillment) gets designed during its own spec'd
// feature — see docs/adr/0001-postgres-persistence.md — not invented
// here.
export const healthCheck = pgTable("health_check", {
  id: serial("id").primaryKey(),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
