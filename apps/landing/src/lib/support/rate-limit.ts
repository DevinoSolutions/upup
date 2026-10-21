// In-memory per-IP token bucket, adapted from apps/mastra's rate-limit
// middleware (copied + shrunk, not imported — the apps don't share code).
// Capacity refills linearly over the window; each request costs one token.
// Fine for a single-region deploy; swap the Map for a shared store to scale out.

type Bucket = { tokens: number; updatedAt: number }

const CAPACITY = 5
const WINDOW_MS = 60_000
const REFILL_RATE = CAPACITY / WINDOW_MS
/** Hard ceiling on tracked keys, so a flood of distinct (forged or real)
 *  addresses cannot grow the Map without bound. */
export const MAX_BUCKETS = 10_000
/** How often idle buckets are swept out (also swept whenever the cap is hit). */
const SWEEP_INTERVAL_MS = 10_000
/** Longest key kept: an IPv6 literal is at most 45 characters. */
const MAX_KEY_LENGTH = 64

// Insertion order doubles as recency order: a bucket is deleted and re-set on
// every use, so the first key is always the least recently used.
const buckets = new Map<string, Bucket>()
let lastSweepAt = 0

/** Drop every bucket that has refilled to capacity: it is indistinguishable
 *  from a brand-new one, so forgetting it changes no decision. */
function sweep(now: number): void {
    lastSweepAt = now
    for (const [id, bucket] of buckets) {
        const projected = bucket.tokens + (now - bucket.updatedAt) * REFILL_RATE
        if (projected >= CAPACITY) buckets.delete(id)
    }
}

/** Consume one token for `id`. Returns false when the bucket is empty. */
export function takeToken(id: string): boolean {
    const now = Date.now()
    if (now - lastSweepAt >= SWEEP_INTERVAL_MS) sweep(now)

    const existing = buckets.get(id)
    if (!existing && buckets.size >= MAX_BUCKETS) {
        sweep(now)
        // Everything left is still actively limited: evict the least recently
        // used so memory stays bounded.
        while (buckets.size >= MAX_BUCKETS) {
            const oldest = buckets.keys().next().value
            if (oldest === undefined) break
            buckets.delete(oldest)
        }
    }

    const bucket = existing ?? { tokens: CAPACITY, updatedAt: now }
    const elapsed = now - bucket.updatedAt
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsed * REFILL_RATE)
    bucket.updatedAt = now

    buckets.delete(id)
    buckets.set(id, bucket)
    if (bucket.tokens < 1) return false
    bucket.tokens -= 1
    return true
}

/** Test-only: number of tracked buckets. */
export function bucketCountForTests(): number {
    return buckets.size
}

/** Cloudflare is the front door only when the deploy says so. */
function trustsCfConnectingIp(): boolean {
    const flag = process.env.TRUST_CF_CONNECTING_IP
    return flag === '1' || flag === 'true'
}

function bounded(ip: string): string {
    return ip.slice(0, MAX_KEY_LENGTH) || 'unknown'
}

/**
 * Client IP for the rate-limit key. Trust model: the site sits behind
 * Cloudflare and then ONE trusted reverse proxy (Dokploy's Traefik). A request
 * header is only as trustworthy as the hop that wrote it:
 *
 * - `cf-connecting-ip` is written (overwritten) by Cloudflare, so it is the
 *   real client address ONLY when Cloudflare is the front door and the origin
 *   is not reachable around it. Anywhere else it is a plain client-settable
 *   header — a forged value would mint a fresh bucket per request and defeat
 *   the limit — so it is honoured ONLY when `TRUST_CF_CONNECTING_IP=1`.
 * - Otherwise the LAST `x-forwarded-for` entry is used: Traefik APPENDS the peer
 *   address it actually saw. Earlier entries (and `x-real-ip`) are
 *   client-settable and never trusted. Behind Cloudflare without the flag this
 *   is a Cloudflare edge address (coarser, shared buckets), which fails
 *   closed rather than open.
 */
export function clientIpFromHeaders(headers: Headers): string {
    if (trustsCfConnectingIp()) {
        const cf = headers.get('cf-connecting-ip')?.trim()
        if (cf) return bounded(cf)
    }
    const xff = headers.get('x-forwarded-for')
    if (xff) {
        const hops = xff.split(',')
        return bounded(hops[hops.length - 1]?.trim() ?? '')
    }
    return 'unknown'
}
