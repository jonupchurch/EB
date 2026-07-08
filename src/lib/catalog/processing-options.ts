// Excludes processing options the customer-facing storefront can't yet
// fulfill (the deferred upload-your-own-design flow — see
// docs/future-work.md and feature 1's FR-016). Filters on the explicit
// `requiresCustomerUpload` flag the owner sets, never on label text —
// a label can be renamed at any time via the admin editor without
// silently breaking this filter (research.md's decision).

export interface ProcessingOptionLike {
  requiresCustomerUpload: boolean;
}

export function isCustomerSelectable<T extends ProcessingOptionLike>(option: T): boolean {
  return !option.requiresCustomerUpload;
}
