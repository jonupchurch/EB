import Link from "next/link";
import { getProducts } from "./actions";
import { DuplicateButton } from "./duplicate-button";

export default async function ProductsPage() {
  const result = await getProducts();
  const products = result.ok ? result.data : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded bg-teal px-4 py-2 text-sm font-medium text-white"
        >
          + New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-muted">
          No products yet.{" "}
          <Link href="/admin/products/new" className="text-teal underline">
            Create your first product
          </Link>
          .
        </p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cream-deeper text-muted">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Category</th>
              <th className="py-2 pr-4 font-medium">Variants</th>
              <th className="py-2 pr-4 font-medium">Starting price</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-cream-deeper">
                <td className="py-2 pr-4">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {product.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-ink">{product.categoryName ?? "—"}</td>
                <td className="py-2 pr-4 text-ink">{product.variantCount}</td>
                <td className="py-2 pr-4 text-ink">
                  ${(product.basePriceCents / 100).toFixed(2)}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={
                      product.status === "active"
                        ? "rounded bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal"
                        : "rounded bg-cream-deeper px-2 py-0.5 text-xs font-medium text-muted"
                    }
                  >
                    {product.status === "active" ? "Active" : "Draft"}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <DuplicateButton productId={product.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
