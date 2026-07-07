CREATE TYPE "public"."product_status" AS ENUM('active', 'draft');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "color_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"label" text NOT NULL,
	"swatch_hex" text,
	"price_adjustment_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "design_location_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"label" text NOT NULL,
	"price_adjustment_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "material_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"model_number" text,
	"description" text NOT NULL,
	"price_adjustment_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "processing_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"label" text NOT NULL,
	"price_adjustment_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer,
	"requires_customer_upload" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer,
	"name" text NOT NULL,
	"description" text,
	"base_price_cents" integer NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"weight_oz" integer,
	"length_in" integer,
	"width_in" integer,
	"height_in" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "size_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"label" text NOT NULL,
	"price_adjustment_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "styling_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"label" text NOT NULL,
	"price_adjustment_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
ALTER TABLE "color_options" ADD CONSTRAINT "color_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_location_options" ADD CONSTRAINT "design_location_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_options" ADD CONSTRAINT "material_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_options" ADD CONSTRAINT "processing_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "size_options" ADD CONSTRAINT "size_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "styling_options" ADD CONSTRAINT "styling_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_lower_idx" ON "categories" USING btree (lower("name"));