import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/cache/redis";

// undefined when Redis isn't configured - see checkRateLimit.
const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      prefix: "ratelimit",
      analytics: false,
    })
  : undefined;

// A concurrency safety net for the heaviest write endpoints, not a hard
// dependency: without Redis configured, or on any Redis error, this always
// allows the request through rather than blocking real users.
export async function checkRateLimit(identifier: string): Promise<boolean> {
  if (!limiter) return true;

  try {
    const { success } = await limiter.limit(identifier);
    return success;
  } catch (err) {
    console.error(`Rate limit check failed for "${identifier}":`, err);
    return true;
  }
}
