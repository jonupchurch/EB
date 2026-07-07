import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

let instance: Db | undefined;

// Vercel Marketplace integrations (e.g. Neon) provision DATABASE_URL as a
// runtime-only secret — it's deliberately absent during `next build`'s
// page-data collection, which imports this module. Connecting lazily (on
// first query, not on import) keeps builds working regardless.
function getInstance(): Db {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set — copy .env.example to .env.local and fill it in.",
      );
    }
    instance = drizzle(postgres(process.env.DATABASE_URL), { schema });
  }
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getInstance(), prop, receiver);
  },
});
