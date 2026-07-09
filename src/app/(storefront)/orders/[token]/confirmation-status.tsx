"use client";

// The "confirming payment" -> "paid" transition (FR-004) and its 60s
// give-up message (FR-005). Polls the same getOrderConfirmation used
// for the page's initial render, so a poll and a fresh page load can
// never disagree. Only polls for placed -> paid — the later stages
// (in production, shipped) are admin-driven (feature 5) and shown
// accurately on every fresh load/revisit, not live-polled here.

import { useEffect, useState } from "react";
import type { OrderStatus } from "@/lib/checkout/order-math";
import { getOrderConfirmation } from "./actions";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

const STAGES: { key: OrderStatus; label: string }[] = [
  { key: "placed", label: "Placed" },
  { key: "paid", label: "Paid" },
  { key: "in production", label: "In production" },
  { key: "shipped", label: "Shipped" },
];

const STAGE_INDEX: Record<OrderStatus, number> = { placed: 0, paid: 1, "in production": 2, shipped: 3 };

export function ConfirmationStatus({
  token,
  initialStatus,
}: {
  token: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status !== "placed") return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        clearInterval(interval);
        return;
      }
      getOrderConfirmation(token).then((result) => {
        if (result.ok && result.data.status !== "placed") {
          setStatus(result.data.status);
          clearInterval(interval);
        }
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, token]);

  const reachedIndex = STAGE_INDEX[status];

  return (
    <div className="mt-6">
      {status === "placed" && !timedOut && (
        <p className="rounded bg-cream-deep px-3 py-2 text-sm text-ink" role="status">
          Confirming your payment — this only takes a moment…
        </p>
      )}
      {timedOut && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="status">
          This may need attention — your payment is taking longer than expected to confirm.
          Please contact us if you were charged.
        </p>
      )}
      <ol className="mt-4 flex flex-wrap gap-4 text-sm">
        {STAGES.map((stage) => {
          const reached = STAGE_INDEX[stage.key] <= reachedIndex;
          return (
            <li
              key={stage.key}
              data-reached={reached}
              className={
                reached ? "flex items-center gap-1.5 font-medium text-teal" : "flex items-center gap-1.5 text-muted"
              }
            >
              <span
                aria-hidden="true"
                className={reached ? "h-2.5 w-2.5 rounded-full bg-teal" : "h-2.5 w-2.5 rounded-full bg-cream-deeper"}
              />
              {stage.label}
              <span className="sr-only">{reached ? " — reached" : " — not yet reached"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
