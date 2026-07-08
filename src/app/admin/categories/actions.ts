"use server";

import { eq, sql } from "drizzle-orm";
import { requireAdminSession } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";

type ActionError = {
  ok: false;
  error: "not_authorized" | "not_found" | "validation_error";
  fieldErrors?: Record<string, string>;
};

type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionError;

const NOT_AUTHORIZED: ActionError = { ok: false, error: "not_authorized" };

export async function getCategories(): Promise<ActionResult<{ id: number; name: string }[]>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(categories.name);

  return { ok: true, data: rows };
}

export interface CategoryListItem {
  id: number;
  name: string;
  productCount: number;
}

export async function getCategoriesWithProductCounts(): Promise<ActionResult<CategoryListItem[]>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id, categories.name)
    .orderBy(categories.name);

  return { ok: true, data: rows };
}

export async function createCategory(
  name: string,
): Promise<ActionResult<{ id: number; name: string }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "validation_error", fieldErrors: { name: "Name is required" } };
  }

  try {
    const [row] = await db
      .insert(categories)
      .values({ name: trimmed })
      .returning({ id: categories.id, name: categories.name });
    return { ok: true, data: row };
  } catch {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { name: "A category with this name already exists" },
    };
  }
}

export async function updateCategory(
  id: number,
  name: string,
): Promise<ActionResult<{ id: number; name: string }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "validation_error", fieldErrors: { name: "Name is required" } };
  }

  try {
    const [row] = await db
      .update(categories)
      .set({ name: trimmed })
      .where(eq(categories.id, id))
      .returning({ id: categories.id, name: categories.name });
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true, data: row };
  } catch {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { name: "A category with this name already exists" },
    };
  }
}

export async function deleteCategory(id: number): Promise<ActionResult<null>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({
    id: categories.id,
  });
  if (deleted.length === 0) return { ok: false, error: "not_found" };

  return { ok: true, data: null };
}
