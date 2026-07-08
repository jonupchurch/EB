// Read-only catalog queries for the public storefront (feature 2).
// Every query here hard-filters status = 'active' server-side — never
// a client-side/UI-only filter — so a Draft product can never leak
// regardless of how a route is reached (FR-002, FR-009;
// docs/adr/0010-catalog-rendering-strategy.md).

import { asc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isCustomerSelectable } from "./processing-options";

export interface ActiveCategory {
  id: number;
  name: string;
}

export interface ActiveCatalogProduct {
  id: number;
  name: string;
  basePriceCents: number;
  primaryImageUrl: string | null;
}

export async function getActiveCategories(): Promise<ActiveCategory[]> {
  const rows = await db.query.categories.findMany({
    orderBy: (categories, { asc }) => [asc(categories.name)],
    with: {
      products: {
        where: (products, { eq }) => eq(products.status, "active"),
        columns: { id: true },
        limit: 1,
      },
    },
  });

  return rows
    .filter((category) => category.products.length > 0)
    .map((category) => ({ id: category.id, name: category.name }));
}

export async function getActiveProductsByCategory(
  categoryId?: number,
): Promise<ActiveCatalogProduct[]> {
  const rows = await db.query.products.findMany({
    where: (products, { and, eq }) =>
      categoryId === undefined
        ? eq(products.status, "active")
        : and(eq(products.status, "active"), eq(products.categoryId, categoryId)),
    orderBy: [asc(products.name)],
    with: {
      images: { orderBy: (images, { asc }) => [asc(images.sortOrder)], limit: 1 },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    basePriceCents: row.basePriceCents,
    primaryImageUrl: row.images[0]?.url ?? null,
  }));
}

export type GetActiveProductResult =
  | { ok: true; data: ActiveProductDetail }
  | { ok: false; error: "not_found" };

export interface ActiveProductDetail {
  id: number;
  name: string;
  description: string | null;
  basePriceCents: number;
  // Packaged shipping info (feature 1's FR-017) — not shown anywhere
  // in this feature's own UI, but needed by feature 3's calculated
  // shipping-rate lookup, which reuses this query rather than
  // duplicating it.
  weightOz: number | null;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  images: { id: number; url: string }[];
  processingOptions: { id: number; label: string; priceAdjustmentCents: number }[];
  stylingOptions: { id: number; label: string; priceAdjustmentCents: number }[];
  materialOptions: { id: number; label: string; priceAdjustmentCents: number }[];
  sizeOptions: { id: number; label: string; priceAdjustmentCents: number }[];
  colorOptions: {
    id: number;
    label: string;
    swatchHex: string | null;
    priceAdjustmentCents: number;
  }[];
  designLocationOptions: { id: number; label: string; priceAdjustmentCents: number }[];
}

export async function getActiveProduct(id: number): Promise<GetActiveProductResult> {
  const row = await db.query.products.findFirst({
    where: (products, { and, eq }) => and(eq(products.id, id), eq(products.status, "active")),
    with: {
      images: { orderBy: (images, { asc }) => [asc(images.sortOrder)] },
      processingOptions: { orderBy: (o, { asc }) => [asc(o.sortOrder)] },
      stylingOptions: {
        orderBy: (o, { asc }) => [asc(o.sortOrder)],
        with: { stylingCatalog: true },
      },
      materialOptions: {
        orderBy: (o, { asc }) => [asc(o.sortOrder)],
        with: { materialCatalog: true },
      },
      sizeOptions: { orderBy: (o, { asc }) => [asc(o.sortOrder)] },
      colorOptions: { orderBy: (o, { asc }) => [asc(o.sortOrder)] },
      designLocationOptions: { orderBy: (o, { asc }) => [asc(o.sortOrder)] },
    },
  });

  // A nonexistent id and a Draft product's id are indistinguishable
  // here on purpose (FR-002/FR-009) — the query above already excludes
  // Draft products, so both cases simply fall through to `undefined`.
  if (!row) return { ok: false, error: "not_found" };

  return {
    ok: true,
    data: {
      id: row.id,
      name: row.name,
      description: row.description,
      basePriceCents: row.basePriceCents,
      weightOz: row.weightOz,
      lengthIn: row.lengthIn,
      widthIn: row.widthIn,
      heightIn: row.heightIn,
      images: row.images.map((img) => ({ id: img.id, url: img.url })),
      processingOptions: row.processingOptions
        .filter(isCustomerSelectable)
        .map((o) => ({ id: o.id, label: o.label, priceAdjustmentCents: o.priceAdjustmentCents })),
      stylingOptions: row.stylingOptions.map((o) => ({
        id: o.id,
        label: o.stylingCatalog.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
      materialOptions: row.materialOptions.map((o) => ({
        id: o.id,
        label: o.materialCatalog.description,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
      sizeOptions: row.sizeOptions.map((o) => ({
        id: o.id,
        label: o.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
      colorOptions: row.colorOptions.map((o) => ({
        id: o.id,
        label: o.label,
        swatchHex: o.swatchHex,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
      designLocationOptions: row.designLocationOptions.map((o) => ({
        id: o.id,
        label: o.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
    },
  };
}
