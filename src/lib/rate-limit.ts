import "server-only";

/**
 * Minimal in-memory fixed-window rate limiter. Suitable for a single-instance
 * deployment (the app currently runs under a single PM2 process). If the app is
 * ever scaled horizontally, replace this with a shared store (e.g. Redis/Upstash).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

export function rateLimit(
    key: string,
    limit: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    if (existing.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
        };
    }

    existing.count += 1;
    return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Clear a bucket early (e.g. after a successful login). */
export function resetRateLimit(key: string): void {
    buckets.delete(key);
}

// Opportunistic cleanup so the map does not grow unbounded.
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}, 10 * 60 * 1000).unref?.();
