"use server";

import { requireAdminSession } from "@/auth";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import {
  createPromotionRow,
  deletePromotionRow,
  listPromotionRows,
  updatePromotionRow,
  type PromotionListItem,
} from "@/lib/admin/promotion-crud";
import { promotionInputSchema } from "@/lib/admin/schemas";

type ActionError = {
  ok: false;
  error: "not_authorized" | "not_found" | "validation_error" | "duplicate_code";
  fieldErrors?: Record<string, string>;
};

type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionError;

const NOT_AUTHORIZED: ActionError = { ok: false, error: "not_authorized" };
const INVALID_INPUT: ActionError = {
  ok: false,
  error: "validation_error",
  fieldErrors: { _root: "Please check the discount details." },
};

export async function listPromotions(): Promise<ActionResult<PromotionListItem[]>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  return { ok: true, data: await listPromotionRows() };
}

export async function createPromotion(input: unknown): Promise<ActionResult<{ id: number }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = promotionInputSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  return createPromotionRow(parsed.data);
}

export async function updatePromotion(
  id: number,
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = promotionInputSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  return updatePromotionRow(id, parsed.data);
}

export async function deletePromotion(id: number): Promise<ActionResult<null>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  return deletePromotionRow(id);
}
