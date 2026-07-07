import { z } from "zod";

// Validation rules per data-model.md — enforced server-side on every
// create/update (Constitution Principle II). categoryId's *existence*
// (does it reference a real Category row) is checked in the Server
// Action against the database, not here — Zod only validates shape.

const priceAdjustmentCentsSchema = z.number().int().default(0);

export const processingOptionSchema = z.object({
  id: z.number().int().optional(),
  label: z.string().min(1, "Label is required"),
  priceAdjustmentCents: priceAdjustmentCentsSchema,
  sortOrder: z.number().int().optional(),
  requiresCustomerUpload: z.boolean().default(false),
});

export const stylingOptionSchema = z.object({
  id: z.number().int().optional(),
  label: z.string().min(1, "Label is required"),
  priceAdjustmentCents: priceAdjustmentCentsSchema,
  sortOrder: z.number().int().optional(),
});

export const materialOptionSchema = z.object({
  id: z.number().int().optional(),
  modelNumber: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  priceAdjustmentCents: priceAdjustmentCentsSchema,
  sortOrder: z.number().int().optional(),
});

export const sizeOptionSchema = z.object({
  id: z.number().int().optional(),
  label: z.string().min(1, "Label is required"),
  priceAdjustmentCents: priceAdjustmentCentsSchema,
  sortOrder: z.number().int().optional(),
});

export const colorOptionSchema = z.object({
  id: z.number().int().optional(),
  label: z.string().min(1, "Label is required"),
  swatchHex: z.string().optional(),
  priceAdjustmentCents: priceAdjustmentCentsSchema,
  sortOrder: z.number().int().optional(),
});

export const designLocationOptionSchema = z.object({
  id: z.number().int().optional(),
  label: z.string().min(1, "Label is required"),
  priceAdjustmentCents: priceAdjustmentCentsSchema,
  sortOrder: z.number().int().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(0, "Base price must be zero or more"),
  categoryId: z.number().int().optional(),
  status: z.enum(["active", "draft"]).default("draft"),
  weightOz: z.number().int().optional(),
  lengthIn: z.number().int().optional(),
  widthIn: z.number().int().optional(),
  heightIn: z.number().int().optional(),
  processingOptions: z.array(processingOptionSchema).default([]),
  stylingOptions: z.array(stylingOptionSchema).default([]),
  materialOptions: z.array(materialOptionSchema).default([]),
  sizeOptions: z.array(sizeOptionSchema).default([]),
  colorOptions: z.array(colorOptionSchema).default([]),
  designLocationOptions: z.array(designLocationOptionSchema).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
