"use server";

// Powers both the confirmation page's initial render and every poll
// while payment is still confirming (contracts/actions.md). The
// confirmationToken — never orders.id — is the only identifier this
// feature accepts (FR-012).

import { db } from "@/db";
import type { CheckoutActionResult } from "@/lib/checkout/action-result";
import { buildConfirmationView, type ConfirmationView } from "@/lib/confirmation/view";

export async function getOrderConfirmation(
  token: string,
): Promise<CheckoutActionResult<ConfirmationView>> {
  const order = await db.query.orders.findFirst({
    where: (orders, { eq }) => eq(orders.confirmationToken, token),
    with: {
      items: {
        orderBy: (items, { asc }) => [asc(items.id)],
      },
    },
  });

  if (!order) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true, data: buildConfirmationView(order, order.items) };
}
