// T-5466: the support route's per-IP rate limit must not be forgeable and its
// bucket map must not grow without bound.
//
// - cf-connecting-ip is a plain request header: only Cloudflare overwrites it,
//   so it is honoured ONLY when TRUST_CF_CONNECTING_IP says Cloudflare is the
//   front door. Otherwise a direct-to-origin client could mint a fresh bucket
//   per forged value and never be limited.
// - the buckets Map is pruned of full (idle) buckets and hard-capped.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function load() {
    vi.resetModules()
    return import('@/lib/support/rate-limit')
}

const headers = (init: Record<string, string>) => new Headers(init)

describe('clientIpFromHeaders (T-5466)', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('ignores cf-connecting-ip unless Cloudflare is declared as the front door', async () => {
        const { clientIpFromHeaders } = await load()
        const h = headers({
            'cf-connecting-ip': '198.51.100.9',
            'x-forwarded-for': '1.1.1.1, 203.0.113.7',
        })
        expect(clientIpFromHeaders(h)).toBe('203.0.113.7')
    })

    it('honours cf-connecting-ip when TRUST_CF_CONNECTING_IP=1', async () => {
        vi.stubEnv('TRUST_CF_CONNECTING_IP', '1')
        const { clientIpFromHeaders } = await load()
        const h = headers({
            'cf-connecting-ip': '198.51.100.9',
            'x-forwarded-for': '1.1.1.1, 172.70.0.5',
        })
        expect(clientIpFromHeaders(h)).toBe('198.51.100.9')
    })

    it('falls back to the last x-forwarded-for hop when the flag is on but the header is absent', async () => {
        vi.stubEnv('TRUST_CF_CONNECTING_IP', '1')
        const { clientIpFromHeaders } = await load()
        expect(
            clientIpFromHeaders(
                headers({ 'x-forwarded-for': '1.1.1.1, 9.9.9.9' }),
            ),
        ).toBe('9.9.9.9')
    })

    it.each(['0', 'false', '', 'yes'])(
        'TRUST_CF_CONNECTING_IP=%j does not enable it (only "1"/"true")',
        async value => {
            vi.stubEnv('TRUST_CF_CONNECTING_IP', value)
            const { clientIpFromHeaders } = await load()
            const h = headers({
                'cf-connecting-ip': '198.51.100.9',
                'x-forwarded-for': '203.0.113.7',
            })
            expect(clientIpFromHeaders(h)).toBe('203.0.113.7')
        },
    )

    it('a forged cf-connecting-ip does not mint new buckets when the flag is off', async () => {
        const { clientIpFromHeaders, takeToken } = await load()
        const results: boolean[] = []
        for (let i = 0; i < 8; i++) {
            const ip = clientIpFromHeaders(
                headers({
                    'cf-connecting-ip': `10.0.0.${i}`,
                    'x-forwarded-for': '203.0.113.7',
                }),
            )
            results.push(takeToken(ip))
        }
        // capacity 5: requests 6..8 are refused despite 8 distinct forged values
        expect(results.filter(Boolean)).toHaveLength(5)
        expect(results.slice(5)).toEqual([false, false, false])
    })

    it('bounds the length of an attacker-supplied address', async () => {
        const { clientIpFromHeaders } = await load()
        const ip = clientIpFromHeaders(
            headers({ 'x-forwarded-for': `1.1.1.1, ${'a'.repeat(5000)}` }),
        )
        expect(ip.length).toBeLessThanOrEqual(64)
    })

    it('is "unknown" with no usable header', async () => {
        const { clientIpFromHeaders } = await load()
        expect(clientIpFromHeaders(headers({}))).toBe('unknown')
    })
})

describe('takeToken bucket pruning (T-5466)', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-10-21T12:00:00Z'))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('drops buckets that have fully refilled', async () => {
        const { takeToken, bucketCountForTests } = await load()
        for (let i = 0; i < 50; i++) takeToken(`ip-${i}`)
        expect(bucketCountForTests()).toBe(50)

        vi.advanceTimersByTime(120_000)
        takeToken('fresh')
        expect(bucketCountForTests()).toBe(1)
    })

    it('keeps a still-limited bucket through pruning', async () => {
        const { takeToken, bucketCountForTests } = await load()
        for (let i = 0; i < 5; i++) expect(takeToken('hot')).toBe(true)
        expect(takeToken('hot')).toBe(false)

        vi.advanceTimersByTime(12_000) // refills exactly 1 token, still far from full
        takeToken('other')
        expect(bucketCountForTests()).toBe(2)
        expect(takeToken('hot')).toBe(true)
        expect(takeToken('hot')).toBe(false)
    })

    it('hard-caps the map when every bucket is live (flood of distinct keys)', async () => {
        const { takeToken, bucketCountForTests, MAX_BUCKETS } = await load()
        for (let i = 0; i < MAX_BUCKETS + 500; i++) takeToken(`flood-${i}`)
        expect(bucketCountForTests()).toBeLessThanOrEqual(MAX_BUCKETS)
    })
})
