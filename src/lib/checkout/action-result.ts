// Shared Server Action result shape for this feature's public,
// unauthenticated actions (contracts/actions.md) — a smaller error
// union than feature 1's admin actions, since no auth gate applies here.

export type CheckoutActionError = {
  ok: false;
  error: "validation_error" | "not_found" | "promo_invalid";
  fieldErrors?: Record<string, string>;
};

export type CheckoutActionSuccess<T> = { ok: true; data: T };

export type CheckoutActionResult<T> = CheckoutActionSuccess<T> | CheckoutActionError;
