"use client";

import { useState } from "react";
import { PriceInput } from "@/components/price-input";
import type { PromotionListItem } from "@/lib/admin/promotion-crud";
import type { PromotionType } from "@/lib/checkout/promotions";
import { createPromotion, deletePromotion, listPromotions, updatePromotion } from "./actions";

const TYPE_LABELS: Record<PromotionType, string> = {
  flat: "Flat amount off",
  bogo: "Buy one, get one free",
  promo_code: "Promo code",
  cart_threshold: "Cart threshold",
  free_shipping: "Free shipping",
};

const TYPE_OPTIONS: PromotionType[] = ["flat", "bogo", "promo_code", "cart_threshold", "free_shipping"];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function describeValue(promotion: PromotionListItem): string {
  switch (promotion.type) {
    case "flat":
    case "promo_code":
      return promotion.discountAmountCents !== null ? `${formatPrice(promotion.discountAmountCents)} off` : "—";
    case "cart_threshold":
      return promotion.discountAmountCents !== null && promotion.thresholdCents !== null
        ? `${formatPrice(promotion.discountAmountCents)} off over ${formatPrice(promotion.thresholdCents)}`
        : "—";
    case "bogo":
      return "Cheapest item free";
    case "free_shipping":
      return "Waives shipping";
  }
}

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

interface FormState {
  id: number | null;
  type: PromotionType;
  promoCode: string;
  discountAmountCents: number;
  thresholdCents: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
}

const emptyForm: FormState = {
  id: null,
  type: "flat",
  promoCode: "",
  discountAmountCents: 0,
  thresholdCents: 0,
  active: true,
  startsAt: "",
  endsAt: "",
};

export function DiscountsManager({ initial }: { initial: PromotionListItem[] }) {
  const [promotions, setPromotions] = useState(initial);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function startEditing(promotion: PromotionListItem) {
    setForm({
      id: promotion.id,
      type: promotion.type,
      promoCode: promotion.promoCode ?? "",
      discountAmountCents: promotion.discountAmountCents ?? 0,
      thresholdCents: promotion.thresholdCents ?? 0,
      active: promotion.active,
      startsAt: toDateInputValue(promotion.startsAt),
      endsAt: toDateInputValue(promotion.endsAt),
    });
    setFieldErrors({});
  }

  function buildInput() {
    return {
      type: form.type,
      promoCode: form.type === "promo_code" ? form.promoCode.trim() || undefined : undefined,
      discountAmountCents:
        form.type === "flat" || form.type === "promo_code" || form.type === "cart_threshold"
          ? form.discountAmountCents
          : undefined,
      thresholdCents:
        form.type === "cart_threshold" || form.type === "promo_code" ? form.thresholdCents : undefined,
      active: form.active,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
    };
  }

  async function handleSave() {
    setPending(true);
    setFieldErrors({});
    try {
      const result = form.id
        ? await updatePromotion(form.id, buildInput())
        : await createPromotion(buildInput());
      if (result.ok) {
        const refreshed = await listPromotions();
        if (refreshed.ok) setPromotions(refreshed.data);
        setForm(emptyForm);
      } else {
        setFieldErrors(result.fieldErrors ?? { _root: "Could not save this discount." });
      }
    } catch (error) {
      setFieldErrors({ _root: error instanceof Error ? error.message : "Could not save this discount." });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(promotion: PromotionListItem) {
    if (!window.confirm(`Delete "${promotion.promoCode ?? TYPE_LABELS[promotion.type]}"? This cannot be undone.`)) {
      return;
    }
    setFieldErrors({});
    try {
      const result = await deletePromotion(promotion.id);
      if (result.ok) {
        setPromotions((prev) => prev.filter((p) => p.id !== promotion.id));
        if (form.id === promotion.id) setForm(emptyForm);
      } else {
        setFieldErrors({ _root: "Could not delete this discount." });
      }
    } catch (error) {
      setFieldErrors({ _root: error instanceof Error ? error.message : "Could not delete this discount." });
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="rounded border border-cream-deeper bg-white">
        {promotions.length === 0 ? (
          <p className="p-4 text-muted">No discounts yet.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-cream-deeper text-muted">
                <th className="px-4 py-2 font-medium">Name / code</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion.id} className="border-b border-cream-deeper">
                  <td className="px-4 py-2 text-ink">{promotion.promoCode ?? TYPE_LABELS[promotion.type]}</td>
                  <td className="px-4 py-2 text-muted">{TYPE_LABELS[promotion.type]}</td>
                  <td className="px-4 py-2 text-ink">{describeValue(promotion)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        promotion.active
                          ? "rounded bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal"
                          : "rounded bg-cream-deeper px-2 py-0.5 text-xs font-medium text-muted"
                      }
                    >
                      {promotion.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEditing(promotion)}
                        className="text-sm font-medium text-teal"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(promotion)}
                        className="text-sm text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded border border-cream-deeper bg-white p-4">
        <p className="font-semibold text-ink">{form.id ? "Edit discount" : "New discount"}</p>

        {fieldErrors._root && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{fieldErrors._root}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="type">
            Type
          </label>
          <select
            id="type"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as PromotionType }))}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          >
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {form.type === "promo_code" && (
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="promoCode">
              Promo code
            </label>
            <input
              id="promoCode"
              value={form.promoCode}
              onChange={(e) => setForm((prev) => ({ ...prev, promoCode: e.target.value }))}
              className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            />
            {fieldErrors.promoCode && <p className="mt-1 text-sm text-red-700">{fieldErrors.promoCode}</p>}
          </div>
        )}

        {(form.type === "flat" || form.type === "promo_code" || form.type === "cart_threshold") && (
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="discountAmountCents">
              Discount amount (USD)
            </label>
            <PriceInput
              id="discountAmountCents"
              valueCents={form.discountAmountCents}
              onChangeCents={(cents) => setForm((prev) => ({ ...prev, discountAmountCents: cents }))}
              className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            />
            {fieldErrors.discountAmountCents && (
              <p className="mt-1 text-sm text-red-700">{fieldErrors.discountAmountCents}</p>
            )}
          </div>
        )}

        {(form.type === "cart_threshold" || form.type === "promo_code") && (
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="thresholdCents">
              Minimum cart {form.type === "promo_code" ? "(optional)" : ""}
            </label>
            <PriceInput
              id="thresholdCents"
              valueCents={form.thresholdCents}
              onChangeCents={(cents) => setForm((prev) => ({ ...prev, thresholdCents: cents }))}
              className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            />
            {fieldErrors.thresholdCents && (
              <p className="mt-1 text-sm text-red-700">{fieldErrors.thresholdCents}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="startsAt">
              Starts (optional)
            </label>
            <input
              id="startsAt"
              type="date"
              value={form.startsAt}
              onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
              className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="endsAt">
              Ends (optional)
            </label>
            <input
              id="endsAt"
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
              className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
          />
          Active
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : form.id ? "Save changes" : "Create discount"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="text-sm text-muted"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
