// Flat-rate + Shippo-backed calculated/carrier-rate shipping
// (docs/adr/0013-shippo-for-carrier-shipping-rates.md), using feature
// 1's per-product weight/dimensions (FR-017). Behind this interface
// sits a deterministic fake, used whenever CHECKOUT_FAKE_PROVIDERS is
// set (every automated test).

import { Shippo } from "shippo";
import { getShopSettingsRow } from "@/lib/admin/shop-settings";
import { getShopOriginAddress } from "./shop-origin";

// This project's business scale doesn't need real multi-item bin
// packing: every cart item's weight is summed, and the largest single
// dimension in each axis stands in for one combined parcel. A genuine
// simplification, not a real packing calculation — revisit if orders
// with several large, differently-shaped items become common.
export interface CartItemForShipping {
  weightOz: number | null;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  quantity: number;
}

export interface ShippingDestination {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export type ShippingRateResult =
  | { ok: true; shippingCents: number; label: string }
  | { ok: false; error: "missing_package_info" | "no_rates_available" };

// Used whenever the admin hasn't set a flat rate yet (FR-012) —
// checkout must never error or charge $0 shipping for that reason.
export const FLAT_RATE_DEFAULT_CENTS = 799;

function usesFakeProviders(): boolean {
  return process.env.CHECKOUT_FAKE_PROVIDERS === "true";
}

function aggregateParcel(items: CartItemForShipping[]) {
  const known = items.filter(
    (i) => i.weightOz !== null && i.lengthIn !== null && i.widthIn !== null && i.heightIn !== null,
  );
  if (known.length === 0) return null;

  const totalWeightOz = known.reduce((sum, i) => sum + i.weightOz! * i.quantity, 0);
  const lengthIn = Math.max(...known.map((i) => i.lengthIn!));
  const widthIn = Math.max(...known.map((i) => i.widthIn!));
  const heightIn = Math.max(...known.map((i) => i.heightIn!));

  return { totalWeightOz, lengthIn, widthIn, heightIn };
}

function getFakeShippingRate(totalWeightOz: number): ShippingRateResult {
  // Deterministic, clearly-fake rate for tests — never a real carrier quote.
  return { ok: true, shippingCents: 500 + Math.round(totalWeightOz) * 10, label: "Fake Carrier Ground" };
}

async function getRealCalculatedRate(
  parcel: { totalWeightOz: number; lengthIn: number; widthIn: number; heightIn: number },
  destination: ShippingDestination,
): Promise<ShippingRateResult> {
  const apiKey = process.env.SHIPPO_API_KEY;
  if (!apiKey) {
    throw new Error("SHIPPO_API_KEY is not set — cannot compute calculated shipping.");
  }

  const origin = getShopOriginAddress();
  const shippo = new Shippo({ apiKeyHeader: apiKey });

  const shipment = await shippo.shipments.create({
    addressFrom: {
      name: origin.name,
      street1: origin.street1,
      city: origin.city,
      state: origin.state,
      zip: origin.zip,
      country: origin.country,
    },
    addressTo: {
      name: destination.name,
      street1: destination.street1,
      street2: destination.street2,
      city: destination.city,
      state: destination.state,
      zip: destination.zip,
      country: destination.country,
    },
    parcels: [
      {
        massUnit: "oz",
        weight: String(parcel.totalWeightOz),
        distanceUnit: "in",
        length: String(parcel.lengthIn),
        width: String(parcel.widthIn),
        height: String(parcel.heightIn),
      },
    ],
    async: false,
  });

  if (!shipment.rates || shipment.rates.length === 0) {
    return { ok: false, error: "no_rates_available" };
  }

  const cheapest = shipment.rates.reduce((min, rate) =>
    Number(rate.amount) < Number(min.amount) ? rate : min,
  );

  return {
    ok: true,
    shippingCents: Math.round(Number(cheapest.amount) * 100),
    label: `${cheapest.provider} ${cheapest.servicelevel?.name ?? ""}`.trim(),
  };
}

export async function getShippingRate(
  method: "flat" | "calculated",
  items: CartItemForShipping[],
  destination: ShippingDestination,
): Promise<ShippingRateResult> {
  if (method === "flat") {
    const settings = await getShopSettingsRow();
    const shippingCents = settings.flatRateShippingCents ?? FLAT_RATE_DEFAULT_CENTS;
    return { ok: true, shippingCents, label: "Flat rate" };
  }

  const parcel = aggregateParcel(items);
  if (!parcel) {
    return { ok: false, error: "missing_package_info" };
  }

  if (usesFakeProviders()) {
    return getFakeShippingRate(parcel.totalWeightOz);
  }

  return getRealCalculatedRate(parcel, destination);
}
