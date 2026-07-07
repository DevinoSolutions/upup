type Context = { req: { url: string; header: (name: string) => string | undefined } }
type Next = () => Promise<void>
type MaybeResponse = Response | void
import { env } from '../../lib/env.js'

/**
 * Token-bucket rate limiter, in-memory.
 *
 * Per-IP bucket: capacity refills linearly to `capacity` over `windowMs`.
 * Each request costs 1 token. Reject with 429 when the bucket is empty.
 *
 * In-memory state is fine for a single-region deploy + reasonable traffic.
 * For Cloudflare Workers (multi-region) or scale-out, swap the `Map` for a
 * shared store — KV or Upstash Redis — same surface area.
 */

type Bucket = { tokens: number; updatedAt: number }
const buckets = new Map<string, Bucket>()

const CAPACITY = env.RATE_LIMIT_CAPACITY
const WINDOW_MS = env.RATE_LIMIT_WINDOW_MS

function clientId(c: Context): string {
    // Prefer CF / forwarded headers, fall back to socket address. Mastra runs
    // on Hono so c.env.incoming?.socket?.remoteAddress is available in Node.
    const cf = c.req.header('cf-connecting-ip')
    if (cf) return cf
    const xff = c.req.header('x-forwarded-for')
    if (xff) return xff.split(',')[0]?.trim() ?? 'unknown'
    return 'unknown'
}

function take(id: string): boolean {
    const now = Date.now()
    const refillRate = CAPACITY / WINDOW_MS // tokens per ms
    const bucket = buckets.get(id) ?? { tokens: CAPACITY, updatedAt: now }

    // Refill
    const elapsed = now - bucket.updatedAt
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsed * refillRate)
    bucket.updatedAt = now

    if (bucket.tokens < 1) {
        buckets.set(id, bucket)
        return false
    }
    bucket.tokens -= 1
    buckets.set(id, bucket)
    return true
}

export function rateLimitMiddleware() {
    return async (c: Context, next: Next) => {
        // Don't rate-limit the health probe.
        const path = new URL(c.req.url).pathname
        if (path === '/healthz') return next()

        const id = clientId(c)
        if (!take(id)) {
            return new Response(
                JSON.stringify({ error: 'Too many requests', retryAfterMs: 1000 }),
                {
                    status: 429,
                    headers: {
                        'content-type': 'application/json',
                        'retry-after': '1',
                    },
                },
            )
        }
        await next()
    }
}
