"use server";

import { z } from "zod";
import { getActiveProduct } from "@/lib/catalog/queries";
import type { CheckoutActionResult } from "@/lib/checkout/action-result";
import { resolveCartLine } from "@/lib/checkout/cart";
import { readCart, writeCart, type CartLineReference } from "@/lib/checkout/cart-cookie";
import { checkCheckoutRateLimit } from "@/lib/checkout/rate-limit";

const addToCartSchema = z.object({
  productId: z.number().int(),
  processingOptionId: z.number().int().optional(),
  stylingOptionId: z.number().int().optional(),
  materialOptionId: z.number().int().optional(),
  sizeOptionId: z.number().int().optional(),
  colorOptionId: z.number().int().optional(),
  designLocationOptionIds: z.array(z.number().int()).default([]),
  quantity: z.number().int().min(1),
});

export async function addToCart(input: unknown): Promise<CheckoutActionResult<null>> {
  await checkCheckoutRateLimit();

  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", fieldErrors: { _root: "Invalid selection." } };
  }

  const reference: CartLineReference = parsed.data;

  const product = await getActiveProduct(reference.productId);
  const resolved = resolveCartLine(reference, product.ok ? product.data : null);
  if (resolved.unavailable) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { _root: "This product or one of its options is no longer available." },
    };
  }

  const cart = await readCart();
  cart.push(reference);
  await writeCart(cart);

  return { ok: true, data: null };
}

const lineIndexSchema = z.object({ lineIndex: z.number().int().min(0) });
const updateQuantitySchema = lineIndexSchema.extend({ quantity: z.number().int().min(1) });

export async function updateCartItemQuantity(input: unknown): Promise<CheckoutActionResult<null>> {
  await checkCheckoutRateLimit();

  const parsed = updateQuantitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error" };
  }

  const cart = await readCart();
  if (parsed.data.lineIndex >= cart.length) {
    return { ok: false, error: "not_found" };
  }

  cart[parsed.data.lineIndex] = { ...cart[parsed.data.lineIndex], quantity: parsed.data.quantity };
  await writeCart(cart);

  return { ok: true, data: null };
}

export async function removeCartItem(input: unknown): Promise<CheckoutActionResult<null>> {
  await checkCheckoutRateLimit();

  const parsed = lineIndexSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error" };
  }

  const cart = await readCart();
  if (parsed.data.lineIndex >= cart.length) {
    return { ok: false, error: "not_found" };
  }

  cart.splice(parsed.data.lineIndex, 1);
  await writeCart(cart);

  return { ok: true, data: null };
}
