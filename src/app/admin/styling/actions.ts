"use server";

import { eq, sql } from "drizzle-orm";
import { requireAdminSession } from "@/auth";
import { db } from "@/db";
import { stylingCatalog, stylingOptions } from "@/db/schema";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { stylingCatalogEntrySchema } from "@/lib/admin/schemas";

type ActionError = {
  ok: false;
  error: "not_authorized" | "not_found" | "validation_error";
  fieldErrors?: Record<string, string>;
};

type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionError;

const NOT_AUTHORIZED: ActionError = { ok: false, error: "not_authorized" };

export async function getStylingCatalog(): Promise<ActionResult<{ id: number; label: string }[]>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const rows = await db
    .select({ id: stylingCatalog.id, label: stylingCatalog.label })
    .from(stylingCatalog)
    .orderBy(stylingCatalog.label);

  return { ok: true, data: rows };
}

export interface StylingCatalogListItem {
  id: number;
  label: string;
  usageCount: number;
}

export async function getStylingCatalogWithUsageCounts(): Promise<
  ActionResult<StylingCatalogListItem[]>
> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const rows = await db
    .select({
      id: stylingCatalog.id,
      label: stylingCatalog.label,
      usageCount: sql<number>`count(${stylingOptions.id})::int`,
    })
    .from(stylingCatalog)
    .leftJoin(stylingOptions, eq(stylingOptions.stylingCatalogId, stylingCatalog.id))
    .groupBy(stylingCatalog.id, stylingCatalog.label)
    .orderBy(stylingCatalog.label);

  return { ok: true, data: rows };
}

export async function createStylingCatalogEntry(
  label: string,
): Promise<ActionResult<{ id: number; label: string }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = stylingCatalogEntrySchema.safeParse({ label });
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { label: parsed.error.issues[0]?.message ?? "Invalid label" },
    };
  }

  try {
    const [row] = await db
      .insert(stylingCatalog)
      .values({ label: parsed.data.label.trim() })
      .returning({ id: stylingCatalog.id, label: stylingCatalog.label });
    return { ok: true, data: row };
  } catch {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { label: "A styling option with this name already exists" },
    };
  }
}

export async function updateStylingCatalogEntry(
  id: number,
  label: string,
): Promise<ActionResult<{ id: number; label: string }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = stylingCatalogEntrySchema.safeParse({ label });
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { label: parsed.error.issues[0]?.message ?? "Invalid label" },
    };
  }

  try {
    const [row] = await db
      .update(stylingCatalog)
      .set({ label: parsed.data.label.trim() })
      .where(eq(stylingCatalog.id, id))
      .returning({ id: stylingCatalog.id, label: stylingCatalog.label });
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true, data: row };
  } catch {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { label: "A styling option with this name already exists" },
    };
  }
}

export async function deleteStylingCatalogEntry(id: number): Promise<ActionResult<null>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const deleted = await db
    .delete(stylingCatalog)
    .where(eq(stylingCatalog.id, id))
    .returning({ id: stylingCatalog.id });
  if (deleted.length === 0) return { ok: false, error: "not_found" };

  return { ok: true, data: null };
}
