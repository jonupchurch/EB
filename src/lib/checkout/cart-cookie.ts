// Read/write the cart reference cookie (docs/adr/0011). The cookie
// only ever holds references — a product id, selected option ids, and
// a quantity — never a price. httpOnly since nothing client-side ever
// needs to read it directly (every price is server-computed).

import { cookies } from "next/headers";

const CART_COOKIE_NAME = "cart";
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface CartLineReference {
  productId: number;
  processingOptionId?: number;
  stylingOptionId?: number;
  materialOptionId?: number;
  sizeOptionId?: number;
  colorOptionId?: number;
  designLocationOptionIds: number[];
  quantity: number;
}

function isCartLineReference(value: unknown): value is CartLineReference {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.productId === "number" &&
    typeof v.quantity === "number" &&
    Array.isArray(v.designLocationOptionIds)
  );
}

export async function readCart(): Promise<CartLineReference[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLineReference);
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLineReference[]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE_NAME, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}
