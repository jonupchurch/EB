"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS, getNextAdminStatus } from "@/lib/admin/order-status";
import type { OrderStatus } from "@/lib/checkout/order-math";
import { advanceOrderStatus } from "../actions";

export function StatusControl({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = getNextAdminStatus(status);

  async function handleAdvance() {
    if (!next) return;
    setPending(true);
    setError(null);
    try {
      const result = await advanceOrderStatus(orderId, next);
      if (result.ok) {
        router.refresh();
      } else {
        setError(
          result.error === "invalid_transition"
            ? "This order can't move to that status right now."
            : "Could not update this order.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this order.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {next ? (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={pending}
          className="rounded bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Updating…" : `Mark as ${ORDER_STATUS_LABELS[next]}`}
        </button>
      ) : (
        <p className="text-sm text-muted">
          {status === "placed"
            ? "Waiting on payment verification — not yet actionable here."
            : "No further action needed."}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
