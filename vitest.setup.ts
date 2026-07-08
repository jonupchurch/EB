import { config } from "dotenv";

// Vitest runs standalone (outside Next.js), so it doesn't get
// .env.local loaded automatically the way `next dev`/`next build` do.
config({ path: ".env.local" });

// Real PayPal/TaxJar/Shippo sandbox credentials live in .env.local for
// local dev/manual verification — but automated tests must never
// exercise them (research.md's fake-provider pattern). Force fakes
// regardless of what's configured above.
process.env.CHECKOUT_FAKE_PROVIDERS = "true";
