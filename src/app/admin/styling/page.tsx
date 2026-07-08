import { getStylingCatalogWithUsageCounts } from "./actions";
import { StylingManager } from "./styling-manager";

export default async function StylingPage() {
  const result = await getStylingCatalogWithUsageCounts();
  const entries = result.ok ? result.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Styling options</h1>
      <StylingManager initial={entries} />
    </div>
  );
}
