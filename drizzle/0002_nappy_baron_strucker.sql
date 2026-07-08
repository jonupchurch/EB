CREATE TABLE "material_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_number" text,
	"description" text NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "styling_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "material_options" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "styling_options" ALTER COLUMN "label" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "material_options" ADD COLUMN "material_catalog_id" integer;--> statement-breakpoint
ALTER TABLE "styling_options" ADD COLUMN "styling_catalog_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "styling_catalog_label_lower_idx" ON "styling_catalog" USING btree (lower("label"));--> statement-breakpoint
ALTER TABLE "material_options" ADD CONSTRAINT "material_options_material_catalog_id_material_catalog_id_fk" FOREIGN KEY ("material_catalog_id") REFERENCES "public"."material_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "styling_options" ADD CONSTRAINT "styling_options_styling_catalog_id_styling_catalog_id_fk" FOREIGN KEY ("styling_catalog_id") REFERENCES "public"."styling_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "material_options_product_catalog_idx" ON "material_options" USING btree ("product_id","material_catalog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "styling_options_product_catalog_idx" ON "styling_options" USING btree ("product_id","styling_catalog_id");