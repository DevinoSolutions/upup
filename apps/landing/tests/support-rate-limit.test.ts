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

    it('honours cf-connecting-ip when the immediate peer is a Cloudflare edge (no flag needed)', async () => {
        const { clientIpFromHeaders } = await load()
        const h = headers({
            'cf-connecting-ip': '198.51.100.9',
            'x-forwarded-for': '1.1.1.1, 172.70.0.5',
        })
        expect(clientIpFromHeaders(h)).toBe('198.51.100.9')
    })

    it('honours cf-connecting-ip from an IPv6 Cloudflare edge peer', async () => {
        const { clientIpFromHeaders } = await load()
        const h = headers({
            'cf-connecting-ip': '2001:db8::7',
            'x-forwarded-for': '2606:4700:4700::1111',
        })
        expect(clientIpFromHeaders(h)).toBe('2001:db8::7')
    })

    it('a forged cf-connecting-ip from a non-Cloudflare peer is ignored: the peer IP is used', async () => {
        const { clientIpFromHeaders } = await load()
        for (const peer of [
            '203.0.113.7',
            '104.15.255.255', // just below 104.16.0.0/13
            '104.32.0.0', // just above 104.24.0.0/14
            '2606:4701::1', // outside 2606:4700::/32
            '::1',
        ]) {
            const h = headers({
                'cf-connecting-ip': '198.51.100.9',
                'x-forwarded-for': `9.9.9.9, ${peer}`,
            })
            expect(clientIpFromHeaders(h)).toBe(peer)
        }
    })

    it('treats an IPv4-mapped IPv6 peer by its IPv4 address', async () => {
        const { clientIpFromHeaders } = await load()
        const edge = headers({
            'cf-connecting-ip': '198.51.100.9',
            'x-forwarded-for': '::ffff:172.70.0.5',
        })
        expect(clientIpFromHeaders(edge)).toBe('198.51.100.9')
        const other = headers({
            'cf-connecting-ip': '198.51.100.9',
            'x-forwarded-for': '::ffff:203.0.113.7',
        })
        expect(clientIpFromHeaders(other)).toBe('::ffff:203.0.113.7')
    })

    it('ignores a cf-connecting-ip when there is no peer to vouch for it', async () => {
        const { clientIpFromHeaders } = await load()
        expect(
            clientIpFromHeaders(
                headers({ 'cf-connecting-ip': '198.51.100.9' }),
            ),
        ).toBe('unknown')
    })

    it('TRUST_CF_CONNECTING_IP=1 is an explicit override: trusted even from a non-Cloudflare peer (e.g. a tunnel)', async () => {
        vi.stubEnv('TRUST_CF_CONNECTING_IP', '1')
        const { clientIpFromHeaders } = await load()
        const h = headers({
            'cf-connecting-ip': '198.51.100.9',
            'x-forwarded-for': '10.0.0.2',
        })
        expect(clientIpFromHeaders(h)).toBe('198.51.100.9')
    })

    it('TRUST_CF_CONNECTING_IP=0 never trusts it, even from a Cloudflare peer', async () => {
        vi.stubEnv('TRUST_CF_CONNECTING_IP', '0')
        const { clientIpFromHeaders } = await load()
        const h = headers({
            'cf-connecting-ip': '198.51.100.9',
            'x-forwarded-for': '172.70.0.5',
        })
        expect(clientIpFromHeaders(h)).toBe('172.70.0.5')
    })

    it('falls back to the last x-forwarded-for hop when the override is on but the header is absent', async () => {
        vi.stubEnv('TRUST_CF_CONNECTING_IP', '1')
        const { clientIpFromHeaders } = await load()
        expect(
            clientIpFromHeaders(
                headers({ 'x-forwarded-for': '1.1.1.1, 9.9.9.9' }),
            ),
        ).toBe('9.9.9.9')
    })

    it.each(['0', 'false', '', 'yes'])(
        'TRUST_CF_CONNECTING_IP=%j is not the override (only "1"/"true" is) and a non-Cloudflare peer stays untrusted',
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

    it('a forged cf-connecting-ip does not mint new buckets from a non-Cloudflare peer', async () => {
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

describe('Cloudflare range matching (T-5466)', () => {
    it.each([
        ['173.245.48.0', true],
        ['173.245.63.255', true],
        ['173.245.64.0', false],
        ['162.158.0.1', true],
        ['162.159.255.255', true],
        ['162.160.0.0', false],
        ['131.0.72.1', true],
        ['131.0.76.0', false],
        ['198.41.255.255', true],
        ['1.1.1.1', false],
        ['2400:cb00::1', true],
        ['2400:cb01::1', false],
        ['2a06:98c0:ffff::1', true],
        ['2a06:98c8::1', false],
        ['2c0f:f248:0:0:0:0:0:1', true],
        ['2606:4700:abcd::', true],
        ['not-an-ip', false],
        ['', false],
        ['1.2.3', false],
        ['999.1.1.1', false],
    ])('isCloudflareIp(%j) is %s', async (ip, expected) => {
        const { isCloudflareIp } = await import('@/lib/support/cloudflare-ips')
        expect(isCloudflareIp(ip)).toBe(expected)
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
