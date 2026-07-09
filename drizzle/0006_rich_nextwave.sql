CREATE TYPE "public"."site_page_slug" AS ENUM('privacy', 'terms', 'about');--> statement-breakpoint
CREATE TABLE "site_pages" (
	"slug" "site_page_slug" PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body_html" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
