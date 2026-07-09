"use server";

import { z } from "zod";
import { requireAdminSession } from "@/auth";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import {
  getSitePageContent,
  saveSitePageRow,
  type SitePageContent,
  type SitePageSlug,
} from "@/lib/admin/site-pages";

type ActionError = {
  ok: false;
  error: "not_authorized" | "validation_error";
  fieldErrors?: Record<string, string>;
};

type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionError;

const NOT_AUTHORIZED: ActionError = { ok: false, error: "not_authorized" };

const slugSchema = z.enum(["privacy", "terms", "about"]);
const saveInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  bodyHtml: z.string(),
});

export async function getSitePageForEditor(
  slug: unknown,
): Promise<ActionResult<SitePageContent>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { ok: false, error: "validation_error", fieldErrors: { _root: "Unknown page." } };
  }

  return { ok: true, data: await getSitePageContent(parsedSlug.data) };
}

export async function saveSitePage(
  slug: unknown,
  input: unknown,
): Promise<ActionResult<{ slug: SitePageSlug }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { ok: false, error: "validation_error", fieldErrors: { _root: "Unknown page." } };
  }

  const parsed = saveInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { title: "Title is required" },
    };
  }

  // saveSitePageRow sanitizes bodyHtml server-side before storage
  // (FR-005, docs/adr/0017) — the Tiptap output passed in here is
  // never trusted as already-safe.
  await saveSitePageRow(parsedSlug.data, parsed.data.title, parsed.data.bodyHtml);
  return { ok: true, data: { slug: parsedSlug.data } };
}
