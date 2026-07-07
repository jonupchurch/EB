import { migrate } from "drizzle-orm/postgres-js/migrator";
import { NextResponse } from "next/server";
import { db } from "@/db";

// Internal ops tool, not a public admin feature: applies pending Drizzle
// migrations against the real runtime database connection. Exists
// because Neon's DATABASE_URL is a Vercel Marketplace "Sensitive"
// secret — unavailable at build time and unreadable via `vercel env
// pull` — so there is no way to run `drizzle-kit migrate` against
// Production from a local machine. Gated by a random secret (never a
// session, since correctness of this endpoint must not depend on the
// schema it's about to create) compared in constant time.
export async function POST(request: Request) {
  const provided = request.headers.get("x-migrate-secret") ?? "";
  const expected = process.env.MIGRATE_SECRET ?? "";

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  const authorized =
    expected.length > 0 &&
    providedBuf.length === expectedBuf.length &&
    (await import("node:crypto")).timingSafeEqual(providedBuf, expectedBuf);

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "not_authorized" }, { status: 401 });
  }

  await migrate(db, { migrationsFolder: "./drizzle" });
  return NextResponse.json({ ok: true });
}
