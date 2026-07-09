// Sales tax via TaxJar (docs/adr/0012-taxjar-for-sales-tax.md) —
// address-level, destination-based calculation. Never a hardcoded or
// hand-rolled rate (FR-007). Behind this small interface sits a
// deterministic fake, used whenever CHECKOUT_FAKE_PROVIDERS is set
// (every automated test) — real credentials are never exercised in
// CI, matching this project's established fake-provider pattern.

import Taxjar from "taxjar";
import { getShopOriginAddress } from "./shop-origin";

export interface TaxDestination {
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface SalesTaxResult {
  taxCents: number;
}

function usesFakeProviders(): boolean {
  return process.env.CHECKOUT_FAKE_PROVIDERS === "true";
}

function getFakeSalesTax(taxableAmountCents: number, shippingCents: number): SalesTaxResult {
  // Deterministic, clearly-fake rate for tests — never a real Ohio rate.
  const FAKE_RATE = 0.08;
  return { taxCents: Math.round((taxableAmountCents + shippingCents) * FAKE_RATE) };
}

async function getRealSalesTax(
  destination: TaxDestination,
  taxableAmountCents: number,
  shippingCents: number,
): Promise<SalesTaxResult> {
  const apiKey = process.env.TAXJAR_API_KEY;
  if (!apiKey) {
    throw new Error("TAXJAR_API_KEY is not set — cannot compute sales tax.");
  }

  const origin = getShopOriginAddress();
  // A sandbox key is only valid against TaxJar's sandbox API URL — the
  // default (production) URL rejects it as unauthorized. Mirrors
  // PAYPAL_MODE: never inferred from NODE_ENV, so going live requires a
  // deliberate flip, not an accidental one.
  const client =
    process.env.TAXJAR_MODE === "live"
      ? new Taxjar({ apiKey })
      : new Taxjar({ apiKey, apiUrl: Taxjar.SANDBOX_API_URL });

  const result = await client.taxForOrder({
    from_country: origin.country,
    from_zip: origin.zip,
    from_state: origin.state,
    from_city: origin.city,
    from_street: origin.street1,
    to_country: destination.country,
    to_zip: destination.zip,
    to_state: destination.state,
    to_city: destination.city,
    to_street: destination.street1,
    amount: taxableAmountCents / 100,
    shipping: shippingCents / 100,
  });

  return { taxCents: Math.round(result.tax.amount_to_collect * 100) };
}

/**
 * @param taxableAmountCents The cart subtotal minus any discount — the
 *   taxable base for the goods themselves.
 * @param shippingCents The shipping charge, passed separately so
 *   TaxJar can apply Ohio's shipping-taxability rules correctly.
 */
export async function getSalesTax(
  destination: TaxDestination,
  taxableAmountCents: number,
  shippingCents: number,
): Promise<SalesTaxResult> {
  if (usesFakeProviders()) {
    return getFakeSalesTax(taxableAmountCents, shippingCents);
  }
  return getRealSalesTax(destination, taxableAmountCents, shippingCents);
}
