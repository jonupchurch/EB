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
  await page.getByLabel("Name", { exact: true }).fill(productName);
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

test("styling/material catalogs: create inline, select via dropdown, persist on reload", async ({
  page,
}) => {
  await signInAsAdmin(page);

  const styleName = `E2E Style ${Date.now()}`;
  const materialDesc = `E2E Material ${Date.now()}`;

  await page.goto("/admin/products/new");
  const productName = `E2E Catalog Product ${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(productName);
  await page.getByLabel("Base price (USD)").fill("12.00");

  const stylingSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Styling" }) });
  await stylingSection.getByPlaceholder("New styling option name").fill(styleName);
  await stylingSection.getByRole("button", { name: "+ Create new styling option" }).click();
  // Creating inline both adds the catalog entry and selects it on this product.
  await expect(stylingSection.getByText(styleName, { exact: true })).toBeVisible();

  const materialSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Material" }) });
  await materialSection.getByPlaceholder("New material description").fill(materialDesc);
  await materialSection.getByRole("button", { name: "+ Create new material option" }).click();
  await expect(materialSection.getByText(materialDesc, { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Save product" }).click();

  const row = page.locator("tr", { hasText: productName });
  await expect(row).toBeVisible({ timeout: 10_000 });

  // Reopen (via a hard navigation to the edit href, avoiding any soft-nav
  // timing ambiguity) and confirm the selections persisted with resolved
  // catalog labels.
  const editHref = await row.getByRole("link", { name: "Edit" }).getAttribute("href");
  await page.goto(editHref!);
  await expect(
    page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Styling" }) })
      .getByText(styleName, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Material" }) })
      .getByText(materialDesc, { exact: false }),
  ).toBeVisible();
});

test("categories page: create and rename", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/categories");

  const name = `E2E Category ${Date.now()}`;
  await page.getByPlaceholder("New category name").fill(name);
  await page.getByRole("button", { name: "+ Add category" }).click();
  await expect(page.locator("tr", { hasText: name })).toBeVisible();

  await page.locator("tr", { hasText: name }).getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Category name").fill(name + " Renamed");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("tr", { hasText: name + " Renamed" })).toBeVisible();
});
