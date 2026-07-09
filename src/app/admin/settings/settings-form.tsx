"use client";

import { useState } from "react";
import { PriceInput } from "@/components/price-input";
import { setFlatRateShipping } from "./actions";

export function SettingsForm({ initialFlatRateShippingCents }: { initialFlatRateShippingCents: number }) {
  const [cents, setCents] = useState(initialFlatRateShippingCents);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const result = await setFlatRateShipping(cents);
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.fieldErrors?.flatRateShippingCents ?? "Could not save this setting.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this setting.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-sm rounded border border-cream-deeper bg-white p-4">
      <p className="font-semibold text-ink">Flat rate shipping</p>
      <p className="mt-1 text-sm text-muted">
        One price per order, used whenever a customer selects flat-rate shipping at checkout.
      </p>

      <label className="mt-4 block text-sm font-medium text-ink" htmlFor="flatRateShippingCents">
        Amount (USD)
      </label>
      <PriceInput
        id="flatRateShippingCents"
        valueCents={cents}
        onChangeCents={(next) => {
          setCents(next);
          setSaved(false);
        }}
        className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
      />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="mt-2 text-sm text-teal">Saved.</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="mt-4 rounded bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
