// In-memory rate limiter for checkout's mutating Server Actions
// (add to cart, apply promo, create/pay order). Unlike
// src/lib/admin/rate-limit.ts (tuned for exactly two trusted, known
// accounts sharing one counter), this traffic is anonymous and public,
// so the limit is keyed per visitor (IP) rather than global — sized to
// catch abuse/runaway scripts, not ordinary shopping behavior (Principle II).

import { headers } from "next/headers";

const WINDOW_MS = 60_000;
const MAX_MUTATIONS_PER_WINDOW = 30;

const buckets = new Map<string, { windowStart: number; count: number }>();

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests — please slow down and try again in a moment.");
    this.name = "RateLimitError";
  }
}

async function getClientKey(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

/** Call at the top of every checkout mutation Server Action. Throws RateLimitError if exceeded. */
export async function checkCheckoutRateLimit(): Promise<void> {
  const key = await getClientKey();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > MAX_MUTATIONS_PER_WINDOW) {
    throw new RateLimitError();
  }
}
