import Link from "next/link";
import { ORDER_STATUS_LABELS } from "@/lib/admin/order-status";
import { listOrders } from "./actions";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-cream-deeper text-muted",
  paid: "bg-teal/10 text-teal",
  "in production": "bg-amber-50 text-amber-700",
  shipped: "bg-teal text-white",
};

export default async function OrdersPage() {
  const result = await listOrders();
  const orders = result.ok ? result.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cream-deeper text-muted">
              <th className="py-2 pr-4 font-medium">Order</th>
              <th className="py-2 pr-4 font-medium">Customer</th>
              <th className="py-2 pr-4 font-medium">Items</th>
              <th className="py-2 pr-4 font-medium">Total</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="relative border-b border-cream-deeper hover:bg-cream-deep">
                <td className="py-2 pr-4">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium text-ink after:absolute after:inset-0"
                    aria-label={`Order #${order.id}, ${order.customerName}`}
                  >
                    #{order.id}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-ink">{order.customerName}</td>
                <td className="py-2 pr-4 text-ink">{order.itemCount}</td>
                <td className="py-2 pr-4 text-ink">{formatPrice(order.totalCents)}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="py-2 pr-4 text-muted">{formatDate(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
