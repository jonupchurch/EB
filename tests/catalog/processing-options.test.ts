import { describe, expect, it } from "vitest";
import { isCustomerSelectable } from "../../src/lib/catalog/processing-options";

describe("isCustomerSelectable", () => {
  it("keeps an option that doesn't require a customer upload", () => {
    expect(isCustomerSelectable({ requiresCustomerUpload: false })).toBe(true);
  });

  it("excludes an option that requires a customer upload", () => {
    expect(isCustomerSelectable({ requiresCustomerUpload: true })).toBe(false);
  });

  it("filters a mixed array down to only customer-selectable options", () => {
    const options = [
      { id: 1, requiresCustomerUpload: false },
      { id: 2, requiresCustomerUpload: true },
      { id: 3, requiresCustomerUpload: false },
      { id: 4, requiresCustomerUpload: true },
    ];

    expect(options.filter(isCustomerSelectable).map((o) => o.id)).toEqual([1, 3]);
  });

  it("returns an empty array when every option requires an upload", () => {
    const options = [
      { id: 1, requiresCustomerUpload: true },
      { id: 2, requiresCustomerUpload: true },
    ];

    expect(options.filter(isCustomerSelectable)).toEqual([]);
  });
});
