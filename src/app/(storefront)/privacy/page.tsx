import { getSitePageContent } from "@/lib/admin/site-pages";

// Renders admin-editable content — safe via dangerouslySetInnerHTML
// only because saveSitePageRow() (src/lib/admin/site-pages.ts)
// already sanitized it server-side before storage (docs/adr/0017).
export default async function PrivacyPage() {
  const { title, bodyHtml } = await getSitePageContent("privacy");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <div className="rich-content mt-6" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </div>
  );
}
