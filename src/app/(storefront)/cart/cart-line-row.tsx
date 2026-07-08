"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResolvedCartLine } from "@/lib/checkout/cart";
import { removeCartItem, updateCartItemQuantity } from "./actions";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CartLineRow({ item, lineIndex }: { item: ResolvedCartLine; lineIndex: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleQuantityChange(quantity: number) {
    if (quantity < 1) return;
    setPending(true);
    setError(null);
    try {
      const result = await updateCartItemQuantity({ lineIndex, quantity });
      if (result.ok) {
        router.refresh();
      } else {
        setError("Could not update quantity");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update quantity");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    setPending(true);
    setError(null);
    try {
      const result = await removeCartItem({ lineIndex });
      if (result.ok) {
        router.refresh();
      } else {
        setError("Could not remove item");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove item");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={
        item.unavailable
          ? "flex items-start justify-between gap-4 rounded border border-red-200 bg-red-50 p-4"
          : "flex items-start justify-between gap-4 rounded border border-cream-deeper p-4"
      }
    >
      <div>
        <p className="font-medium text-ink">{item.name}</p>
        {item.unavailable && (
          <p className="text-sm text-red-700">
            No longer available — excluded from your subtotal.
          </p>
        )}
        {item.selectedOptions.length > 0 && (
          <p className="text-sm text-muted">
            {item.selectedOptions.map((o) => o.label).join(", ")}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <label className="text-sm text-muted" htmlFor={`qty-${lineIndex}`}>
            Qty
          </label>
          <input
            id={`qty-${lineIndex}`}
            type="number"
            min={1}
            value={item.quantity}
            disabled={pending}
            onChange={(e) => handleQuantityChange(Number(e.target.value))}
            className="w-16 rounded border border-cream-deeper bg-white px-2 py-1 text-sm text-ink"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="text-sm font-medium text-red-700 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-medium text-ink">{formatPrice(item.lineTotalCents)}</p>
        <p className="text-sm text-muted">{formatPrice(item.unitPriceCents)} each</p>
      </div>
    </div>
  );
}
