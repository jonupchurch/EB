-- Step 1 (migration 0002) added stylingCatalogId/materialCatalogId as
-- nullable so the migration stayed unambiguous for drizzle-kit's
-- generator. Any row from before this feature's catalog conversion
-- has no catalog reference to backfill (its old free-text label has
-- no corresponding catalog entry) -- delete rather than migrate, per
-- docs/adr/0016's "clean reshape, not a data migration" decision.
DELETE FROM "material_options" WHERE "material_catalog_id" IS NULL;--> statement-breakpoint
DELETE FROM "styling_options" WHERE "styling_catalog_id" IS NULL;--> statement-breakpoint
ALTER TABLE "material_options" ALTER COLUMN "material_catalog_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "styling_options" ALTER COLUMN "styling_catalog_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "material_options" DROP COLUMN "model_number";--> statement-breakpoint
ALTER TABLE "material_options" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "styling_options" DROP COLUMN "label";