// Pure, testable pieces of order creation/payment logic, kept separate
// from the Server Actions and webhook Route Handler that call them
// (both of which depend on next/headers or a live DB connection and
// so aren't directly unit-testable themselves).

export type OrderStatus = "placed" | "paid" | "in production" | "shipped";

/**
 * Order.totalCents is always derived, never independently entered
 * (data-model.md's Pricing rules, SC-002) — this is the one place
 * that derivation happens, called fresh every time a total is needed,
 * never cached from an earlier step.
 */
export function computeTotalCents(
  subtotalCents: number,
  discountCents: number,
  shippingCents: number,
  taxCents: number,
): number {
  return subtotalCents - discountCents + shippingCents + taxCents;
}

/**
 * The webhook handler's idempotency guard (FR-012, FR-013, FR-015): a
 * repeated delivery for an already-paid order is a no-op, not an error.
 */
export function shouldMarkOrderPaid(currentStatus: OrderStatus): boolean {
  return currentStatus === "placed";
}
