import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
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
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
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

// Shared, admin-managed catalogs (docs/adr/0016-styling-material-shared-catalogs.md)
// — styling/material are picked per product from these, not typed
// freely per product. Price stays a per-product decision (see the
// join tables below): the same catalog entry can cost differently,
// or not apply at all, on different products.

export const stylingCatalog = pgTable(
  "styling_catalog",
  {
    id: serial("id").primaryKey(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("styling_catalog_label_lower_idx").on(sql`lower(${table.label})`),
  ],
);

export const materialCatalog = pgTable("material_catalog", {
  id: serial("id").primaryKey(),
  modelNumber: text("model_number"),
  description: text("description").notNull(),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stylingOptions = pgTable(
  "styling_options",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    stylingCatalogId: integer("styling_catalog_id")
      .notNull()
      .references(() => stylingCatalog.id, { onDelete: "cascade" }),
    priceAdjustmentCents: integer("price_adjustment_cents").notNull().default(0),
    sortOrder: integer("sort_order"),
  },
  (table) => [
    uniqueIndex("styling_options_product_catalog_idx").on(
      table.productId,
      table.stylingCatalogId,
    ),
  ],
);

export const materialOptions = pgTable(
  "material_options",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    materialCatalogId: integer("material_catalog_id")
      .notNull()
      .references(() => materialCatalog.id, { onDelete: "cascade" }),
    priceAdjustmentCents: integer("price_adjustment_cents").notNull().default(0),
    sortOrder: integer("sort_order"),
  },
  (table) => [
    uniqueIndex("material_options_product_catalog_idx").on(
      table.productId,
      table.materialCatalogId,
    ),
  ],
);

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
    stylingCatalog: one(stylingCatalog, {
      fields: [stylingOptions.stylingCatalogId],
      references: [stylingCatalog.id],
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
    materialCatalog: one(materialCatalog, {
      fields: [materialOptions.materialCatalogId],
      references: [materialCatalog.id],
    }),
  }),
);

export const stylingCatalogRelations = relations(stylingCatalog, ({ many }) => ({
  productOptions: many(stylingOptions),
}));

export const materialCatalogRelations = relations(materialCatalog, ({ many }) => ({
  productOptions: many(materialOptions),
}));

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

// --- Cart & checkout (feature 3) ---
// Schema shape follows specs/003-cart-checkout/data-model.md. No cart
// table exists by design (docs/adr/0011-client-side-cart-reference.md)
// — the cart is a client-held cookie reference, never persisted here.

export const promotionTypeEnum = pgEnum("promotion_type", [
  "flat",
  "bogo",
  "promo_code",
  "cart_threshold",
  "free_shipping",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "placed",
  "paid",
  "in production",
  "shipped",
]);

export const shippingMethodEnum = pgEnum("shipping_method", ["flat", "calculated"]);

export const promotions = pgTable(
  "promotions",
  {
    id: serial("id").primaryKey(),
    type: promotionTypeEnum("type").notNull(),
    promoCode: text("promo_code"),
    discountAmountCents: integer("discount_amount_cents"),
    thresholdCents: integer("threshold_cents"),
    active: boolean("active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("promotions_promo_code_lower_idx").on(sql`lower(${table.promoCode})`),
  ],
);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  status: orderStatusEnum("status").notNull().default("placed"),
  subtotalCents: integer("subtotal_cents").notNull(),
  discountCents: integer("discount_cents").notNull().default(0),
  promotionId: integer("promotion_id").references(() => promotions.id, {
    onDelete: "set null",
  }),
  shippingMethod: shippingMethodEnum("shipping_method").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  taxCents: integer("tax_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  shippingName: text("shipping_name").notNull(),
  shippingLine1: text("shipping_line1").notNull(),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state").notNull(),
  shippingZip: text("shipping_zip").notNull(),
  shippingCountry: text("shipping_country").notNull(),
  customerEmail: text("customer_email").notNull(),
  paypalOrderId: text("paypal_order_id").notNull().unique(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  confirmationToken: text("confirmation_token").notNull().unique(),
  confirmationEmailSentAt: timestamp("confirmation_email_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export interface OrderItemOptionSnapshot {
  category: string;
  label: string;
  priceAdjustmentCents: number;
}

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  unitPriceCentsSnapshot: integer("unit_price_cents_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
  selectedOptionsSnapshot: jsonb("selected_options_snapshot")
    .$type<OrderItemOptionSnapshot[]>()
    .notNull(),
});

export const promotionsRelations = relations(promotions, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  promotion: one(promotions, {
    fields: [orders.promotionId],
    references: [promotions.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
