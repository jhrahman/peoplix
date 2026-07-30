import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/cache/redis";

// Backstop for POST /api/auth/login - deliberately NOT a rate limit on logins.
// Two choices keep it out of the way of QA and performance testing:
//   1. Only *failed* attempts are counted. Signing in a thousand times with the
//      right password isn't an attack, so a load test is never throttled at all.
//   2. The ceiling is high and the window is short - 150 failures within 10
//      seconds on one email. A negative-path test suite firing wrong passwords
//      back to back won't trip it, and anything it does block clears itself 10
//      seconds later, so a tester is never locked out waiting.
const LOGIN_FAILURE_LIMIT = 150;
const LOGIN_FAILURE_WINDOW_SECONDS = 10;

function loginFailureKey(email: string) {
  return `login-failures:${email.trim().toLowerCase()}`;
}

// Same contract as checkRateLimit below: no Redis, or a Redis error, means
// "allow" - login must never become unavailable because a cache is down.
export async function isLoginLockedOut(email: string): Promise<boolean> {
  if (!redis) return false;

  try {
    const failures = await redis.get<number>(loginFailureKey(email));
    return (failures ?? 0) >= LOGIN_FAILURE_LIMIT;
  } catch (err) {
    console.error("Login lockout check failed:", err);
    return false;
  }
}

export async function recordLoginFailure(email: string): Promise<void> {
  if (!redis) return;

  try {
    const key = loginFailureKey(email);
    const failures = await redis.incr(key);
    // Only on the first failure, so the window is a fixed 10 seconds from that
    // attempt rather than being extended by every later one.
    if (failures === 1) {
      await redis.expire(key, LOGIN_FAILURE_WINDOW_SECONDS);
    }
  } catch (err) {
    console.error("Recording login failure failed:", err);
  }
}

export async function clearLoginFailures(email: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(loginFailureKey(email));
  } catch (err) {
    console.error("Clearing login failures failed:", err);
  }
}

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
