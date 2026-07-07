import { createProduct, getCategories } from "../actions";
import { ProductEditor } from "../product-editor";

export default async function NewProductPage() {
  const categoriesResult = await getCategories();
  const categories = categoriesResult.ok ? categoriesResult.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">New product</h1>
      <ProductEditor
        categories={categories}
        onSubmit={createProduct}
        afterSubmitHref="/admin/products"
      />
    </div>
  );
}
