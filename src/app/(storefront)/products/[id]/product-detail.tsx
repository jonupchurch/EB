"use client";

import { useMemo, useState } from "react";
import { calculateTotalCents } from "@/lib/pricing";
import type { ActiveProductDetail } from "@/lib/catalog/queries";

function formatAdjustment(cents: number): string | null {
  if (cents === 0) return null;
  const sign = cents > 0 ? "+" : "-";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

type OptionCategoryKey =
  | "processingOptions"
  | "stylingOptions"
  | "materialOptions"
  | "sizeOptions"
  | "colorOptions"
  | "designLocationOptions";

const CATEGORY_LABELS: Record<OptionCategoryKey, string> = {
  processingOptions: "Processing",
  stylingOptions: "Styling",
  materialOptions: "Material",
  sizeOptions: "Size",
  colorOptions: "Color",
  designLocationOptions: "Design Location",
};

const CATEGORY_ORDER: OptionCategoryKey[] = [
  "sizeOptions",
  "colorOptions",
  "materialOptions",
  "stylingOptions",
  "designLocationOptions",
  "processingOptions",
];

export function ProductDetail({ product }: { product: ActiveProductDetail }) {
  const [selections, setSelections] = useState<Record<OptionCategoryKey, number | null>>({
    processingOptions: null,
    stylingOptions: null,
    materialOptions: null,
    sizeOptions: null,
    colorOptions: null,
    designLocationOptions: null,
  });
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  function toggleSelection(category: OptionCategoryKey, optionId: number) {
    setSelections((prev) => ({
      ...prev,
      [category]: prev[category] === optionId ? null : optionId,
    }));
  }

  const totalCents = useMemo(() => {
    const selectedOptions = CATEGORY_ORDER.flatMap((category) => {
      const selectedId = selections[category];
      if (selectedId === null) return [];
      const option = product[category].find((o) => o.id === selectedId);
      return option ? [{ priceAdjustmentCents: option.priceAdjustmentCents }] : [];
    });
    return calculateTotalCents(product.basePriceCents, selectedOptions);
  }, [product, selections]);

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
            {CATEGORY_ORDER.filter((category) => product[category].length > 0).map(
              (category) => (
                <fieldset key={category}>
                  <legend className="text-sm font-semibold text-ink">
                    {CATEGORY_LABELS[category]}
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
          </div>

          <div className="mt-8 border-t border-cream-deeper pt-6">
            <p className="text-sm text-muted">Your price</p>
            <p className="text-3xl font-bold text-ink">{formatPrice(totalCents)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
