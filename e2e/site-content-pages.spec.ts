import { config } from "dotenv";
config({ path: ".env.local" });

import { expect, test, type Page } from "@playwright/test";
import { db } from "../src/db";
import { sitePages } from "../src/db/schema";

async function signInAsAdmin(page: Page) {
  await page.goto("/api/auth/signin");
  await page.getByLabel(/email/i).fill("ericaburnsthings@gmail.com");
  await page.getByRole("button", { name: /sign in with test login/i }).click();
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
}

// Serial, not parallel: unlike every other e2e file in this project,
// these tests share genuinely fixed, non-unique state (exactly three
// content-page slugs, never a fresh per-test entity) — the "still on
// its default" assertion below would otherwise race against the edit
// test's write to the same "about" row.
test.describe.configure({ mode: "serial" });

// This file relies on the fixed slugs starting from their code-level
// defaults (no admin override yet) — reset any override left behind
// by an earlier run so the suite is idempotent/re-runnable.
test.beforeAll(async () => {
  await db.delete(sitePages);
});

test("footer links to all three pages, each showing real content before any admin edit", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms of Use" })).toBeVisible();
  await expect(page.getByRole("link", { name: "About Us" })).toBeVisible();

  await page.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "Privacy & Website Policy" })).toBeVisible();
  await expect(page.getByText(/Cookies/)).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Terms of Use" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "Terms and Conditions" })).toBeVisible();
  await expect(page.getByText(/No Refunds/)).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "About Us" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "About Us" })).toBeVisible();
  await expect(page.getByText("Content coming soon.")).toBeVisible();
});

test("unauthenticated access to the content editor redirects to sign-in", async ({ page }) => {
  await page.goto("/admin/content");
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
});

test("admin can edit a page's content and the public page reflects it immediately", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/content");
  await expect(page.getByRole("heading", { name: "Content" })).toBeVisible();

  const newTitle = `About Us ${Date.now()}`;
  await page.getByRole("tab", { name: "About" }).click();
  await page.getByLabel("Title").fill(newTitle);

  const editor = page.getByRole("textbox", { name: "Body" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.type("Real content, finally.");
  await page.keyboard.press("ControlOrMeta+A");
  await page.getByRole("button", { name: "Bold" }).click();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/about");
  await expect(page.getByRole("heading", { name: newTitle })).toBeVisible();
  await expect(page.locator(".rich-content strong")).toContainText("Real content, finally.");
});
