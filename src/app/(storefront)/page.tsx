import Link from "next/link";
import { getActiveCategories, getActiveProductsByCategory } from "@/lib/catalog/queries";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function categoryHref(categoryId?: number): string {
  return categoryId === undefined ? "/" : `/?category=${categoryId}`;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categoryParam } = await searchParams;
  const selectedCategoryId = categoryParam ? Number(categoryParam) : undefined;

  const categories = await getActiveCategories();
  const visibleCategories =
    selectedCategoryId !== undefined
      ? categories.filter((category) => category.id === selectedCategoryId)
      : categories;

  const productsByCategory = await Promise.all(
    visibleCategories.map(async (category) => ({
      category,
      products: await getActiveProductsByCategory(category.id),
    })),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold text-ink">Shop</h1>
      <p className="mt-2 text-muted">Custom-printed goods, made to order.</p>

      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/"
            className={
              selectedCategoryId === undefined
                ? "rounded-full bg-teal px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full bg-cream-deep px-4 py-1.5 text-sm font-medium text-ink hover:bg-cream-deeper"
            }
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={categoryHref(category.id)}
              className={
                selectedCategoryId === category.id
                  ? "rounded-full bg-teal px-4 py-1.5 text-sm font-medium text-white"
                  : "rounded-full bg-cream-deep px-4 py-1.5 text-sm font-medium text-ink hover:bg-cream-deeper"
              }
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {productsByCategory.length === 0 ? (
        <p className="mt-10 text-muted">Nothing here yet — check back soon.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-12">
          {productsByCategory.map(({ category, products }) => (
            <section key={category.id}>
              <h2 className="text-xl font-semibold text-ink">{category.name}</h2>
              <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group flex flex-col"
                  >
                    <div className="aspect-square overflow-hidden rounded border border-cream-deeper bg-cream-deep">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.primaryImageUrl ?? "/assets/product-placeholder.svg"}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink">{product.name}</p>
                    <p className="text-sm text-muted">
                      Starting at {formatPrice(product.basePriceCents)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
