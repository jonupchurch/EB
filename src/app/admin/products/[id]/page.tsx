import { notFound } from "next/navigation";
import { getCategories, getProduct, updateProduct } from "../actions";
import { ProductEditor } from "../product-editor";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  const [productResult, categoriesResult] = await Promise.all([
    getProduct(productId),
    getCategories(),
  ]);

  if (!productResult.ok) {
    notFound();
  }

  const product = productResult.data;
  const categories = categoriesResult.ok ? categoriesResult.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Edit product</h1>
      <ProductEditor
        categories={categories}
        productId={productId}
        initial={{
          name: product.name,
          description: product.description,
          basePriceCents: product.basePriceCents,
          categoryId: product.categoryId,
          status: product.status,
          weightOz: product.weightOz,
          lengthIn: product.lengthIn,
          widthIn: product.widthIn,
          heightIn: product.heightIn,
          processingOptions: product.processingOptions,
          stylingOptions: product.stylingOptions,
          materialOptions: product.materialOptions,
          sizeOptions: product.sizeOptions,
          colorOptions: product.colorOptions,
          designLocationOptions: product.designLocationOptions,
          images: product.images,
        }}
        onSubmit={updateProduct.bind(null, productId)}
        afterSubmitHref="/admin/products"
      />
    </div>
  );
}
