"use server";

import { eq, sql } from "drizzle-orm";
import { requireAdminSession } from "@/auth";
import { db } from "@/db";
import { materialCatalog, materialOptions } from "@/db/schema";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { materialCatalogEntrySchema } from "@/lib/admin/schemas";

type ActionError = {
  ok: false;
  error: "not_authorized" | "not_found" | "validation_error";
  fieldErrors?: Record<string, string>;
};

type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionError;

const NOT_AUTHORIZED: ActionError = { ok: false, error: "not_authorized" };

export async function getMaterialCatalog(): Promise<
  ActionResult<{ id: number; modelNumber: string | null; description: string }[]>
> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const rows = await db
    .select({
      id: materialCatalog.id,
      modelNumber: materialCatalog.modelNumber,
      description: materialCatalog.description,
    })
    .from(materialCatalog)
    .orderBy(materialCatalog.description);

  return { ok: true, data: rows };
}

export interface MaterialCatalogListItem {
  id: number;
  modelNumber: string | null;
  description: string;
  usageCount: number;
}

export async function getMaterialCatalogWithUsageCounts(): Promise<
  ActionResult<MaterialCatalogListItem[]>
> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const rows = await db
    .select({
      id: materialCatalog.id,
      modelNumber: materialCatalog.modelNumber,
      description: materialCatalog.description,
      usageCount: sql<number>`count(${materialOptions.id})::int`,
    })
    .from(materialCatalog)
    .leftJoin(materialOptions, eq(materialOptions.materialCatalogId, materialCatalog.id))
    .groupBy(materialCatalog.id, materialCatalog.modelNumber, materialCatalog.description)
    .orderBy(materialCatalog.description);

  return { ok: true, data: rows };
}

export async function createMaterialCatalogEntry(
  modelNumber: string | undefined,
  description: string,
): Promise<ActionResult<{ id: number; modelNumber: string | null; description: string }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = materialCatalogEntrySchema.safeParse({ modelNumber, description });
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { description: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const [row] = await db
    .insert(materialCatalog)
    .values({
      modelNumber: parsed.data.modelNumber?.trim() || null,
      description: parsed.data.description.trim(),
    })
    .returning({
      id: materialCatalog.id,
      modelNumber: materialCatalog.modelNumber,
      description: materialCatalog.description,
    });

  return { ok: true, data: row };
}

export async function updateMaterialCatalogEntry(
  id: number,
  modelNumber: string | undefined,
  description: string,
): Promise<ActionResult<{ id: number; modelNumber: string | null; description: string }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = materialCatalogEntrySchema.safeParse({ modelNumber, description });
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { description: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const [row] = await db
    .update(materialCatalog)
    .set({
      modelNumber: parsed.data.modelNumber?.trim() || null,
      description: parsed.data.description.trim(),
    })
    .where(eq(materialCatalog.id, id))
    .returning({
      id: materialCatalog.id,
      modelNumber: materialCatalog.modelNumber,
      description: materialCatalog.description,
    });

  if (!row) return { ok: false, error: "not_found" };
  return { ok: true, data: row };
}

export async function deleteMaterialCatalogEntry(id: number): Promise<ActionResult<null>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const deleted = await db
    .delete(materialCatalog)
    .where(eq(materialCatalog.id, id))
    .returning({ id: materialCatalog.id });
  if (deleted.length === 0) return { ok: false, error: "not_found" };

  return { ok: true, data: null };
}
