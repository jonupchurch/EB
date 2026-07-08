"use client";

import { useState } from "react";
import { createOrderAndPayment, getCheckoutSummary, type CheckoutBreakdown } from "./actions";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface FormState {
  customerEmail: string;
  name: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  shippingMethod: "flat" | "calculated";
  promoCode: string;
}

const initialState: FormState = {
  customerEmail: "",
  name: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  shippingMethod: "flat",
  promoCode: "",
};

export function CheckoutForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [breakdown, setBreakdown] = useState<CheckoutBreakdown | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [summaryPending, setSummaryPending] = useState(false);
  const [payPending, setPayPending] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setBreakdown(null);
  }

  function buildInput() {
    return {
      customerEmail: form.customerEmail,
      shippingAddress: {
        name: form.name,
        street1: form.street1,
        street2: form.street2 || undefined,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
      },
      shippingMethod: form.shippingMethod,
      promoCode: form.promoCode || undefined,
    };
  }

  async function handleReview() {
    setSummaryPending(true);
    setFieldErrors({});
    setBreakdown(null);
    try {
      const result = await getCheckoutSummary(buildInput());
      if (result.ok) {
        setBreakdown(result.data);
      } else {
        setFieldErrors(result.fieldErrors ?? { _root: "Could not calculate your total." });
      }
    } catch (error) {
      setFieldErrors({ _root: error instanceof Error ? error.message : "Could not calculate your total." });
    } finally {
      setSummaryPending(false);
    }
  }

  async function handlePay() {
    setPayPending(true);
    setFieldErrors({});
    try {
      const result = await createOrderAndPayment(buildInput());
      if (result.ok) {
        window.location.href = result.data.paypalApprovalUrl;
      } else {
        setFieldErrors(result.fieldErrors ?? { _root: "Could not start payment." });
        setPayPending(false);
      }
    } catch (error) {
      setFieldErrors({ _root: error instanceof Error ? error.message : "Could not start payment." });
      setPayPending(false);
    }
  }

  return (
    <div className="mt-6 grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        {fieldErrors._root && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{fieldErrors._root}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.customerEmail}
            onChange={(e) => updateField("customerEmail", e.target.value)}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="street1">
            Street address
          </label>
          <input
            id="street1"
            value={form.street1}
            onChange={(e) => updateField("street1", e.target.value)}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="street2">
            Apt / suite (optional)
          </label>
          <input
            id="street2"
            value={form.street2}
            onChange={(e) => updateField("street2", e.target.value)}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="city">
              City
            </label>
            <input
              id="city"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="state">
              State
            </label>
            <input
              id="state"
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
              className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="zip">
              ZIP
            </label>
            <input
              id="zip"
              value={form.zip}
              onChange={(e) => updateField("zip", e.target.value)}
              className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            />
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink">Shipping method</legend>
          <div className="mt-1 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                checked={form.shippingMethod === "flat"}
                onChange={() => updateField("shippingMethod", "flat")}
              />
              Flat rate
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                checked={form.shippingMethod === "calculated"}
                onChange={() => updateField("shippingMethod", "calculated")}
              />
              Calculated (carrier rate)
            </label>
          </div>
          {fieldErrors.shippingMethod && (
            <p className="mt-1 text-sm text-red-700">{fieldErrors.shippingMethod}</p>
          )}
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="promoCode">
            Promo code (optional)
          </label>
          <input
            id="promoCode"
            value={form.promoCode}
            onChange={(e) => updateField("promoCode", e.target.value)}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          />
          {fieldErrors.promoCode && <p className="mt-1 text-sm text-red-700">{fieldErrors.promoCode}</p>}
        </div>

        <button
          type="button"
          onClick={handleReview}
          disabled={summaryPending}
          className="rounded bg-cream-deep px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          {summaryPending ? "Calculating…" : "Review order"}
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Order summary</h2>
        {!breakdown ? (
          <p className="mt-4 text-sm text-muted">
            Fill in your details and click &quot;Review order&quot; to see your total.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {breakdown.unavailableItems.length > 0 && (
              <p className="rounded bg-red-50 px-3 py-2 text-red-700">
                {breakdown.unavailableItems.length} item(s) in your cart are no longer available and
                were excluded from this total.
              </p>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="text-ink">{formatPrice(breakdown.subtotalCents)}</span>
            </div>
            {breakdown.discountCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Discount</span>
                <span className="text-ink">-{formatPrice(breakdown.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Shipping</span>
              <span className="text-ink">{formatPrice(breakdown.shippingCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tax</span>
              <span className="text-ink">{formatPrice(breakdown.taxCents)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-cream-deeper pt-2 text-base font-semibold">
              <span className="text-ink">Total</span>
              <span className="text-ink">{formatPrice(breakdown.totalCents)}</span>
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={payPending}
              className="mt-4 rounded bg-teal px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {payPending ? "Redirecting to PayPal…" : "Pay with PayPal"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
