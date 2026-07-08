import Link from "next/link";
import { getCart } from "@/lib/checkout/cart";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage() {
  const cart = await getCart();
  const hasAvailableItems = cart.items.some((item) => !item.unavailable);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-ink">Checkout</h1>

      {!hasAvailableItems ? (
        <p className="mt-6 text-muted">
          Your cart is empty.{" "}
          <Link href="/" className="text-teal underline">
            Continue shopping
          </Link>
          .
        </p>
      ) : (
        <CheckoutForm />
      )}
    </div>
  );
}
