/**
 * Simple in-memory rate limiter. For production, replace with @upstash/ratelimit or similar.
 */
const windowMap = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windowMap) {
    if (entry.resetAt < now) windowMap.delete(key);
  }
}, 60000);

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

export function rateLimit(key: string, opts: RateLimitOptions = {}) {
  const { maxRequests = 20, windowMs = 60000 } = opts;
  const now = Date.now();
  const entry = windowMap.get(key);

  if (!entry || entry.resetAt < now) {
    windowMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}
