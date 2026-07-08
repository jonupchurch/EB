"use server";

import { desc, eq, ilike, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { requireAdminSession } from "@/auth";
import { db } from "@/db";
import {
  colorOptions,
  designLocationOptions,
  materialOptions,
  processingOptions,
  productImages,
  products,
  sizeOptions,
  stylingOptions,
} from "@/db/schema";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { deleteProductImage, uploadProductImage } from "@/lib/admin/product-images";
import { productSchema, type ProductInput } from "@/lib/admin/schemas";

type ActionError = {
  ok: false;
  error: "not_authorized" | "not_found" | "validation_error";
  fieldErrors?: Record<string, string>;
};

type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionError;

const NOT_AUTHORIZED: ActionError = { ok: false, error: "not_authorized" };

function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function productColumnValues(data: ProductInput) {
  return {
    name: data.name,
    description: data.description ?? null,
    basePriceCents: data.basePriceCents,
    categoryId: data.categoryId ?? null,
    status: data.status,
    weightOz: data.weightOz ?? null,
    lengthIn: data.lengthIn ?? null,
    widthIn: data.widthIn ?? null,
    heightIn: data.heightIn ?? null,
  };
}

async function insertOptionRows(tx: Transaction, productId: number, data: ProductInput) {
  if (data.processingOptions.length > 0) {
    await tx.insert(processingOptions).values(
      data.processingOptions.map((o) => ({
        productId,
        label: o.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
        sortOrder: o.sortOrder ?? null,
        requiresCustomerUpload: o.requiresCustomerUpload,
      })),
    );
  }
  if (data.stylingOptions.length > 0) {
    await tx.insert(stylingOptions).values(
      data.stylingOptions.map((o) => ({
        productId,
        stylingCatalogId: o.stylingCatalogId,
        priceAdjustmentCents: o.priceAdjustmentCents,
        sortOrder: o.sortOrder ?? null,
      })),
    );
  }
  if (data.materialOptions.length > 0) {
    await tx.insert(materialOptions).values(
      data.materialOptions.map((o) => ({
        productId,
        materialCatalogId: o.materialCatalogId,
        priceAdjustmentCents: o.priceAdjustmentCents,
        sortOrder: o.sortOrder ?? null,
      })),
    );
  }
  if (data.sizeOptions.length > 0) {
    await tx.insert(sizeOptions).values(
      data.sizeOptions.map((o) => ({
        productId,
        label: o.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
        sortOrder: o.sortOrder ?? null,
      })),
    );
  }
  if (data.colorOptions.length > 0) {
    await tx.insert(colorOptions).values(
      data.colorOptions.map((o) => ({
        productId,
        label: o.label,
        swatchHex: o.swatchHex ?? null,
        priceAdjustmentCents: o.priceAdjustmentCents,
        sortOrder: o.sortOrder ?? null,
      })),
    );
  }
  if (data.designLocationOptions.length > 0) {
    await tx.insert(designLocationOptions).values(
      data.designLocationOptions.map((o) => ({
        productId,
        label: o.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
        sortOrder: o.sortOrder ?? null,
      })),
    );
  }
}

async function validateCategoryExists(categoryId: number | undefined): Promise<string | null> {
  if (categoryId === undefined) return null;
  const category = await db.query.categories.findFirst({
    where: (categories, { eq }) => eq(categories.id, categoryId),
  });
  return category ? null : "Selected category no longer exists";
}

// --- Products: reads ---

const PRODUCTS_PAGE_SIZE = 20;

export interface ProductListItem {
  id: number;
  name: string;
  categoryName: string | null;
  variantCount: number;
  basePriceCents: number;
  status: "active" | "draft";
  thumbnailUrl: string | null;
}

export interface ProductListResult {
  items: ProductListItem[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export async function getProducts(
  options: { page?: number; search?: string } = {},
): Promise<ActionResult<ProductListResult>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const page = Math.max(1, options.page ?? 1);
  const search = options.search?.trim() ?? "";
  const whereClause = search
    ? or(ilike(products.name, `%${search}%`), ilike(products.description, `%${search}%`))
    : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(whereClause);

  const totalPages = Math.max(1, Math.ceil(count / PRODUCTS_PAGE_SIZE));

  const rows = await db.query.products.findMany({
    where: whereClause,
    orderBy: [desc(products.createdAt)],
    limit: PRODUCTS_PAGE_SIZE,
    offset: (page - 1) * PRODUCTS_PAGE_SIZE,
    with: {
      category: true,
      processingOptions: true,
      stylingOptions: true,
      materialOptions: true,
      sizeOptions: true,
      colorOptions: true,
      designLocationOptions: true,
      images: { orderBy: (images, { asc }) => [asc(images.sortOrder)], limit: 1 },
    },
  });

  const items: ProductListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryName: row.category?.name ?? null,
    variantCount:
      row.processingOptions.length +
      row.stylingOptions.length +
      row.materialOptions.length +
      row.sizeOptions.length +
      row.colorOptions.length +
      row.designLocationOptions.length,
    basePriceCents: row.basePriceCents,
    status: row.status,
    thumbnailUrl: row.images[0]?.url ?? null,
  }));

  return { ok: true, data: { items, page, totalPages, totalCount: count } };
}

export async function getProduct(id: number) {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const row = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, id),
    with: {
      processingOptions: true,
      stylingOptions: true,
      materialOptions: true,
      sizeOptions: true,
      colorOptions: true,
      designLocationOptions: true,
      images: { orderBy: (images, { asc }) => [asc(images.sortOrder)] },
    },
  });

  if (!row) return { ok: false, error: "not_found" } satisfies ActionError;

  return { ok: true, data: row } satisfies ActionSuccess<typeof row>;
}

// --- Products: mutations ---

export async function createProduct(input: unknown): Promise<ActionResult<{ id: number }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const data = parsed.data;

  const categoryError = await validateCategoryExists(data.categoryId);
  if (categoryError) {
    return { ok: false, error: "validation_error", fieldErrors: { categoryId: categoryError } };
  }

  const id = await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values(productColumnValues(data))
      .returning({ id: products.id });

    await insertOptionRows(tx, product.id, data);

    return product.id;
  });

  return { ok: true, data: { id } };
}

export async function updateProduct(
  id: number,
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const data = parsed.data;

  const existing = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, id),
  });
  if (!existing) return { ok: false, error: "not_found" };

  const categoryError = await validateCategoryExists(data.categoryId);
  if (categoryError) {
    return { ok: false, error: "validation_error", fieldErrors: { categoryId: categoryError } };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ ...productColumnValues(data), updatedAt: new Date() })
      .where(eq(products.id, id));

    await tx.delete(processingOptions).where(eq(processingOptions.productId, id));
    await tx.delete(stylingOptions).where(eq(stylingOptions.productId, id));
    await tx.delete(materialOptions).where(eq(materialOptions.productId, id));
    await tx.delete(sizeOptions).where(eq(sizeOptions.productId, id));
    await tx.delete(colorOptions).where(eq(colorOptions.productId, id));
    await tx.delete(designLocationOptions).where(eq(designLocationOptions.productId, id));

    await insertOptionRows(tx, id, data);
  });

  return { ok: true, data: { id } };
}

export async function duplicateProduct(id: number): Promise<ActionResult<{ id: number }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const source = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, id),
    with: {
      processingOptions: true,
      stylingOptions: true,
      materialOptions: true,
      sizeOptions: true,
      colorOptions: true,
      designLocationOptions: true,
      images: { orderBy: (images, { asc }) => [asc(images.sortOrder)] },
    },
  });
  if (!source) return { ok: false, error: "not_found" };

  const newId = await db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(products)
      .values({
        name: `Copy of ${source.name}`,
        description: source.description,
        basePriceCents: source.basePriceCents,
        categoryId: source.categoryId,
        status: "draft",
        weightOz: source.weightOz,
        lengthIn: source.lengthIn,
        widthIn: source.widthIn,
        heightIn: source.heightIn,
      })
      .returning({ id: products.id });

    if (source.processingOptions.length > 0) {
      await tx.insert(processingOptions).values(
        source.processingOptions.map((o) => ({
          productId: copy.id,
          label: o.label,
          priceAdjustmentCents: o.priceAdjustmentCents,
          sortOrder: o.sortOrder,
          requiresCustomerUpload: o.requiresCustomerUpload,
        })),
      );
    }
    if (source.stylingOptions.length > 0) {
      await tx.insert(stylingOptions).values(
        source.stylingOptions.map((o) => ({
          productId: copy.id,
          stylingCatalogId: o.stylingCatalogId,
          priceAdjustmentCents: o.priceAdjustmentCents,
          sortOrder: o.sortOrder,
        })),
      );
    }
    if (source.materialOptions.length > 0) {
      await tx.insert(materialOptions).values(
        source.materialOptions.map((o) => ({
          productId: copy.id,
          materialCatalogId: o.materialCatalogId,
          priceAdjustmentCents: o.priceAdjustmentCents,
          sortOrder: o.sortOrder,
        })),
      );
    }
    if (source.sizeOptions.length > 0) {
      await tx.insert(sizeOptions).values(
        source.sizeOptions.map((o) => ({
          productId: copy.id,
          label: o.label,
          priceAdjustmentCents: o.priceAdjustmentCents,
          sortOrder: o.sortOrder,
        })),
      );
    }
    if (source.colorOptions.length > 0) {
      await tx.insert(colorOptions).values(
        source.colorOptions.map((o) => ({
          productId: copy.id,
          label: o.label,
          swatchHex: o.swatchHex,
          priceAdjustmentCents: o.priceAdjustmentCents,
          sortOrder: o.sortOrder,
        })),
      );
    }
    if (source.designLocationOptions.length > 0) {
      await tx.insert(designLocationOptions).values(
        source.designLocationOptions.map((o) => ({
          productId: copy.id,
          label: o.label,
          priceAdjustmentCents: o.priceAdjustmentCents,
          sortOrder: o.sortOrder,
        })),
      );
    }
    if (source.images.length > 0) {
      await tx.insert(productImages).values(
        source.images.map((img) => ({
          productId: copy.id,
          url: img.url,
          sortOrder: img.sortOrder,
        })),
      );
    }

    return copy.id;
  });

  return { ok: true, data: { id: newId } };
}

// --- Product images ---

export async function addProductImage(
  productId: number,
  formData: FormData,
): Promise<ActionResult<{ id: number; url: string }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const product = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, productId),
  });
  if (!product) return { ok: false, error: "not_found" };

  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { file: "Please upload a supported image file" },
    };
  }

  let url: string;
  try {
    ({ url } = await uploadProductImage(file));
  } catch (error) {
    // Never let a Blob upload failure surface as Next's generic,
    // obfuscated production error — give the admin something specific
    // and actionable (FR-011/FR-012: no silent failures), and log the
    // real cause server-side for debugging.
    console.error("addProductImage: upload to Blob failed", error);
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: {
        file: `Upload failed: ${error instanceof Error ? error.message : "unknown error"}`,
      },
    };
  }

  const lastImage = await db.query.productImages.findFirst({
    where: (productImages, { eq }) => eq(productImages.productId, productId),
    orderBy: (productImages, { desc }) => [desc(productImages.sortOrder)],
  });
  const nextSortOrder = (lastImage?.sortOrder ?? -1) + 1;

  const [image] = await db
    .insert(productImages)
    .values({ productId, url, sortOrder: nextSortOrder })
    .returning({ id: productImages.id, url: productImages.url });

  return { ok: true, data: image };
}

export async function removeProductImage(id: number): Promise<ActionResult<null>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const image = await db.query.productImages.findFirst({
    where: (productImages, { eq }) => eq(productImages.id, id),
  });
  if (!image) return { ok: false, error: "not_found" };

  await db.delete(productImages).where(eq(productImages.id, id));

  const otherReference = await db.query.productImages.findFirst({
    where: (productImages, { eq }) => eq(productImages.url, image.url),
  });
  if (!otherReference) {
    await deleteProductImage(image.url);
  }

  return { ok: true, data: null };
}

export async function reorderProductImages(
  productId: number,
  orderedImageIds: number[],
): Promise<ActionResult<null>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const currentImages = await db.query.productImages.findMany({
    where: (productImages, { eq }) => eq(productImages.productId, productId),
  });

  const currentIds = new Set(currentImages.map((img) => img.id));
  const submittedIds = new Set(orderedImageIds);
  const exactMatch =
    currentIds.size === submittedIds.size &&
    [...currentIds].every((imgId) => submittedIds.has(imgId));
  if (!exactMatch) return { ok: false, error: "not_found" };

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedImageIds.length; i++) {
      await tx
        .update(productImages)
        .set({ sortOrder: i })
        .where(eq(productImages.id, orderedImageIds[i]));
    }
  });

  return { ok: true, data: null };
}

// --- Products: delete ---
// Reverses feature 1 spec.md's original no-hard-delete assumption —
// see the Assumptions amendment there. The six option tables and
// product_images cascade at the DB level; this action's own job is
// deleting the actual Blob-stored files first (reusing
// removeProductImage's "don't delete if another row references the
// same URL" check, since duplicated products can share an image URL).

export async function deleteProduct(id: number): Promise<ActionResult<null>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const product = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, id),
    with: { images: true },
  });
  if (!product) return { ok: false, error: "not_found" };

  for (const image of product.images) {
    const otherReference = await db.query.productImages.findFirst({
      where: (productImages, { and, eq, ne }) =>
        and(eq(productImages.url, image.url), ne(productImages.productId, id)),
    });
    if (!otherReference) {
      await deleteProductImage(image.url);
    }
  }

  await db.delete(products).where(eq(products.id, id));

  return { ok: true, data: null };
}
