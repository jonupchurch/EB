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

async function createActiveProduct(page: Page, name: string, basePriceCents: number) {
  const categoryName = `E2E Confirmation Category ${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Base price (USD)").fill((basePriceCents / 100).toFixed(2));
  await page.getByPlaceholder("Add a new category").fill(categoryName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("select#category")).toHaveValue(/\d+/);
  await page.getByLabel("Active", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.locator("tr", { hasText: name })).toBeVisible({ timeout: 10_000 });
}

/**
 * Runs a full browse -> cart -> checkout -> PayPal approval flow and
 * lands on the resulting confirmation page, still unpaid (the webhook
 * hasn't been delivered yet). Returns the confirmation URL and the
 * PayPal order id needed to deliver that webhook.
 */
async function checkoutToConfirmation(
  page: Page,
  productName: string,
  email: string,
): Promise<{ confirmationUrl: string; paypalOrderId: string }> {
  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(productName) }).click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/checkout");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Full name").fill("Jane Buyer");
  await page.getByLabel("Street address").fill("123 Main St");
  await page.getByLabel("City").fill("Cleveland");
  await page.getByLabel("State").fill("OH");
  await page.getByLabel("ZIP").fill("44101");
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("button", { name: "Pay with PayPal" })).toBeVisible();
  await page.getByRole("button", { name: "Pay with PayPal" }).click();

  await expect(page).toHaveURL(/fake-paypal-approval/);
  const paypalOrderId = new URL(page.url()).searchParams.get("orderId");
  if (!paypalOrderId) throw new Error("Fake PayPal approval page did not include an orderId");

  await page.getByRole("link", { name: "Approve Payment (test)" }).click();
  await expect(page).toHaveURL(/\/orders\//);

  return { confirmationUrl: page.url(), paypalOrderId };
}

test("confirmation page shows accurate details, resolves confirming to paid without a reload, and stays accurate on revisit", async ({
  page,
  request,
}) => {
  await signInAsAdmin(page);
  const productName = `E2E Confirmation Product ${Date.now()}`;
  await createActiveProduct(page, productName, 1800);

  const { confirmationUrl, paypalOrderId } = await checkoutToConfirmation(
    page,
    productName,
    "confirm-buyer@example.com",
  );

  // Landed while payment is still confirming (US1, FR-004) — every
  // detail is already accurate, never partial or placeholder.
  await expect(page.getByRole("heading", { name: "Thank you for your order!" })).toBeVisible();
  await expect(page.getByText(/Confirming your payment/i)).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByText(/^Order #[A-Z0-9]{8}$/)).toBeVisible();
  await expect(page.getByText("Subtotal")).toBeVisible();
  await expect(page.getByText("Cleveland, OH 44101")).toBeVisible();
  await expect(page.locator('li[data-reached="true"]', { hasText: "Placed" })).toBeVisible();
  await expect(page.locator('li[data-reached="true"]', { hasText: "Paid" })).toHaveCount(0);

  // Deliver the webhook while the page stays open — the confirming
  // state must resolve to paid on its own, with no manual refresh
  // (FR-004), via the page's own client-side polling.
  const webhookBody = {
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: { supplementary_data: { related_ids: { order_id: paypalOrderId } } },
  };
  const webhookResponse = await request.post("/api/webhooks/paypal", { data: webhookBody });
  expect(webhookResponse.ok()).toBe(true);

  await expect(page.getByText(/Confirming your payment/i)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('li[data-reached="true"]', { hasText: "Paid" })).toBeVisible();

  // Revisit later via the saved URL (US3, FR-010): a fresh load shows
  // the current, accurate state — already-paid, both stages reached —
  // not a stale snapshot from the original visit.
  await page.goto(confirmationUrl);
  await expect(page.getByText(/Confirming your payment/i)).toHaveCount(0);
  await expect(page.locator('li[data-reached="true"]', { hasText: "Placed" })).toBeVisible();
  await expect(page.locator('li[data-reached="true"]', { hasText: "Paid" })).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
});

test("a nonexistent confirmation token shows not found, never partial order data", async ({ page }) => {
  await page.goto("/orders/this-token-does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thank you for your order!" })).toHaveCount(0);
});

test("two different orders' confirmation pages never expose each other's data", async ({ page }) => {
  await signInAsAdmin(page);
  const productA = `E2E Confirmation Product A ${Date.now()}`;
  const productB = `E2E Confirmation Product B ${Date.now()}`;
  await createActiveProduct(page, productA, 1200);
  await createActiveProduct(page, productB, 2200);

  const orderA = await checkoutToConfirmation(page, productA, "buyer-a@example.com");
  const orderB = await checkoutToConfirmation(page, productB, "buyer-b@example.com");

  expect(orderA.confirmationUrl).not.toBe(orderB.confirmationUrl);

  await page.goto(orderA.confirmationUrl);
  await expect(page.getByText(productA)).toBeVisible();
  await expect(page.getByText(productB)).toHaveCount(0);

  await page.goto(orderB.confirmationUrl);
  await expect(page.getByText(productB)).toBeVisible();
  await expect(page.getByText(productA)).toHaveCount(0);
});
