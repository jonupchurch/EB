import { getMaterialCatalogWithUsageCounts } from "./actions";
import { MaterialsManager } from "./materials-manager";

export default async function MaterialsPage() {
  const result = await getMaterialCatalogWithUsageCounts();
  const entries = result.ok ? result.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Material options</h1>
      <MaterialsManager initial={entries} />
    </div>
  );
}
