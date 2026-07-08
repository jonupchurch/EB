import { describe, expect, it } from "vitest";
import { computeTotalCents, shouldMarkOrderPaid } from "../../src/lib/checkout/order-math";

describe("computeTotalCents", () => {
  it("derives the total from its constituent parts, never independently entered (SC-002)", () => {
    expect(computeTotalCents(2000, 0, 500, 175)).toBe(2675);
  });

  it("reflects a discount", () => {
    expect(computeTotalCents(2000, 500, 500, 120)).toBe(2120);
  });

  it("recomputes fresh from whatever inputs are passed — never trusts a cached total (FR-011)", () => {
    // Simulates "the price changed between an earlier summary and the
    // moment of payment": calling this again with updated inputs must
    // reflect the new values, not whatever an earlier call returned.
    const earlierTotal = computeTotalCents(2000, 0, 500, 175);
    const paymentTimeTotal = computeTotalCents(3000, 0, 500, 245);
    expect(paymentTimeTotal).not.toBe(earlierTotal);
    expect(paymentTimeTotal).toBe(3745);
  });
});

describe("shouldMarkOrderPaid", () => {
  it("allows marking a placed order paid", () => {
    expect(shouldMarkOrderPaid("placed")).toBe(true);
  });

  it("is a no-op for an order that's already paid (webhook idempotency, FR-015)", () => {
    expect(shouldMarkOrderPaid("paid")).toBe(false);
  });

  it("is a no-op for later fulfillment states too", () => {
    expect(shouldMarkOrderPaid("in production")).toBe(false);
    expect(shouldMarkOrderPaid("shipped")).toBe(false);
  });
});
