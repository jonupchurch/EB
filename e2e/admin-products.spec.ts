import { expect, test, type Page } from "@playwright/test";

async function signInAsAdmin(page: Page) {
  await page.goto("/api/auth/signin");
  await page.getByLabel(/email/i).fill("ericaburnsthings@gmail.com");
  await page.getByRole("button", { name: /sign in with test login/i }).click();
  // Re-navigate (hard navigation) rather than waiting on the credentials
  // callback's own redirect target — confirms the session took effect.
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
}

test("sign-in, create a product with a priced option, and see it in the list", async ({
  page,
}) => {
  await signInAsAdmin(page);

  await page.goto("/admin/products/new");
  await expect(page.getByRole("heading", { name: "New product" })).toBeVisible();

  const productName = `E2E Test Shirt ${Date.now()}`;
  await page.getByLabel("Name").fill(productName);
  await page.getByLabel("Base price (USD)").fill("18.00");

  const sizeSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Size" }) });
  await sizeSection.getByRole("button", { name: "+ Add size option" }).click();
  await sizeSection.locator('input[placeholder="Label"]').fill("Large");
  await sizeSection.getByLabel("Size option price adjustment").fill("4.00");

  await expect(page.getByText(/Example running total/i)).toBeVisible();

  await page.getByRole("button", { name: "Save product" }).click();

  // Save triggers a client-side (soft) navigation via router.push, not a
  // full page load — assert on the destination's content directly rather
  // than waiting on a navigation lifecycle event that a soft nav never
  // fires.
  const row = page.locator("tr", { hasText: productName });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await expect(row.getByText("1", { exact: true })).toBeVisible();
  await expect(row.getByText("$18.00", { exact: true })).toBeVisible();
  await expect(row.getByText("Draft", { exact: true })).toBeVisible();
});
