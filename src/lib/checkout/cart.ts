// Resolves the cart cookie's references against current canonical data
// on every read — recomputes each line's price via src/lib/pricing.ts
// (feature 1) and flags/excludes any line whose product or a selected
// option is no longer Active or no longer exists (FR-003, FR-004).
// The cart itself is never a source of truth for price.

import { calculateTotalCents } from "@/lib/pricing";
import { getActiveProduct, type ActiveProductDetail } from "@/lib/catalog/queries";
import { readCart, type CartLineReference } from "./cart-cookie";

export interface SelectedOptionSummary {
  category: string;
  label: string;
  priceAdjustmentCents: number;
}

export interface ResolvedCartLine {
  productId: number;
  name: string;
  selectedOptions: SelectedOptionSummary[];
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  unavailable: boolean;
  // Packaged shipping info, carried through for feature 3's calculated
  // shipping-rate lookup (src/lib/checkout/shipping.ts) — null when
  // unavailable or when the product never had this set.
  weightOz: number | null;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
}

export interface CartSummary {
  items: ResolvedCartLine[];
  subtotalCents: number;
}

type SingleSelectCategory = {
  category: string;
  optionId: number | undefined;
  options: { id: number; label: string; priceAdjustmentCents: number }[];
};

/**
 * Pure and testable: resolves one cart line reference against its
 * product's current data (or `null` if the product is no longer
 * Active/doesn't exist). Never trusts anything from the reference
 * itself for pricing.
 */
export function resolveCartLine(
  reference: CartLineReference,
  product: ActiveProductDetail | null,
): ResolvedCartLine {
  if (!product) {
    return {
      productId: reference.productId,
      name: "This item",
      selectedOptions: [],
      quantity: reference.quantity,
      unitPriceCents: 0,
      lineTotalCents: 0,
      unavailable: true,
      weightOz: null,
      lengthIn: null,
      widthIn: null,
      heightIn: null,
    };
  }

  const singleSelectCategories: SingleSelectCategory[] = [
    { category: "Processing", optionId: reference.processingOptionId, options: product.processingOptions },
    { category: "Styling", optionId: reference.stylingOptionId, options: product.stylingOptions },
    { category: "Material", optionId: reference.materialOptionId, options: product.materialOptions },
    { category: "Size", optionId: reference.sizeOptionId, options: product.sizeOptions },
    { category: "Color", optionId: reference.colorOptionId, options: product.colorOptions },
  ];

  let unavailable = false;
  const selectedOptions: SelectedOptionSummary[] = [];

  for (const { category, optionId, options } of singleSelectCategories) {
    if (optionId === undefined) continue;
    const found = options.find((o) => o.id === optionId);
    if (!found) {
      unavailable = true;
      continue;
    }
    selectedOptions.push({ category, label: found.label, priceAdjustmentCents: found.priceAdjustmentCents });
  }

  for (const id of reference.designLocationOptionIds) {
    const found = product.designLocationOptions.find((o) => o.id === id);
    if (!found) {
      unavailable = true;
      continue;
    }
    selectedOptions.push({
      category: "Design Location",
      label: found.label,
      priceAdjustmentCents: found.priceAdjustmentCents,
    });
  }

  const unitPriceCents = calculateTotalCents(product.basePriceCents, selectedOptions);

  return {
    productId: reference.productId,
    name: product.name,
    selectedOptions,
    quantity: reference.quantity,
    unitPriceCents,
    lineTotalCents: unitPriceCents * reference.quantity,
    unavailable,
    weightOz: product.weightOz,
    lengthIn: product.lengthIn,
    widthIn: product.widthIn,
    heightIn: product.heightIn,
  };
}

/** Pure and testable: sums only the available lines (FR-004). */
export function summarizeCart(items: ResolvedCartLine[]): CartSummary {
  const subtotalCents = items
    .filter((item) => !item.unavailable)
    .reduce((sum, item) => sum + item.lineTotalCents, 0);
  return { items, subtotalCents };
}

export async function getCart(): Promise<CartSummary> {
  const references = await readCart();
  const items = await Promise.all(
    references.map(async (reference) => {
      const result = await getActiveProduct(reference.productId);
      return resolveCartLine(reference, result.ok ? result.data : null);
    }),
  );
  return summarizeCart(items);
}
