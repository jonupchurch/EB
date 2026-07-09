import { describe, expect, it } from "vitest";
import { getNextAdminStatus, validateStatusTransition } from "../../src/lib/admin/order-status";

describe("validateStatusTransition", () => {
  it("allows paid -> in production", () => {
    expect(validateStatusTransition("paid", "in production")).toEqual({ ok: true });
  });

  it("allows in production -> shipped", () => {
    expect(validateStatusTransition("in production", "shipped")).toEqual({ ok: true });
  });

  it("rejects skipping paid straight to shipped (FR-004)", () => {
    expect(validateStatusTransition("paid", "shipped")).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("rejects moving backward from shipped (FR-004)", () => {
    expect(validateStatusTransition("shipped", "in production")).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("rejects any admin-driven transition from placed — that's webhook-only (FR-005)", () => {
    expect(validateStatusTransition("placed", "in production")).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("rejects a no-op re-application of the current status", () => {
    expect(validateStatusTransition("paid", "paid" as never)).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });
});

describe("getNextAdminStatus", () => {
  it("has no admin-settable next status for placed (webhook-only) or shipped (terminal)", () => {
    expect(getNextAdminStatus("placed")).toBeNull();
    expect(getNextAdminStatus("shipped")).toBeNull();
  });

  it("returns the single legal next status for paid and in production", () => {
    expect(getNextAdminStatus("paid")).toBe("in production");
    expect(getNextAdminStatus("in production")).toBe("shipped");
  });
});
