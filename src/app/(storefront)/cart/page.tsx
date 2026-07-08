import Link from "next/link";
import { getCart } from "@/lib/checkout/cart";
import { CartLineRow } from "./cart-line-row";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function CartPage() {
  const cart = await getCart();
  const availableCount = cart.items.filter((item) => !item.unavailable).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-ink">Your Cart</h1>

      {cart.items.length === 0 ? (
        <p className="mt-6 text-muted">
          Your cart is empty.{" "}
          <Link href="/" className="text-teal underline">
            Continue shopping
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {cart.items.map((item, index) => (
            <CartLineRow key={index} item={item} lineIndex={index} />
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-cream-deeper pt-6">
        <div className="flex items-center justify-between text-lg font-semibold text-ink">
          <span>Subtotal</span>
          <span>{formatPrice(cart.subtotalCents)}</span>
        </div>
        {availableCount === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Add at least one available item to your cart before checking out.
          </p>
        ) : (
          <Link
            href="/checkout"
            className="mt-4 inline-block rounded bg-teal px-6 py-3 text-sm font-medium text-white"
          >
            Proceed to Checkout
          </Link>
        )}
      </div>
    </div>
  );
}
