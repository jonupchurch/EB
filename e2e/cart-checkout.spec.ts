import { config } from "dotenv";
config({ path: ".env.local" });

import { expect, test, type Page } from "@playwright/test";
import { db } from "../src/db";
import { promotions } from "../src/db/schema";

const FAKE_SHIPPING_BASE_CENTS = 500;
const FAKE_SHIPPING_PER_OZ_CENTS = 10;
const FAKE_TAX_RATE = 0.08;

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

async function signInAsAdmin(page: Page) {
  await page.goto("/api/auth/signin");
  await page.getByLabel(/email/i).fill("ericaburnsthings@gmail.com");
  await page.getByRole("button", { name: /sign in with test login/i }).click();
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
}

test("browse to cart to checkout to a webhook-verified paid order", async ({ page, request }) => {
  await signInAsAdmin(page);

  // No admin UI exists yet for promotions (feature 5) — seed directly.
  const promoCode = `E2E${Date.now()}`;
  const discountCents = 300;
  await db.insert(promotions).values({
    type: "promo_code",
    promoCode,
    discountAmountCents: discountCents,
    active: true,
  });

  const categoryName = `E2E Checkout Category ${Date.now()}`;
  const productName = `E2E Checkout Product ${Date.now()}`;
  const basePriceCents = 2000;
  const sizeAdjustmentCents = 500;
  const weightOzEach = 16;

  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(productName);
  await page.getByLabel("Base price (USD)").fill((basePriceCents / 100).toFixed(2));

  await page.getByPlaceholder("Add a new category").fill(categoryName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("select#category")).toHaveValue(/\d+/);

  const sizeSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Size" }) });
  await sizeSection.getByRole("button", { name: "+ Add size option" }).click();
  await sizeSection.locator('input[placeholder="Label"]').fill("Large");
  await sizeSection.getByLabel("Size option price adjustment").fill((sizeAdjustmentCents / 100).toFixed(2));

  // Weight/dimensions so calculated (fake Shippo) shipping can price it.
  await page.getByLabel("Weight (oz)").fill(String(weightOzEach));
  await page.getByLabel("Length (in)").fill("10");
  await page.getByLabel("Width (in)").fill("8");
  await page.getByLabel("Height (in)").fill("4");

  await page.getByLabel("Active", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();

  const row = page.locator("tr", { hasText: productName });
  await expect(row).toBeVisible({ timeout: 10_000 });

  // Storefront: browse, open the product, select the priced option, add 2 to cart.
  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(productName) }).click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  await page.getByRole("button", { name: /Large/ }).click();
  const unitPriceCents = basePriceCents + sizeAdjustmentCents;
  await expect(page.getByText(money(unitPriceCents), { exact: true })).toBeVisible();

  const quantity = 2;
  await page.getByLabel("Quantity").fill(String(quantity));
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  // Cart: confirm the line item quantity carried through.
  await page.goto("/cart");
  await expect(page.getByText(productName)).toBeVisible();
  const subtotalCents = unitPriceCents * quantity;
  await expect(page.getByText(money(subtotalCents), { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Proceed to Checkout" }).click();
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Full name").fill("Jane Buyer");
  await page.getByLabel("Street address").fill("123 Main St");
  await page.getByLabel("City").fill("Cleveland");
  await page.getByLabel("State").fill("OH");
  await page.getByLabel("ZIP").fill("44101");
  await page.getByLabel(/Calculated/).check();
  await page.getByLabel("Promo code").fill(promoCode);
  await page.getByRole("button", { name: "Review order" }).click();

  const totalWeightOz = weightOzEach * quantity;
  const shippingCents = FAKE_SHIPPING_BASE_CENTS + Math.round(totalWeightOz) * FAKE_SHIPPING_PER_OZ_CENTS;
  const taxableAmountCents = subtotalCents - discountCents;
  const taxCents = Math.round((taxableAmountCents + shippingCents) * FAKE_TAX_RATE);
  const totalCents = subtotalCents - discountCents + shippingCents + taxCents;

  await expect(page.getByText(money(subtotalCents), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`-${money(discountCents)}`, { exact: true })).toBeVisible();
  await expect(page.getByText(money(totalCents), { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await expect(page).toHaveURL(/fake-paypal-approval/);
  await page.getByRole("link", { name: "Approve Payment (test)" }).click();
  await expect(page).toHaveURL(/checkout\/return/);
  await expect(page.getByRole("heading", { name: "Thank you for your order!" })).toBeVisible();

  const paypalOrderId = new URL(page.url()).searchParams.get("token");
  expect(paypalOrderId).toBeTruthy();

  // The order is placed but not yet paid — only a verified webhook can
  // do that (FR-012). Simulate PayPal's async webhook arriving,
  // deliberately after the redirect above (a "delayed webhook" is
  // exactly this shape — it just resolves once it arrives, FR-015).
  const webhookBody = {
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: { supplementary_data: { related_ids: { order_id: paypalOrderId } } },
  };
  const webhookResponse = await request.post("/api/webhooks/paypal", { data: webhookBody });
  expect(webhookResponse.ok()).toBe(true);

  await page.goto(`/checkout/return?token=${paypalOrderId}`);
  await expect(page.getByRole("heading", { name: "Payment confirmed!" })).toBeVisible();

  // Idempotency: a repeated webhook delivery for an already-paid order
  // is a no-op, not an error (FR-015).
  const secondWebhookResponse = await request.post("/api/webhooks/paypal", { data: webhookBody });
  expect(secondWebhookResponse.ok()).toBe(true);
});

test("checkout blocks proceeding with an empty cart", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText(/cart is empty/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Review order" })).toHaveCount(0);
});

test("an invalid promo code is rejected with a specific reason, total unaffected", async ({ page }) => {
  await signInAsAdmin(page);

  const categoryName = `E2E Invalid Promo Category ${Date.now()}`;
  const productName = `E2E Invalid Promo Product ${Date.now()}`;
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(productName);
  await page.getByLabel("Base price (USD)").fill("15.00");
  // A product needs a category to appear on the storefront's Browse
  // view at all (feature 2 groups strictly by category) — without
  // one, this product would be invisible on "/" and this test would
  // never find it to click into.
  await page.getByPlaceholder("Add a new category").fill(categoryName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("select#category")).toHaveValue(/\d+/);
  await page.getByLabel("Active", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.locator("tr", { hasText: productName })).toBeVisible({ timeout: 10_000 });

  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(productName) }).click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/checkout");
  await page.getByLabel("Email").fill("buyer2@example.com");
  await page.getByLabel("Full name").fill("Jane Buyer");
  await page.getByLabel("Street address").fill("123 Main St");
  await page.getByLabel("City").fill("Cleveland");
  await page.getByLabel("State").fill("OH");
  await page.getByLabel("ZIP").fill("44101");
  await page.getByLabel("Promo code").fill("THIS-CODE-DOES-NOT-EXIST");
  await page.getByRole("button", { name: "Review order" }).click();

  await expect(page.getByText("That promo code doesn't exist.")).toBeVisible();
  await expect(page.getByText("Order summary")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay with PayPal" })).toHaveCount(0);
});
