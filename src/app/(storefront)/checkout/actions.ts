"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import type { CheckoutActionResult } from "@/lib/checkout/action-result";
import { getCart, type ResolvedCartLine } from "@/lib/checkout/cart";
import { computeTotalCents } from "@/lib/checkout/order-math";
import { createPayPalOrder } from "@/lib/checkout/paypal";
import {
  PromoCodeInvalidError,
  resolveApplicablePromotion,
  type PromoCodeError,
  type PromotionRecord,
} from "@/lib/checkout/promotions";
import { checkCheckoutRateLimit } from "@/lib/checkout/rate-limit";
import { getSalesTax } from "@/lib/checkout/tax";
import { getShippingRate } from "@/lib/checkout/shipping";

const shippingAddressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  street1: z.string().min(1, "Street address is required"),
  street2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
});

const checkoutInputSchema = z.object({
  customerEmail: z.string().email("A valid email is required"),
  shippingAddress: shippingAddressSchema,
  shippingMethod: z.enum(["flat", "calculated"]),
  promoCode: z.string().optional(),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export interface CheckoutBreakdown {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  unavailableItems: ResolvedCartLine[];
}

function describePromoCodeError(reason: PromoCodeError): string {
  switch (reason) {
    case "not_found":
      return "That promo code doesn't exist.";
    case "inactive":
      return "That promo code is no longer active.";
    case "not_yet_active":
      return "That promo code isn't active yet.";
    case "expired":
      return "That promo code has expired.";
    case "not_applicable":
      return "That promo code doesn't apply to your current cart.";
  }
}

interface ComposedCheckout extends CheckoutBreakdown {
  availableItems: ResolvedCartLine[];
  promotion: PromotionRecord | null;
}

async function composeCheckout(
  input: CheckoutInput,
): Promise<CheckoutActionResult<ComposedCheckout>> {
  const cart = await getCart();
  const availableItems = cart.items.filter((item) => !item.unavailable);
  const unavailableItems = cart.items.filter((item) => item.unavailable);

  if (availableItems.length === 0) {
    return {
      ok: false,
      error: "validation_error",
      fieldErrors: { _root: "Your cart is empty." },
    };
  }

  const subtotalCents = cart.subtotalCents;

  const shippingResult = await getShippingRate(
    input.shippingMethod,
    availableItems.map((item) => ({
      weightOz: item.weightOz,
      lengthIn: item.lengthIn,
      widthIn: item.widthIn,
      heightIn: item.heightIn,
      quantity: item.quantity,
    })),
    input.shippingAddress,
  );
  if (!shippingResult.ok) {
    const message =
      shippingResult.error === "missing_package_info"
        ? "Calculated shipping isn't available for this order — please choose flat rate."
        : "No shipping rates are currently available — please choose flat rate.";
    return { ok: false, error: "validation_error", fieldErrors: { shippingMethod: message } };
  }
  const quotedShippingCents = shippingResult.shippingCents;

  let promotion: PromotionRecord | null = null;
  let discountCents = 0;
  let freeShipping = false;
  try {
    const resolved = await resolveApplicablePromotion(
      availableItems.map((item) => ({ unitPriceCents: item.unitPriceCents, quantity: item.quantity })),
      subtotalCents,
      quotedShippingCents,
      input.promoCode,
    );
    promotion = resolved.promotion;
    discountCents = resolved.discountCents;
    freeShipping = resolved.freeShipping;
  } catch (error) {
    if (error instanceof PromoCodeInvalidError) {
      return {
        ok: false,
        error: "promo_invalid",
        fieldErrors: { promoCode: describePromoCodeError(error.reason) },
      };
    }
    throw error;
  }

  const shippingCents = freeShipping ? 0 : quotedShippingCents;
  const taxableAmountCents = subtotalCents - discountCents;
  const { taxCents } = await getSalesTax(input.shippingAddress, taxableAmountCents, shippingCents);
  const totalCents = computeTotalCents(subtotalCents, discountCents, shippingCents, taxCents);

  return {
    ok: true,
    data: {
      subtotalCents,
      discountCents,
      shippingCents,
      taxCents,
      totalCents,
      unavailableItems,
      availableItems,
      promotion,
    },
  };
}

export async function getCheckoutSummary(input: unknown): Promise<CheckoutActionResult<CheckoutBreakdown>> {
  await checkCheckoutRateLimit();

  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", fieldErrors: { _root: "Please check your shipping details." } };
  }

  const result = await composeCheckout(parsed.data);
  if (!result.ok) return result;

  const { subtotalCents, discountCents, shippingCents, taxCents, totalCents, unavailableItems } =
    result.data;
  return {
    ok: true,
    data: { subtotalCents, discountCents, shippingCents, taxCents, totalCents, unavailableItems },
  };
}

async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export interface CreateOrderAndPaymentResult {
  orderId: number;
  paypalApprovalUrl: string;
}

export async function createOrderAndPayment(
  input: unknown,
): Promise<CheckoutActionResult<CreateOrderAndPaymentResult>> {
  await checkCheckoutRateLimit();

  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", fieldErrors: { _root: "Please check your shipping details." } };
  }

  // Never trusts a total from an earlier getCheckoutSummary call
  // (FR-011) — this is an independent, fresh composition.
  const result = await composeCheckout(parsed.data);
  if (!result.ok) return result;

  const { availableItems, subtotalCents, discountCents, shippingCents, taxCents, totalCents, promotion } =
    result.data;

  const origin = await getRequestOrigin();
  const { paypalOrderId, approvalUrl } = await createPayPalOrder({
    totalCents,
    returnUrl: `${origin}/checkout/return`,
    cancelUrl: `${origin}/checkout?cancelled=true`,
  });

  const { shippingAddress, customerEmail } = parsed.data;
  const confirmationToken = crypto.randomUUID();

  const orderId = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        status: "placed",
        subtotalCents,
        discountCents,
        promotionId: promotion?.id ?? null,
        shippingMethod: parsed.data.shippingMethod,
        shippingCents,
        taxCents,
        totalCents,
        shippingName: shippingAddress.name,
        shippingLine1: shippingAddress.street1,
        shippingLine2: shippingAddress.street2 ?? null,
        shippingCity: shippingAddress.city,
        shippingState: shippingAddress.state,
        shippingZip: shippingAddress.zip,
        shippingCountry: shippingAddress.country,
        customerEmail,
        paypalOrderId,
        confirmationToken,
      })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(
      availableItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productNameSnapshot: item.name,
        unitPriceCentsSnapshot: item.unitPriceCents,
        quantity: item.quantity,
        lineTotalCents: item.lineTotalCents,
        selectedOptionsSnapshot: item.selectedOptions,
      })),
    );

    return order.id;
  });

  return { ok: true, data: { orderId, paypalApprovalUrl: approvalUrl } };
}
