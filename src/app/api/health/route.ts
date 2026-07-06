import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503 },
    );
  }
}
