// Shared read/write logic for the three fixed content pages (feature
// 6), kept separate from the admin Server Action (which depends on
// next/headers via requireAdminSession, so isn't directly
// unit-testable itself, and can't be called by the public storefront
// pages, which have no admin session) — mirrors shop-settings.ts
// (feature 5) and order-status.ts/promotion-crud.ts before it.

import sanitizeHtml from "sanitize-html";
import { db } from "@/db";
import { sitePages } from "@/db/schema";

export type SitePageSlug = "privacy" | "terms" | "about";

export interface SitePageContent {
  title: string;
  bodyHtml: string;
  isDefault: boolean;
}

// Only the markup Tiptap's starter kit (restricted to headings,
// paragraphs, bold/italic, lists, links per research.md) ever
// produces — anything else is stripped, not trusted (FR-005).
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["h1", "h2", "h3", "p", "strong", "em", "b", "i", "ul", "ol", "li", "a"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

export function sanitizeBodyHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

// Faithfully converted from Resources/shared/privacy.md and
// Resources/shared/"terms and condition.md" — still the known
// placeholder content drafted for a different (unrelated) business,
// per status.md's 2026-07-07 entry. This feature makes it editable so
// the owner can rewrite it herself; it does not rewrite it.
const DEFAULT_CONTENT: Record<SitePageSlug, { title: string; bodyHtml: string }> = {
  privacy: {
    title: "Privacy & Website Policy",
    bodyHtml: `
      <p>Welcome to Erica Burns Things. This page outlines the rules and regulations for the use of the Erica Burns Things website, located at ericaburnsthings.com.</p>
      <h2>1. Cookies &amp; Data Tracking</h2>
      <p>The website uses cookies to help personalize your online experience. By accessing Erica Burns Things, you agreed to use the required cookies. A cookie is a text file that is placed on your hard disk by a web page server. We may use cookies to collect, store, and track information for statistical or marketing purposes to operate our website and serve relevant advertisements (such as Meta/Facebook Ads). You have the ability to accept or decline optional cookies through your browser settings.</p>
      <h2>2. License &amp; Intellectual Property</h2>
      <p>Unless otherwise stated, Erica Burns Things and/or its licensors own the intellectual property rights for all material on this website (excluding the final commissioned artworks delivered to clients, which are governed by our separate Commission Terms). All intellectual property rights are reserved. You must not:</p>
      <ul>
        <li>Copy or republish material from Erica Burns Things.</li>
        <li>Sell, rent, or sub-license material from Erica Burns Things.</li>
        <li>Reproduce, duplicate, or scrape content, images, or code from Erica Burns Things.</li>
      </ul>
      <h2>3. Hyperlinking to Our Content</h2>
      <p>Approved organizations, search engines, and news outlets may hyperlink to our website as long as the link: (a) is not in any way deceptive; (b) does not falsely imply sponsorship, endorsement, or approval of the linking party; and (c) fits within the context of the linking party's site. No use of the Erica Burns Things logo or artwork will be allowed for linking absent a trademark license agreement.</p>
      <h2>4. Disclaimer of Website Warranties</h2>
      <p>To the maximum extent permitted by applicable law, we exclude all representations, warranties, and conditions relating to our website and the use of this website. We do not ensure that the information on this website is entirely correct, nor do we promise to ensure that the website remains indefinitely available.</p>
    `.trim(),
  },
  terms: {
    title: "Terms and Conditions",
    bodyHtml: `
      <h2>The TL;DR (Our Gentlemen's Agreement)</h2>
      <ul>
        <li><strong>No Refunds:</strong> Because every masterpiece is uniquely crafted for your pet, all sales are final once studio work begins.</li>
        <li><strong>One Round of Minor Polish:</strong> We include one phase of minor revisions. Complete conceptual rewrites require a new commission.</li>
        <li><strong>You Own the Print, We Own the Rights:</strong> You can hang it, frame it, and post it. You cannot resell it or use it for commercial branding. We may feature your epic pet in our portfolio.</li>
        <li><strong>Physical Delivery:</strong> If you ordered a canvas, we print and ship from Ohio. If it arrives damaged, we replace it.</li>
      </ul>
      <h2>Full Legal Terms of Service</h2>
      <p>Welcome to Erica Burns Things. By commissioning an artwork or purchasing a product from us, you agree to the following comprehensive terms and conditions, designed to protect the integrity of our studio and the quality of your bespoke piece.</p>
      <h3>1. The Bespoke Nature of Our Art &amp; Refund Policy</h3>
      <p>Every piece we create is a custom, 1-of-1 digital commission. We utilize advanced digital artistry, studio-grade rendering techniques, and manual post-production to forge your pet's cinematic likeness. Because this is a highly personalized service requiring significant, unrecoverable studio time and computational resources, all sales are strictly final. Once payment is processed and our Art Directors begin the rendering phase, we do not offer refunds, cancellations, or exchanges under any circumstances.</p>
      <h3>2. Artistic Vision &amp; The Revision Process</h3>
      <p>You are commissioning Erica Burns Things for our specific cinematic aesthetic. While we adhere to your chosen "universe" (e.g., Cyberpunk, Renaissance) and reference photos, the final creative interpretation — including lighting, composition, and wardrobe specifics — remains at the sole discretion of our Art Directors.</p>
      <ul>
        <li><strong>Included Revisions:</strong> Each commission includes one (1) round of minor revisions (e.g., eye color adjustments, slight fur tinting).</li>
        <li><strong>Excluded Revisions:</strong> Requests for a complete conceptual overhaul (e.g., changing from "Mafia Don" to "Astronaut" after delivery) or major structural changes are not covered and will require a new, separate commission at full price.</li>
      </ul>
      <h3>3. Source Material Requirements</h3>
      <p>The quality of our final masterpiece relies entirely on the reference photo provided by you. We require a clear, well-lit, unobstructed view of your pet's face. If the provided photo is inadequate, we will pause your commission and request a new one. Erica Burns Things cannot be held liable for a perceived lack of likeness if the source material provided was blurry, heavily filtered, or insufficient.</p>
      <h3>4. Copyright, Licensing, and Usage Rights</h3>
      <ul>
        <li><strong>Client Rights:</strong> Upon final delivery, you are granted a worldwide, non-exclusive, perpetual, personal-use license. You may print the artwork, display it in your home, and share it on personal social media accounts. You may not mint the artwork as an NFT, resell it, or use it for commercial branding, merchandise sales, or business logos without purchasing a separate Commercial License from us.</li>
        <li><strong>Studio Rights:</strong> Erica Burns Things retains the overarching copyright to the generated digital artwork. We reserve the right to use the final masterpiece, alongside your original reference photo, on our website, social media, and marketing materials as part of our studio portfolio. If you require absolute privacy, a Non-Disclosure Agreement (NDA) must be requested and signed prior to purchase.</li>
      </ul>
      <h3>5. Physical Products, Shipping, and Damages</h3>
      <p>For clients purchasing physical canvas prints alongside the digital artwork:</p>
      <ul>
        <li><strong>Fulfillment:</strong> Physical products are printed and fulfilled through our specialized facilities in Ohio, USA.</li>
        <li><strong>Transit Times:</strong> Estimated shipping times are provided at checkout but are not guaranteed due to third-party carrier variables.</li>
        <li><strong>Damaged Goods:</strong> If your canvas arrives damaged due to shipping, you must contact us at ericaburnsthings@gmail.com within 48 hours of delivery, including clear photographs of the damage and the packaging. We will expedite a replacement canvas at no additional cost. We do not offer refunds for items damaged in transit, only replacements.</li>
      </ul>
      <h3>6. Turnaround Time &amp; Availability</h3>
      <p>To maintain museum-grade quality, our studio limits the number of commissions accepted per month. Turnaround times (typically 3 to 7 business days for digital delivery) are estimates. We prioritize artistic perfection over speed.</p>
      <h3>7. Governing Law and Dispute Resolution</h3>
      <p>These terms and conditions are governed by and construed in accordance with the laws of the State of Ohio, United States, without regard to its conflict of law provisions. Any legal action or dispute arising from these terms shall be resolved exclusively in the state or federal courts located in Ohio. By purchasing, you waive any right to a trial by jury or to participate in a class-action lawsuit against Erica Burns Things.</p>
    `.trim(),
  },
  about: {
    title: "About Us",
    bodyHtml: `<p>Content coming soon.</p>`,
  },
};

export async function getSitePageContent(slug: SitePageSlug): Promise<SitePageContent> {
  const row = await db.query.sitePages.findFirst({
    where: (fields, { eq }) => eq(fields.slug, slug),
  });
  if (row) {
    return { title: row.title, bodyHtml: row.bodyHtml, isDefault: false };
  }
  return { ...DEFAULT_CONTENT[slug], isDefault: true };
}

export async function saveSitePageRow(
  slug: SitePageSlug,
  title: string,
  bodyHtml: string,
): Promise<void> {
  const sanitized = sanitizeBodyHtml(bodyHtml);
  await db
    .insert(sitePages)
    .values({ slug, title, bodyHtml: sanitized })
    .onConflictDoUpdate({
      target: sitePages.slug,
      set: { title, bodyHtml: sanitized, updatedAt: new Date() },
    });
}
