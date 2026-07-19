// In-memory per-IP token bucket, adapted from apps/mastra's rate-limit
// middleware (copied + shrunk, not imported — the apps don't share code).
// Capacity refills linearly over the window; each request costs one token.
// Fine for a single-region deploy; swap the Map for a shared store to scale out.

type Bucket = { tokens: number; updatedAt: number }

const CAPACITY = 5
const WINDOW_MS = 60_000
const buckets = new Map<string, Bucket>()

/** Consume one token for `id`. Returns false when the bucket is empty. */
export function takeToken(id: string): boolean {
    const now = Date.now()
    const refillRate = CAPACITY / WINDOW_MS
    const bucket = buckets.get(id) ?? { tokens: CAPACITY, updatedAt: now }

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

/** Best-effort client IP from forwarding headers (proxy/CDN in front). */
export function clientIpFromHeaders(headers: Headers): string {
    const cf = headers.get('cf-connecting-ip')
    if (cf) return cf
    const xff = headers.get('x-forwarded-for')
    if (xff) return xff.split(',')[0]?.trim() || 'unknown'
    const real = headers.get('x-real-ip')
    if (real) return real
    return 'unknown'
}
