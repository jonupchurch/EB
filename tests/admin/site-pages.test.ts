import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../src/db";
import { sitePages } from "../../src/db/schema";
import { getSitePageContent, saveSitePageRow, sanitizeBodyHtml } from "../../src/lib/admin/site-pages";

describe("sanitizeBodyHtml", () => {
  it("strips a <script> tag entirely (FR-005)", () => {
    const result = sanitizeBodyHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Hello</p>");
  });

  it("strips an onerror event handler attribute", () => {
    const result = sanitizeBodyHtml('<p>Text</p><img src="x" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("<img");
  });

  it("neutralizes a javascript: URL in a link href", () => {
    const result = sanitizeBodyHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("keeps every tag in the allowlist intact", () => {
    const input =
      "<h1>Title</h1><h2>Sub</h2><h3>SubSub</h3><p>Para <strong>bold</strong> <em>italic</em></p>" +
      '<ul><li>one</li></ul><ol><li>two</li></ol><a href="https://example.com">link</a>';
    const result = sanitizeBodyHtml(input);
    for (const tag of ["h1", "h2", "h3", "p", "strong", "em", "ul", "li", "ol", "a"]) {
      expect(result).toContain(`<${tag}`);
    }
  });

  it("forces rel and target onto a link, without dropping its href", () => {
    const result = sanitizeBodyHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });
});

describe("getSitePageContent", () => {
  const insertedSlugs: ("privacy" | "terms" | "about")[] = [];

  afterEach(async () => {
    for (const slug of insertedSlugs.splice(0)) {
      await db.delete(sitePages).where(eq(sitePages.slug, slug));
    }
  });

  it("returns the code-level default with isDefault: true when no row exists yet (FR-006)", async () => {
    await db.delete(sitePages).where(eq(sitePages.slug, "about"));
    const result = await getSitePageContent("about");
    expect(result.isDefault).toBe(true);
    expect(result.title).toBe("About Us");
    expect(result.bodyHtml).toContain("Content coming soon.");
  });

  it("returns the saved row with isDefault: false once one exists", async () => {
    await saveSitePageRow("about", "Custom About", "<p>Real content.</p>");
    insertedSlugs.push("about");

    const result = await getSitePageContent("about");
    expect(result.isDefault).toBe(false);
    expect(result.title).toBe("Custom About");
    expect(result.bodyHtml).toContain("Real content.");
  });

  it("sanitizes before storage, so an unsafe save never reaches the database unsanitized", async () => {
    await saveSitePageRow("about", "Unsafe", '<p>ok</p><script>alert(1)</script>');
    insertedSlugs.push("about");

    const row = await db.query.sitePages.findFirst({ where: (f, { eq }) => eq(f.slug, "about") });
    expect(row?.bodyHtml).not.toContain("<script");
  });
});
