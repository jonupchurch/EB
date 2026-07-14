CREATE TYPE "public"."promotion_value_mode" AS ENUM('flat', 'percentage');--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "value_mode" "promotion_value_mode" DEFAULT 'flat' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "discount_percent" integer;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "max_discount_cents" integer;