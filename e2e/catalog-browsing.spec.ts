import { expect, test, type Page } from "@playwright/test";

async function signInAsAdmin(page: Page) {
  await page.goto("/api/auth/signin");
  await page.getByLabel(/email/i).fill("ericaburnsthings@gmail.com");
  await page.getByRole("button", { name: /sign in with test login/i }).click();
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
}

test("browse the catalog, open a product, select options, and see an accurate price", async ({
  page,
}) => {
  await signInAsAdmin(page);

  const categoryName = `E2E Catalog Category ${Date.now()}`;
  const productName = `E2E Catalog Product ${Date.now()}`;

  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(productName);
  await page.getByLabel("Base price (USD)").fill("20.00");

  await page.getByPlaceholder("Add a new category").fill(categoryName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("select#category")).toHaveValue(/\d+/);

  const sizeSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Size" }) });
  await sizeSection.getByRole("button", { name: "+ Add size option" }).click();
  await sizeSection.locator('input[placeholder="Label"]').fill("Large");
  await sizeSection.getByLabel("Size option price adjustment").fill("5.00");

  await page.getByLabel("Active", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();

  const row = page.locator("tr", { hasText: productName });
  await expect(row).toBeVisible({ timeout: 10_000 });

  // Storefront is public — no session needed, but this test's session
  // doesn't interfere with what an unauthenticated visitor would see.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: categoryName })).toBeVisible();
  const catalogCard = page.getByRole("link", { name: new RegExp(productName) });
  await expect(catalogCard).toBeVisible();
  await expect(catalogCard.getByText("Starting at $20.00")).toBeVisible();

  await catalogCard.click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await expect(page.getByText("$20.00", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Large/ }).click();
  await expect(page.getByText("$25.00", { exact: true })).toBeVisible();

  // Deselecting returns to the base price — confirms the total never
  // drifts from the exact sum in either direction (SC-003).
  await page.getByRole("button", { name: /Large/ }).click();
  await expect(page.getByText("$20.00", { exact: true })).toBeVisible();
});

test("a Draft product's detail URL behaves as not found", async ({ page }) => {
  await signInAsAdmin(page);

  const draftName = `E2E Draft Product ${Date.now()}`;
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(draftName);
  await page.getByLabel("Base price (USD)").fill("9.00");
  // Draft is the default status — no need to touch the radio.
  await page.getByRole("button", { name: "Save product" }).click();

  const row = page.locator("tr", { hasText: draftName });
  await expect(row).toBeVisible({ timeout: 10_000 });
  const editHref = await row.getByRole("link", { name: "Edit" }).getAttribute("href");
  const draftId = editHref!.split("/").pop();

  await page.goto(`/products/${draftId}`);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByText(draftName)).toHaveCount(0);
});

test("a nonexistent product id behaves identically to a Draft product", async ({ page }) => {
  await page.goto("/products/999999999");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
