import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // NOTE: if a `npm run dev` is already running locally on this port when
    // Playwright starts, it reuses that server as-is instead of starting its
    // own — including skipping any `env` overrides below. That's fine for a
    // plain dev server, but if a feature later needs deterministic e2e state
    // (e.g. a fake/sandboxed payment or AI provider, a relaxed rate limit),
    // set it via `env` here, and stop any manually-running `npm run dev`
    // before running e2e locally so those overrides actually apply.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
