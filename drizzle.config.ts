import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs standalone (outside Next.js), so it doesn't get
// .env.local loaded automatically the way `next dev`/`next build` do.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set — copy .env.example to .env.local and fill it in.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
