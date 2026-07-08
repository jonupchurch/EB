"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateTotalCents } from "@/lib/pricing";
import type { ActiveProductDetail } from "@/lib/catalog/queries";
import { addToCart } from "../../cart/actions";

function formatAdjustment(cents: number): string | null {
  if (cents === 0) return null;
  const sign = cents > 0 ? "+" : "-";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Every option category is single-select except Design Location, which
// feature 1's data model explicitly allows zero, one, or many of per
// product (a design can be placed in several locations at once).
type SingleSelectCategoryKey =
  | "processingOptions"
  | "stylingOptions"
  | "materialOptions"
  | "sizeOptions"
  | "colorOptions";

const SINGLE_SELECT_CATEGORY_LABELS: Record<SingleSelectCategoryKey, string> = {
  processingOptions: "Processing",
  stylingOptions: "Styling",
  materialOptions: "Material",
  sizeOptions: "Size",
  colorOptions: "Color",
};

const SINGLE_SELECT_CATEGORY_ORDER: SingleSelectCategoryKey[] = [
  "sizeOptions",
  "colorOptions",
  "materialOptions",
  "stylingOptions",
  "processingOptions",
];

export function ProductDetail({ product }: { product: ActiveProductDetail }) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<SingleSelectCategoryKey, number | null>>({
    processingOptions: null,
    stylingOptions: null,
    materialOptions: null,
    sizeOptions: null,
    colorOptions: null,
  });
  const [designLocationIds, setDesignLocationIds] = useState<number[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  function toggleSelection(category: SingleSelectCategoryKey, optionId: number) {
    setSelections((prev) => ({
      ...prev,
      [category]: prev[category] === optionId ? null : optionId,
    }));
    setAdded(false);
  }

  function toggleDesignLocation(optionId: number) {
    setDesignLocationIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    );
    setAdded(false);
  }

  const totalCents = useMemo(() => {
    const singleSelectOptions = SINGLE_SELECT_CATEGORY_ORDER.flatMap((category) => {
      const selectedId = selections[category];
      if (selectedId === null) return [];
      const option = product[category].find((o) => o.id === selectedId);
      return option ? [{ priceAdjustmentCents: option.priceAdjustmentCents }] : [];
    });
    const designLocationOptions = product.designLocationOptions
      .filter((o) => designLocationIds.includes(o.id))
      .map((o) => ({ priceAdjustmentCents: o.priceAdjustmentCents }));
    return calculateTotalCents(product.basePriceCents, [
      ...singleSelectOptions,
      ...designLocationOptions,
    ]);
  }, [product, selections, designLocationIds]);

  async function handleAddToCart() {
    setAdding(true);
    setAddError(null);
    setAdded(false);
    try {
      const result = await addToCart({
        productId: product.id,
        processingOptionId: selections.processingOptions ?? undefined,
        stylingOptionId: selections.stylingOptions ?? undefined,
        materialOptionId: selections.materialOptions ?? undefined,
        sizeOptionId: selections.sizeOptions ?? undefined,
        colorOptionId: selections.colorOptions ?? undefined,
        designLocationOptionIds: designLocationIds,
        quantity,
      });
      if (result.ok) {
        setAdded(true);
        router.refresh();
      } else {
        setAddError(result.fieldErrors?._root ?? "Could not add this item to your cart.");
      }
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Could not add this item to your cart.");
    } finally {
      setAdding(false);
    }
  }

  const images = product.images.length > 0 ? product.images : null;
  const activeImage = images?.[activeImageIndex] ?? images?.[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded border border-cream-deeper bg-cream-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage?.url ?? "/assets/product-placeholder.svg"}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {images && images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`Show photo ${index + 1} of ${images.length}`}
                  aria-pressed={index === activeImageIndex}
                  className={
                    index === activeImageIndex
                      ? "h-16 w-16 overflow-hidden rounded border-2 border-teal"
                      : "h-16 w-16 overflow-hidden rounded border border-cream-deeper"
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-ink">{product.name}</h1>
          {product.description && (
            <p className="mt-3 whitespace-pre-line text-muted">{product.description}</p>
          )}

          <div className="mt-6 flex flex-col gap-6">
            {SINGLE_SELECT_CATEGORY_ORDER.filter((category) => product[category].length > 0).map(
              (category) => (
                <fieldset key={category}>
                  <legend className="text-sm font-semibold text-ink">
                    {SINGLE_SELECT_CATEGORY_LABELS[category]}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product[category].map((option) => {
                      const selected = selections[category] === option.id;
                      const adjustment = formatAdjustment(option.priceAdjustmentCents);
                      const swatchHex =
                        category === "colorOptions" && "swatchHex" in option
                          ? option.swatchHex
                          : null;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleSelection(category, option.id)}
                          className={
                            selected
                              ? "flex items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-sm font-medium text-white"
                              : "flex items-center gap-1.5 rounded-full bg-cream-deep px-3 py-1.5 text-sm font-medium text-ink hover:bg-cream-deeper"
                          }
                        >
                          {swatchHex && (
                            <span
                              className="h-3 w-3 rounded-full border border-cream-deeper"
                              style={{ backgroundColor: swatchHex }}
                              aria-hidden="true"
                            />
                          )}
                          {option.label}
                          {adjustment && <span className="opacity-80"> {adjustment}</span>}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ),
            )}

            {product.designLocationOptions.length > 0 && (
              <fieldset>
                <legend className="text-sm font-semibold text-ink">
                  Design Location <span className="font-normal text-muted">(choose any)</span>
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.designLocationOptions.map((option) => {
                    const selected = designLocationIds.includes(option.id);
                    const adjustment = formatAdjustment(option.priceAdjustmentCents);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleDesignLocation(option.id)}
                        className={
                          selected
                            ? "flex items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-sm font-medium text-white"
                            : "flex items-center gap-1.5 rounded-full bg-cream-deep px-3 py-1.5 text-sm font-medium text-ink hover:bg-cream-deeper"
                        }
                      >
                        {option.label}
                        {adjustment && <span className="opacity-80"> {adjustment}</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>

          <div className="mt-8 border-t border-cream-deeper pt-6">
            <p className="text-sm text-muted">Your price</p>
            <p className="text-3xl font-bold text-ink">{formatPrice(totalCents)}</p>

            <div className="mt-4 flex items-center gap-3">
              <label htmlFor="quantity" className="text-sm font-medium text-ink">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-20 rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
              />
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding}
              className="mt-4 w-full rounded bg-teal px-6 py-3 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
            >
              {adding ? "Adding…" : "Add to Cart"}
            </button>
            {added && <p className="mt-2 text-sm text-teal">Added to your cart.</p>}
            {addError && <p className="mt-2 text-sm text-red-700">{addError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
