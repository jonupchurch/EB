import { config } from "dotenv";
config({ path: ".env.local" });

import { expect, test, type Page } from "@playwright/test";

async function signInAsAdmin(page: Page) {
  await page.goto("/api/auth/signin");
  await page.getByLabel(/email/i).fill("ericaburnsthings@gmail.com");
  await page.getByRole("button", { name: /sign in with test login/i }).click();
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

test("a promotion created in the admin UI applies correctly at the very next checkout", async ({ page }) => {
  await signInAsAdmin(page);

  const promoCode = `E2EADMIN${Date.now()}`;
  const discountCents = 400;

  // Create (US2, FR-006) — no code change, just the admin UI.
  await page.goto("/admin/discounts");
  await page.getByLabel("Type").selectOption("promo_code");
  await page.getByLabel("Promo code").fill(promoCode);
  await page.getByLabel("Discount amount (USD)").fill((discountCents / 100).toFixed(2));
  await page.getByRole("button", { name: "Create discount" }).click();
  await expect(page.locator("tr", { hasText: promoCode })).toBeVisible();
  await expect(page.locator("tr", { hasText: promoCode }).getByText("Active")).toBeVisible();

  // Product to buy against.
  const categoryName = `E2E Admin Discount Category ${Date.now()}`;
  const productName = `E2E Admin Discount Product ${Date.now()}`;
  const basePriceCents = 2500;
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(productName);
  await page.getByLabel("Base price (USD)").fill((basePriceCents / 100).toFixed(2));
  await page.getByPlaceholder("Add a new category").fill(categoryName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("select#category")).toHaveValue(/\d+/);
  await page.getByLabel("Active", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.locator("tr", { hasText: productName })).toBeVisible({ timeout: 10_000 });

  // Checkout with the code just created.
  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(productName) }).click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/checkout");
  await page.getByLabel("Email").fill("admin-discount-buyer@example.com");
  await page.getByLabel("Full name").fill("Jane Buyer");
  await page.getByLabel("Street address").fill("123 Main St");
  await page.getByLabel("City").fill("Cleveland");
  await page.getByLabel("State").selectOption("OH");
  await page.getByLabel("ZIP").fill("44101");
  await page.getByLabel("Promo code").fill(promoCode);
  await page.getByRole("button", { name: "Review order" }).click();

  await expect(page.getByText(money(basePriceCents), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`-${money(discountCents)}`, { exact: true })).toBeVisible();

  // Deactivate (US2, FR-007) — confirm it stops applying at checkout.
  await page.goto("/admin/discounts");
  await page.locator("tr", { hasText: promoCode }).getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Active").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("tr", { hasText: promoCode }).getByText("Inactive")).toBeVisible();

  await page.goto("/checkout");
  await page.getByLabel("Email").fill("admin-discount-buyer2@example.com");
  await page.getByLabel("Full name").fill("Jane Buyer");
  await page.getByLabel("Street address").fill("123 Main St");
  await page.getByLabel("City").fill("Cleveland");
  await page.getByLabel("State").selectOption("OH");
  await page.getByLabel("ZIP").fill("44101");
  await page.getByLabel("Promo code").fill(promoCode);
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByText("That promo code is no longer active.")).toBeVisible();
});

test("a percentage promo code discounts the exact expected, capped amount (US1, feature 7)", async ({ page }) => {
  await signInAsAdmin(page);

  const promoCode = `E2EPCT${Date.now()}`;
  const basePriceCents = 5000; // $50.00
  const percent = 20; // 20% of $50.00 = $10.00, capped below at $3.00
  const capCents = 300;

  await page.goto("/admin/discounts");
  await page.getByLabel("Type").selectOption("promo_code");
  await page.getByLabel("Promo code").fill(promoCode);
  await page.getByLabel("Discount value").selectOption("percentage");
  await page.getByLabel("Percentage off (1–100)").fill(String(percent));
  await page.getByLabel("Limit the maximum discount (optional)").check();
  await page.getByLabel("Maximum discount (USD)").fill((capCents / 100).toFixed(2));
  await page.getByRole("button", { name: "Create discount" }).click();
  await expect(page.locator("tr", { hasText: promoCode })).toBeVisible();
  await expect(page.locator("tr", { hasText: promoCode }).getByText(`${percent}% off (up to ${money(capCents)})`)).toBeVisible();

  const productName = `E2E Percent Discount Product ${Date.now()}`;
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(productName);
  await page.getByLabel("Base price (USD)").fill((basePriceCents / 100).toFixed(2));
  const categoryName = `E2E Percent Discount Category ${Date.now()}`;
  await page.getByPlaceholder("Add a new category").fill(categoryName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("select#category")).toHaveValue(/\d+/);
  await page.getByLabel("Active", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.locator("tr", { hasText: productName })).toBeVisible({ timeout: 10_000 });

  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(productName) }).click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/checkout");
  await page.getByLabel("Email").fill("percent-discount-buyer@example.com");
  await page.getByLabel("Full name").fill("Jane Buyer");
  await page.getByLabel("Street address").fill("123 Main St");
  await page.getByLabel("City").fill("Cleveland");
  await page.getByLabel("State").selectOption("OH");
  await page.getByLabel("ZIP").fill("44101");
  await page.getByLabel("Promo code").fill(promoCode);
  await page.getByRole("button", { name: "Review order" }).click();

  // The cap ($3.00) binds — never the uncapped 20% ($10.00).
  await expect(page.getByText(`-${money(capCents)}`, { exact: true })).toBeVisible();
});

test("an automatic (codeless) percentage promotion applies with no code entered (US2, feature 7)", async ({
  page,
}) => {
  await signInAsAdmin(page);

  const basePriceCents = 4000; // $40.00
  const percent = 90; // generously high so it wins best-value over any other active automatic promotion

  await page.goto("/admin/discounts");
  await page.getByLabel("Type").selectOption("flat");
  await page.getByLabel("Discount value").selectOption("percentage");
  await page.getByLabel("Percentage off (1–100)").fill(String(percent));
  await page.getByRole("button", { name: "Create discount" }).click();
  await expect(page.locator("tr", { hasText: `${percent}% off` })).toBeVisible();

  const productName = `E2E Automatic Percent Product ${Date.now()}`;
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(productName);
  await page.getByLabel("Base price (USD)").fill((basePriceCents / 100).toFixed(2));
  const categoryName = `E2E Automatic Percent Category ${Date.now()}`;
  await page.getByPlaceholder("Add a new category").fill(categoryName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("select#category")).toHaveValue(/\d+/);
  await page.getByLabel("Active", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.locator("tr", { hasText: productName })).toBeVisible({ timeout: 10_000 });

  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(productName) }).click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  // No promo code entered — the automatic percentage promotion must
  // apply on its own.
  await page.goto("/checkout");
  await page.getByLabel("Email").fill("automatic-percent-buyer@example.com");
  await page.getByLabel("Full name").fill("Jane Buyer");
  await page.getByLabel("Street address").fill("123 Main St");
  await page.getByLabel("City").fill("Cleveland");
  await page.getByLabel("State").selectOption("OH");
  await page.getByLabel("ZIP").fill("44101");
  await page.getByRole("button", { name: "Review order" }).click();

  const expectedDiscountCents = Math.round((basePriceCents * percent) / 100);
  await expect(page.getByText(`-${money(expectedDiscountCents)}`, { exact: true })).toBeVisible();
});
