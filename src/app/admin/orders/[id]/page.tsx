import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_STATUS_LABELS } from "@/lib/admin/order-status";
import type { OrderStatus } from "@/lib/checkout/order-math";
import { getOrderDetail } from "../actions";
import { StatusControl } from "./status-control";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const TIMELINE: OrderStatus[] = ["placed", "paid", "in production", "shipped"];
const REACHED_ORDER: Record<OrderStatus, number> = { placed: 0, paid: 1, "in production": 2, shipped: 3 };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  const result = Number.isInteger(orderId)
    ? await getOrderDetail(orderId)
    : ({ ok: false, error: "not_found" } as const);

  if (!result.ok) {
    notFound();
  }

  const order = result.data;
  const reachedIndex = REACHED_ORDER[order.status];

  return (
    <div>
      <Link href="/admin/orders" className="text-sm font-medium text-teal hover:underline">
        ← Orders
      </Link>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Order #{order.id}</h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <StatusControl orderId={order.id} status={order.status} />
      </div>

      <ol className="mt-6 flex flex-wrap gap-4 text-sm">
        {TIMELINE.map((stage, index) => {
          const reached = index <= reachedIndex;
          return (
            <li
              key={stage}
              className={reached ? "flex items-center gap-1.5 font-medium text-teal" : "flex items-center gap-1.5 text-muted"}
            >
              <span
                aria-hidden="true"
                className={reached ? "h-2.5 w-2.5 rounded-full bg-teal" : "h-2.5 w-2.5 rounded-full bg-cream-deeper"}
              />
              {ORDER_STATUS_LABELS[stage]}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="rounded border border-cream-deeper bg-white">
            <p className="border-b border-cream-deeper px-4 py-3 font-semibold text-ink">Items</p>
            <div className="flex flex-col divide-y divide-cream-deeper">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium text-ink">{item.name}</p>
                    {item.selectedOptions.length > 0 && (
                      <p className="text-sm text-muted">
                        {item.selectedOptions.map((o) => o.label).join(", ")}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-muted">Qty {item.quantity}</p>
                  </div>
                  <p className="shrink-0 font-medium text-ink">{formatPrice(item.lineTotalCents)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-cream-deeper bg-white p-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="text-ink">{formatPrice(order.subtotalCents)}</span>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Discount</span>
                  <span className="text-ink">-{formatPrice(order.discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span className="text-ink">{formatPrice(order.shippingCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tax</span>
                <span className="text-ink">{formatPrice(order.taxCents)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-cream-deeper pt-2 text-base font-semibold">
                <span className="text-ink">Total</span>
                <span className="text-ink">{formatPrice(order.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded border border-cream-deeper bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Customer</p>
            <p className="mt-2 text-sm text-ink">{order.shippingAddress.name}</p>
            <p className="text-sm text-muted">{order.customerEmail}</p>
          </div>

          <div className="rounded border border-cream-deeper bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Shipping address</p>
            <p className="mt-2 text-sm text-ink">{order.shippingAddress.name}</p>
            <p className="text-sm text-ink">
              {order.shippingAddress.street1}
              {order.shippingAddress.street2 ? `, ${order.shippingAddress.street2}` : ""}
            </p>
            <p className="text-sm text-ink">
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
            </p>
            <p className="text-sm text-ink">{order.shippingAddress.country}</p>
          </div>

          <div className="rounded border border-cream-deeper bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
            <p className="mt-2 text-sm text-ink">
              {order.paidAt ? `Paid ${formatDate(order.paidAt)}` : "Not yet verified paid"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
