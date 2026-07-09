// The explicit, validated fulfillment-status state machine (Principle
// II: "never inferred ad hoc from scattered booleans") — a single
// source of truth for which status may follow which, checked
// server-side on every attempt (data-model.md's State Transitions).

import type { OrderStatus } from "@/lib/checkout/order-math";

export type AdminSettableStatus = "in production" | "shipped";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  paid: "Paid",
  "in production": "In production",
  shipped: "Shipped",
};

// placed -> paid stays exclusively feature 3's webhook-driven
// transition (FR-005) — never reachable from this map, so an admin
// action can never set it, by construction rather than a runtime check.
const ALLOWED_NEXT: Record<OrderStatus, AdminSettableStatus | null> = {
  placed: null,
  paid: "in production",
  "in production": "shipped",
  shipped: null,
};

export function getNextAdminStatus(currentStatus: OrderStatus): AdminSettableStatus | null {
  return ALLOWED_NEXT[currentStatus];
}

export type ValidateTransitionResult = { ok: true } | { ok: false; error: "invalid_transition" };

/**
 * Pure and testable: `toStatus` is legal only if it's the single
 * allowed next value after `currentStatus` — any skip, reverse, or
 * attempt to target `paid` is rejected (FR-003, FR-004).
 */
export function validateStatusTransition(
  currentStatus: OrderStatus,
  toStatus: AdminSettableStatus,
): ValidateTransitionResult {
  if (ALLOWED_NEXT[currentStatus] !== toStatus) {
    return { ok: false, error: "invalid_transition" };
  }
  return { ok: true };
}
