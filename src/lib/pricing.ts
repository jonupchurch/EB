// Running-total calculation, shared by the admin live preview and every
// server-side save (feature 1), and (later) the storefront's
// customer-facing price preview (feature 2). One function so none of
// those surfaces can ever disagree (data-model.md's Pricing rules,
// spec.md SC-005). Deliberately outside src/lib/admin/ for that reason.

export interface PricedOption {
  priceAdjustmentCents: number;
}

/**
 * basePriceCents plus every currently-selected option's
 * priceAdjustmentCents (each may be positive or negative — see
 * data-model.md's Pricing rules on discounted variants).
 */
export function calculateTotalCents(
  basePriceCents: number,
  selectedOptions: PricedOption[],
): number {
  return selectedOptions.reduce(
    (total, option) => total + option.priceAdjustmentCents,
    basePriceCents,
  );
}
