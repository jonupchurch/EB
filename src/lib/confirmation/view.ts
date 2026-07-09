// Pure, testable shaping of an order's confirmation view (data-model.md's
// "Confirmation view" section) — shared by the confirmation page's
// Server Action and the confirmation email, so both always describe
// the same order identically.

import type { OrderStatus } from "@/lib/checkout/order-math";
import type { OrderItemOptionSnapshot } from "@/db/schema";

export interface ConfirmationLineItem {
  name: string;
  selectedOptions: OrderItemOptionSnapshot[];
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ConfirmationShippingAddress {
  name: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ConfirmationView {
  confirmationId: string;
  items: ConfirmationLineItem[];
  shippingAddress: ConfirmationShippingAddress;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  status: "placed" | "paid";
}

export interface ConfirmationOrderRow {
  confirmationToken: string;
  status: OrderStatus;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
}

export interface ConfirmationOrderItemRow {
  productNameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  lineTotalCents: number;
  selectedOptionsSnapshot: OrderItemOptionSnapshot[];
}

/**
 * "in production"/"shipped" collapse to "placed" here on purpose — this
 * feature has no way to distinguish them from "placed" (that's a later
 * admin feature's job) and must never imply a stage happened before it
 * did (FR-003).
 */
export function buildConfirmationView(
  order: ConfirmationOrderRow,
  items: ConfirmationOrderItemRow[],
): ConfirmationView {
  return {
    confirmationId: order.confirmationToken.slice(0, 8).toUpperCase(),
    items: items.map((item) => ({
      name: item.productNameSnapshot,
      selectedOptions: item.selectedOptionsSnapshot,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCentsSnapshot,
      lineTotalCents: item.lineTotalCents,
    })),
    shippingAddress: {
      name: order.shippingName,
      street1: order.shippingLine1,
      street2: order.shippingLine2,
      city: order.shippingCity,
      state: order.shippingState,
      zip: order.shippingZip,
      country: order.shippingCountry,
    },
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    status: order.status === "paid" ? "paid" : "placed",
  };
}
