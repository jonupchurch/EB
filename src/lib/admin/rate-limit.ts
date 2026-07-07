// Simple in-memory rate limiter for admin mutation Server Actions.
// Sized for two trusted, known users (Principle II requires *a*
// sensible limit here, not abuse-resistance tuning for public
// traffic) — this exists to catch a runaway client bug or script, not
// to defend against an anonymous public. See research.md's "Admin
// mutation rate limiting" decision.

const WINDOW_MS = 60_000;
const MAX_MUTATIONS_PER_WINDOW = 60;

let windowStart = Date.now();
let mutationCount = 0;

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests — please slow down and try again in a moment.");
    this.name = "RateLimitError";
  }
}

/** Call at the top of every admin mutation Server Action. Throws RateLimitError if exceeded. */
export function checkAdminRateLimit(): void {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    mutationCount = 0;
  }
  mutationCount += 1;
  if (mutationCount > MAX_MUTATIONS_PER_WINDOW) {
    throw new RateLimitError();
  }
}
