CREATE TABLE "shop_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"flat_rate_shipping_cents" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
