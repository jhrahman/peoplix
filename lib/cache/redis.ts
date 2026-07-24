import { Redis } from "@upstash/redis";

// Undefined when env vars aren't set - callers must treat that as "no cache
// available" rather than throwing, so the app works identically without Redis.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

// Caching here is a pure optimization: any missing config or Redis failure
// falls through to a live fetch so an Upstash outage never breaks a page.
export async function getOrSetJSON<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!redis) return fetcher();

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;
  } catch (err) {
    console.error(`Redis get failed for "${key}":`, err);
  }

  const value = await fetcher();

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error(`Redis set failed for "${key}":`, err);
  }

  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error(`Redis del failed for [${keys.join(", ")}]:`, err);
  }
}
