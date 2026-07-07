import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Infrastructure-only table used to prove the connection/migration
// pipeline works end-to-end (see src/app/api/health/route.ts and
// tests/db/connection.test.ts). See docs/adr/0001-postgres-persistence.md.
export const healthCheck = pgTable("health_check", {
  id: serial("id").primaryKey(),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Admin product management (feature 1) ---
// Schema shape follows specs/001-admin-product-management/data-model.md
// and docs/adr/0007-product-options-schema.md (relational tables per
// option category, not a generic key-value table or a JSON blob).

export const productStatusEnum = pgEnum("product_status", ["active", "draft"]);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_name_lower_idx").on(sql`lower(${table.name})`),
  ],
);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  basePriceCents: integer("base_price_cents").notNull(),
  status: productStatusEnum("status").notNull().default("draft"),
  weightOz: integer("weight_oz"),
  lengthIn: integer("length_in"),
  widthIn: integer("width_in"),
  heightIn: integer("height_in"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const processingOptions = pgTable("processing_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  priceAdjustmentCents: integer("price_adjustment_cents").notNull().default(0),
  sortOrder: integer("sort_order"),
  requiresCustomerUpload: boolean("requires_customer_upload")
    .notNull()
    .default(false),
});

export const stylingOptions = pgTable("styling_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  priceAdjustmentCents: integer("price_adjustment_cents").notNull().default(0),
  sortOrder: integer("sort_order"),
});

export const materialOptions = pgTable("material_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  modelNumber: text("model_number"),
  description: text("description").notNull(),
  priceAdjustmentCents: integer("price_adjustment_cents").notNull().default(0),
  sortOrder: integer("sort_order"),
});

export const sizeOptions = pgTable("size_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  priceAdjustmentCents: integer("price_adjustment_cents").notNull().default(0),
  sortOrder: integer("sort_order"),
});

export const colorOptions = pgTable("color_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  swatchHex: text("swatch_hex"),
  priceAdjustmentCents: integer("price_adjustment_cents").notNull().default(0),
  sortOrder: integer("sort_order"),
});

export const designLocationOptions = pgTable("design_location_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  priceAdjustmentCents: integer("price_adjustment_cents").notNull().default(0),
  sortOrder: integer("sort_order"),
});

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  processingOptions: many(processingOptions),
  stylingOptions: many(stylingOptions),
  materialOptions: many(materialOptions),
  sizeOptions: many(sizeOptions),
  colorOptions: many(colorOptions),
  designLocationOptions: many(designLocationOptions),
  images: many(productImages),
}));

export const processingOptionsRelations = relations(
  processingOptions,
  ({ one }) => ({
    product: one(products, {
      fields: [processingOptions.productId],
      references: [products.id],
    }),
  }),
);

export const stylingOptionsRelations = relations(
  stylingOptions,
  ({ one }) => ({
    product: one(products, {
      fields: [stylingOptions.productId],
      references: [products.id],
    }),
  }),
);

export const materialOptionsRelations = relations(
  materialOptions,
  ({ one }) => ({
    product: one(products, {
      fields: [materialOptions.productId],
      references: [products.id],
    }),
  }),
);

export const sizeOptionsRelations = relations(sizeOptions, ({ one }) => ({
  product: one(products, {
    fields: [sizeOptions.productId],
    references: [products.id],
  }),
}));

export const colorOptionsRelations = relations(colorOptions, ({ one }) => ({
  product: one(products, {
    fields: [colorOptions.productId],
    references: [products.id],
  }),
}));

export const designLocationOptionsRelations = relations(
  designLocationOptions,
  ({ one }) => ({
    product: one(products, {
      fields: [designLocationOptions.productId],
      references: [products.id],
    }),
  }),
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));
