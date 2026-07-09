"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminSession } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { validateStatusTransition } from "@/lib/admin/order-status";
import type { OrderStatus } from "@/lib/checkout/order-math";
import type { OrderItemOptionSnapshot } from "@/db/schema";

type ActionError = {
  ok: false;
  error: "not_authorized" | "not_found" | "invalid_transition";
};

type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionError;

const NOT_AUTHORIZED: ActionError = { ok: false, error: "not_authorized" };

export interface OrderQueueItem {
  id: number;
  customerName: string;
  itemCount: number;
  totalCents: number;
  status: OrderStatus;
  createdAt: Date;
}

/** Powers the order queue (US1, FR-001) — every order, most-recent-first. */
export async function listOrders(): Promise<ActionResult<OrderQueueItem[]>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const rows = await db.query.orders.findMany({
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    with: { items: true },
  });

  const data: OrderQueueItem[] = rows.map((order) => ({
    id: order.id,
    customerName: order.shippingName,
    // Total units across every line item — how much fulfillment work
    // this order represents, not just how many distinct products.
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    totalCents: order.totalCents,
    status: order.status,
    createdAt: order.createdAt,
  }));

  return { ok: true, data };
}

export interface OrderDetailItem {
  name: string;
  selectedOptions: OrderItemOptionSnapshot[];
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderDetail {
  id: number;
  status: OrderStatus;
  items: OrderDetailItem[];
  shippingAddress: {
    name: string;
    street1: string;
    street2: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  customerEmail: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: Date;
  paidAt: Date | null;
}

/** Powers the order detail view (US1, FR-002) — entirely read-only. */
export async function getOrderDetail(orderId: number): Promise<ActionResult<OrderDetail>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const order = await db.query.orders.findFirst({
    where: (fields, { eq }) => eq(fields.id, orderId),
    with: { items: { orderBy: (items, { asc }) => [asc(items.id)] } },
  });
  if (!order) return { ok: false, error: "not_found" };

  return {
    ok: true,
    data: {
      id: order.id,
      status: order.status,
      items: order.items.map((item) => ({
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
      customerEmail: order.customerEmail,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    },
  };
}

const toStatusSchema = z.enum(["in production", "shipped"]);

/**
 * The fulfillment-status control (US1). Never accepts `paid` as a
 * target (FR-005) — that value isn't even in `toStatusSchema`'s enum,
 * so it's rejected before `validateStatusTransition` is ever reached.
 */
export async function advanceOrderStatus(
  orderId: number,
  toStatus: unknown,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const session = await requireAdminSession();
  if (!session) return NOT_AUTHORIZED;
  checkAdminRateLimit();

  const parsed = toStatusSchema.safeParse(toStatus);
  if (!parsed.success) return { ok: false, error: "invalid_transition" };

  const order = await db.query.orders.findFirst({
    where: (fields, { eq }) => eq(fields.id, orderId),
  });
  if (!order) return { ok: false, error: "not_found" };

  const validation = validateStatusTransition(order.status, parsed.data);
  if (!validation.ok) return { ok: false, error: validation.error };

  const [updated] = await db
    .update(orders)
    .set({ status: parsed.data })
    .where(eq(orders.id, orderId))
    .returning({ status: orders.status });

  return { ok: true, data: { status: updated.status } };
}
