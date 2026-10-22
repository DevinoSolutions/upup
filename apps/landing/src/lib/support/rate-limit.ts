// In-memory per-IP token bucket, adapted from apps/mastra's rate-limit
// middleware (copied + shrunk, not imported — the apps don't share code).
// Capacity refills linearly over the window; each request costs one token.
// Fine for a single-region deploy; swap the Map for a shared store to scale out.

import { env } from '@/lib/env'
import { isCloudflareIp } from '@/lib/support/cloudflare-ips'

type Bucket = { tokens: number; updatedAt: number }

/** Hard ceiling on tracked keys, so a flood of distinct (forged or real)
 *  addresses cannot grow the Map without bound. */
export const MAX_BUCKETS = 10_000
/** How often idle buckets are swept out (also swept whenever the cap is hit). */
const SWEEP_INTERVAL_MS = 10_000
/** Longest key kept: an IPv6 literal is at most 45 characters. */
const MAX_KEY_LENGTH = 64

export type TokenBucket = {
    /** Consume one token for `id`. Returns false when the bucket is empty. */
    take(id: string): boolean
    /** Test-only: number of tracked buckets. */
    size(): number
}

/** An independent per-key bucket map. Each limiter owns its own state, so one
 *  route's traffic never drains another's allowance. */
export function createTokenBucket(
    capacity: number,
    windowMs: number,
): TokenBucket {
    const refillRate = capacity / windowMs
    // Insertion order doubles as recency order: a bucket is deleted and re-set on
    // every use, so the first key is always the least recently used.
    const buckets = new Map<string, Bucket>()
    let lastSweepAt = 0

    /** Drop every bucket that has refilled to capacity: it is indistinguishable
     *  from a brand-new one, so forgetting it changes no decision. */
    function sweep(now: number): void {
        lastSweepAt = now
        for (const [id, bucket] of buckets) {
            const projected =
                bucket.tokens + (now - bucket.updatedAt) * refillRate
            if (projected >= capacity) buckets.delete(id)
        }
    }

    return {
        take(id) {
            const now = Date.now()
            if (now - lastSweepAt >= SWEEP_INTERVAL_MS) sweep(now)

            const existing = buckets.get(id)
            if (!existing && buckets.size >= MAX_BUCKETS) {
                sweep(now)
                // Everything left is still actively limited: evict the least
                // recently used so memory stays bounded.
                while (buckets.size >= MAX_BUCKETS) {
                    const oldest = buckets.keys().next().value
                    if (oldest === undefined) break
                    buckets.delete(oldest)
                }
            }

            const bucket = existing ?? { tokens: capacity, updatedAt: now }
            const elapsed = now - bucket.updatedAt
            bucket.tokens = Math.min(
                capacity,
                bucket.tokens + elapsed * refillRate,
            )
            bucket.updatedAt = now

            buckets.delete(id)
            buckets.set(id, bucket)
            if (bucket.tokens < 1) return false
            bucket.tokens -= 1
            return true
        },
        size: () => buckets.size,
    }
}

// The support form's limiter: 5 requests per minute per IP.
const supportBucket = createTokenBucket(5, 60_000)

/** Consume one token for `id`. Returns false when the bucket is empty. */
export function takeToken(id: string): boolean {
    return supportBucket.take(id)
}

/** Test-only: number of tracked buckets. */
export function bucketCountForTests(): number {
    return supportBucket.size()
}

/** `TRUST_CF_CONNECTING_IP`: `1`/`true` forces trust in the header (an explicit
 *  operator override, e.g. a tunnel whose peer is not a Cloudflare edge);
 *  `0`/`false` never trusts it; anything else or unset decides per request from
 *  the peer address. */
function cfOverride(): 'force' | 'never' | 'auto' {
    const flag = env.TRUST_CF_CONNECTING_IP
    if (flag === '1' || flag === 'true') return 'force'
    if (flag === '0' || flag === 'false') return 'never'
    return 'auto'
}

function bounded(ip: string): string {
    return ip.slice(0, MAX_KEY_LENGTH) || 'unknown'
}

/**
 * Client IP for the rate-limit key. Trust model: the site sits behind
 * Cloudflare and then ONE trusted reverse proxy (Dokploy's Traefik), which
 * APPENDS the address of the peer it actually saw as the LAST `x-forwarded-for`
 * entry. That peer is the only address here a client cannot choose. Earlier
 * entries and `x-real-ip` are client-settable and never trusted.
 *
 * `cf-connecting-ip` is written by Cloudflare and nobody else, so it is the real
 * client address only when the request really came through Cloudflare. A direct
 * hit on the origin can carry any value in it, so it is honoured ONLY when that
 * last hop (the immediate peer) is inside Cloudflare's published ranges (see
 * cloudflare-ips.ts), or when `TRUST_CF_CONNECTING_IP=1` overrides that check.
 * Otherwise the peer address itself is the key, which fails closed: a forged
 * header cannot mint buckets.
 */
export function clientIpFromHeaders(headers: Headers): string {
    const xff = headers.get('x-forwarded-for')
    const peer = xff ? (xff.split(',').pop()?.trim() ?? '') : ''

    const override = cfOverride()
    if (override !== 'never') {
        const cf = headers.get('cf-connecting-ip')?.trim()
        if (cf && (override === 'force' || (peer && isCloudflareIp(peer)))) {
            return bounded(cf)
        }
    }
    return peer ? bounded(peer) : 'unknown'
}
