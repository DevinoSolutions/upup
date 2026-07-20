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

/**
 * Client IP for the rate-limit key. Trust model: the site is fronted by ONE
 * trusted reverse proxy (Dokploy's Traefik), which APPENDS the real peer
 * address as the LAST x-forwarded-for entry. The first entry (and x-real-ip)
 * are client-settable and were a spoofable bypass of the token bucket — never
 * key on them. cf-connecting-ip is honored only when present (Cloudflare
 * overwrites it unconditionally when it is the front door; a direct-to-origin
 * forgery of it still lands in the same per-value bucket, so it cannot widen
 * the limit beyond one extra bucket per forged value).
 */
export function clientIpFromHeaders(headers: Headers): string {
    const cf = headers.get('cf-connecting-ip')
    if (cf) return cf.trim()
    const xff = headers.get('x-forwarded-for')
    if (xff) {
        const hops = xff.split(',')
        return hops[hops.length - 1]?.trim() || 'unknown'
    }
    return 'unknown'
}
