import { config } from "dotenv";

// Vitest runs standalone (outside Next.js), so it doesn't get
// .env.local loaded automatically the way `next dev`/`next build` do.
config({ path: ".env.local" });
