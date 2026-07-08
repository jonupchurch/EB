import Link from "next/link";
import { getProducts } from "./actions";
import { DeleteButton } from "./delete-button";
import { DuplicateButton } from "./duplicate-button";
import { SearchBox } from "./search-box";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const search = q ?? "";
  const page = Math.max(1, Number(pageParam) || 1);

  const result = await getProducts({ page, search });
  const { items: products, totalPages, totalCount } = result.ok
    ? result.data
    : { items: [], totalPages: 1, totalCount: 0 };

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(targetPage));
    return `/admin/products?${params}`;
  }

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

      <div className="mb-4">
        <SearchBox initialQuery={search} />
      </div>

      {products.length === 0 ? (
        <p className="text-muted">
          {search ? (
            `No products match "${search}".`
          ) : (
            <>
              No products yet.{" "}
              <Link href="/admin/products/new" className="text-teal underline">
                Create your first product
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-cream-deeper text-muted">
                <th className="py-2 pr-4 font-medium">
                  <span className="sr-only">Photo</span>
                </th>
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
                    {product.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.thumbnailUrl}
                        alt=""
                        className="h-10 w-10 rounded border border-cream-deeper object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded border border-cream-deeper bg-cream-deep" />
                    )}
                  </td>
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
                    <div className="flex gap-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-sm font-medium text-teal"
                      >
                        Edit
                      </Link>
                      <DuplicateButton productId={product.id} />
                      <DeleteButton productId={product.id} productName={product.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-muted">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-3">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className="font-medium text-teal">
                    ← Previous
                  </Link>
                ) : (
                  <span className="text-muted opacity-50">← Previous</span>
                )}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className="font-medium text-teal">
                    Next →
                  </Link>
                ) : (
                  <span className="text-muted opacity-50">Next →</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
