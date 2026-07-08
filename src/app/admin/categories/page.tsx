import { getCategoriesWithProductCounts } from "./actions";
import { CategoriesManager } from "./categories-manager";

export default async function CategoriesPage() {
  const result = await getCategoriesWithProductCounts();
  const categories = result.ok ? result.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Categories</h1>
      <CategoriesManager initial={categories} />
    </div>
  );
}
