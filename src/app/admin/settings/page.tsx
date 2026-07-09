import { FLAT_RATE_DEFAULT_CENTS } from "@/lib/checkout/shipping";
import { getShopSettings } from "./actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const result = await getShopSettings();
  const flatRateShippingCents =
    (result.ok ? result.data.flatRateShippingCents : null) ?? FLAT_RATE_DEFAULT_CENTS;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Shipping &amp; Fees</h1>
      <SettingsForm initialFlatRateShippingCents={flatRateShippingCents} />
    </div>
  );
}
