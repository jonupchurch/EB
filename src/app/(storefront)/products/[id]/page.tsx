import { notFound } from "next/navigation";
import { getActiveProduct } from "@/lib/catalog/queries";
import { ProductDetail } from "./product-detail";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  // A non-numeric id can never match a row — treat it the same as
  // "not found" rather than letting an invalid query reach the DB
  // (FR-009: nonexistent and Draft ids are indistinguishable).
  const result = Number.isInteger(productId)
    ? await getActiveProduct(productId)
    : ({ ok: false, error: "not_found" } as const);

  if (!result.ok) {
    notFound();
  }

  return <ProductDetail product={result.data} />;
}
