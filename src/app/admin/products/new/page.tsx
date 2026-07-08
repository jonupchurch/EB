import { getCategories } from "../../categories/actions";
import { getMaterialCatalog } from "../../materials/actions";
import { getStylingCatalog } from "../../styling/actions";
import { createProduct } from "../actions";
import { ProductEditor } from "../product-editor";

export default async function NewProductPage() {
  const [categoriesResult, stylingResult, materialResult] = await Promise.all([
    getCategories(),
    getStylingCatalog(),
    getMaterialCatalog(),
  ]);
  const categories = categoriesResult.ok ? categoriesResult.data : [];
  const stylingCatalog = stylingResult.ok ? stylingResult.data : [];
  const materialCatalog = materialResult.ok ? materialResult.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">New product</h1>
      <ProductEditor
        categories={categories}
        stylingCatalog={stylingCatalog}
        materialCatalog={materialCatalog}
        onSubmit={createProduct}
        afterSubmitHref="/admin/products"
      />
    </div>
  );
}
