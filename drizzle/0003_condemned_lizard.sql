ALTER TABLE "material_options" ALTER COLUMN "material_catalog_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "styling_options" ALTER COLUMN "styling_catalog_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "material_options" DROP COLUMN "model_number";--> statement-breakpoint
ALTER TABLE "material_options" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "styling_options" DROP COLUMN "label";