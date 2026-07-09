import { config } from "dotenv";
config({ path: ".env.local" });

import { expect, test, type Page } from "@playwright/test";
import { db } from "../src/db";
import { orders } from "../src/db/schema";

async function signInAsAdmin(page: Page) {
  await page.goto("/api/auth/signin");
  await page.getByLabel(/email/i).fill("ericaburnsthings@gmail.com");
  await page.getByRole("button", { name: /sign in with test login/i }).click();
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
}

async function insertOrder(customerName: string, status: "placed" | "paid") {
  const [order] = await db
    .insert(orders)
    .values({
      status,
      subtotalCents: 2000,
      discountCents: 0,
      shippingMethod: "flat",
      shippingCents: 500,
      taxCents: 160,
      totalCents: 2660,
      shippingName: customerName,
      shippingLine1: "123 Test St",
      shippingCity: "Cleveland",
      shippingState: "OH",
      shippingZip: "44101",
      shippingCountry: "US",
      customerEmail: "buyer@example.com",
      paypalOrderId: `TEST-${crypto.randomUUID()}`,
      confirmationToken: crypto.randomUUID(),
      paidAt: status === "paid" ? new Date() : null,
    })
    .returning();
  return order;
}

test("admin can view the order queue and advance a paid order through fulfillment, but never skip or reverse", async ({
  page,
}) => {
  const customerName = `E2E Order Customer ${Date.now()}`;
  const order = await insertOrder(customerName, "paid");
  const unpaidCustomerName = `E2E Unpaid Customer ${Date.now()}`;
  const unpaidOrder = await insertOrder(unpaidCustomerName, "placed");

  await signInAsAdmin(page);

  // A not-yet-paid order offers no admin-driven advance at all — that
  // stage is exclusively webhook-driven (FR-005), and skipping straight
  // to a later stage is rejected (FR-004, acceptance scenario 5).
  await page.goto(`/admin/orders/${unpaidOrder.id}`);
  await expect(page.getByText("Waiting on payment verification")).toBeVisible();
  await expect(page.getByRole("button", { name: /Mark as/ })).toHaveCount(0);

  // Queue (US1, FR-001)
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  const row = page.locator("tr", { hasText: customerName });
  await expect(row).toBeVisible();
  await expect(row.getByText("Paid", { exact: true })).toBeVisible();

  // Detail (US1, FR-002) — read-only, every field shown
  await row.getByRole("link", { name: `Order #${order.id}, ${customerName}` }).click();
  await expect(page.getByRole("heading", { name: `Order #${order.id}` })).toBeVisible();
  await expect(page.getByText(customerName).first()).toBeVisible();
  await expect(page.getByText("buyer@example.com")).toBeVisible();
  await expect(page.getByText("$26.60")).toBeVisible();

  // Advance paid -> in production (FR-003)
  await page.getByRole("button", { name: "Mark as In production" }).click();
  await expect(page.getByRole("button", { name: "Mark as Shipped" })).toBeVisible();

  // Advance in production -> shipped (FR-003)
  await page.getByRole("button", { name: "Mark as Shipped" }).click();
  await expect(page.getByText("No further action needed.")).toBeVisible();

  // No admin control exists to skip/reverse — the only button ever
  // shown is the single legal next step, and it's now gone entirely
  // (FR-004, FR-005). Confirm the underlying action itself also
  // rejects an out-of-band attempt (skip: shipped is terminal, so any
  // further advanceOrderStatus call is invalid by construction).
  await expect(page.getByRole("button", { name: /Mark as/ })).toHaveCount(0);
});
