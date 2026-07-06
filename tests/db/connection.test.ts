import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../src/db";

describe("database connection", () => {
  it("connects to Postgres and can run a query", async () => {
    const rows = await db.execute<{ ok: number }>(sql`select 1 as ok`);
    expect(rows[0]?.ok).toBe(1);
  });
});
