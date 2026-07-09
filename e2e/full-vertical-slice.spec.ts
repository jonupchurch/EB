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

// The one standing happy-path e2e Constitution Principle V has
// required since ratification: browse -> cart -> checkout -> pay ->
// confirmation -> order visible in the admin queue -> fulfilled. No
// earlier feature could complete this on its own — the admin queue
// this test's final steps depend on didn't exist until feature 5.
test("full vertical slice: browse to cart to checkout to confirmation to admin fulfillment", async ({
  page,
  request,
}) => {
  await signInAsAdmin(page);

  const categoryName = `E2E Vertical Slice Category ${Date.now()}`;
  const productName = `E2E Vertical Slice Product ${Date.now()}`;
  const basePriceCents = 3200;

  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(productName);
  await page.getByLabel("Base price (USD)").fill((basePriceCents / 100).toFixed(2));
  await page.getByPlaceholder("Add a new category").fill(categoryName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("select#category")).toHaveValue(/\d+/);
  await page.getByLabel("Active", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.locator("tr", { hasText: productName })).toBeVisible({ timeout: 10_000 });

  // Browse (feature 2) -> cart (feature 3)
  const customerName = `E2E Vertical Slice Customer ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(productName) }).click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  // Checkout and pay (feature 3, fake PayPal)
  await page.goto("/checkout");
  await page.getByLabel("Email").fill("vertical-slice@example.com");
  await page.getByLabel("Full name").fill(customerName);
  await page.getByLabel("Street address").fill("123 Main St");
  await page.getByLabel("City").fill("Cleveland");
  await page.getByLabel("State").selectOption("OH");
  await page.getByLabel("ZIP").fill("44101");
  await page.getByRole("button", { name: "Review order" }).click();
  await page.getByRole("button", { name: "Pay with PayPal" }).click();

  await expect(page).toHaveURL(/fake-paypal-approval/);
  const paypalOrderId = new URL(page.url()).searchParams.get("orderId");
  expect(paypalOrderId).toBeTruthy();
  await page.getByRole("link", { name: "Approve Payment (test)" }).click();

  // Confirmation (feature 4)
  await expect(page).toHaveURL(/\/orders\//);
  await expect(page.getByRole("heading", { name: "Thank you for your order!" })).toBeVisible();
  const confirmationUrl = page.url();

  const webhookResponse = await request.post("/api/webhooks/paypal", {
    data: {
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { supplementary_data: { related_ids: { order_id: paypalOrderId } } },
    },
  });
  expect(webhookResponse.ok()).toBe(true);
  await expect(page.locator('li[data-reached="true"]', { hasText: "Paid" })).toBeVisible();

  // Order visible in the admin queue, correctly (feature 5)
  await page.goto("/admin/orders");
  const row = page.locator("tr", { hasText: customerName });
  await expect(row).toBeVisible();
  await expect(row.getByText("Paid", { exact: true })).toBeVisible();

  // Advance through fulfillment (feature 5)
  await row.getByRole("link", { name: /^Order #\d+/ }).click();
  await page.getByRole("button", { name: "Mark as In production" }).click();
  await expect(page.getByRole("button", { name: "Mark as Shipped" })).toBeVisible();
  await page.getByRole("button", { name: "Mark as Shipped" }).click();
  await expect(page.getByText("No further action needed.")).toBeVisible();

  // ...and the customer-facing confirmation page (feature 4) reflects
  // it too on a fresh revisit — the whole point of feature 5 driving
  // stages feature 4 already knew how to display.
  await page.goto(confirmationUrl);
  await expect(page.locator('li[data-reached="true"]', { hasText: "Shipped" })).toBeVisible();
});
