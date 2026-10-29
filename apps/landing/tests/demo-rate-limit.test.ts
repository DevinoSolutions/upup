// T-6184: the demo upload route mints a fresh visitor id for a cookieless
// client, so the visitor id is no brake on /presign and /multipart/init. A
// per-IP bucket on those two session-creating routes is.
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function load() {
    vi.resetModules()
    return import('@/lib/demo-rate-limit')
}

const ok = vi.fn(async (_req: Request) => new Response('ok', { status: 200 }))

function call(method: string, path: string, ip: string): Request {
    return new Request(`https://useupup.com/api/upup${path}`, {
        method,
        headers: { 'x-forwarded-for': ip },
    })
}

const post = (path: string, ip: string) => call('POST', path, ip)

describe('withDemoRateLimit (T-6184)', () => {
    beforeEach(() => {
        ok.mockClear()
    })

    it('allows the burst then answers 429 with Retry-After and a JSON error', async () => {
        const { withDemoRateLimit, DEMO_RATE_LIMIT } = await load()
        const handle = withDemoRateLimit(ok)
        for (let i = 0; i < DEMO_RATE_LIMIT.capacity; i++) {
            const res = await handle(post('/presign', '203.0.113.1'))
            expect(res.status).toBe(200)
        }
        const res = await handle(post('/presign', '203.0.113.1'))
        expect(res.status).toBe(429)
        expect(res.headers.get('retry-after')).toBe('60')
        expect(res.headers.get('content-type')).toContain('application/json')
        expect(await res.json()).toMatchObject({
            error: expect.any(String),
            code: 'RATE_LIMITED',
        })
        expect(ok).toHaveBeenCalledTimes(DEMO_RATE_LIMIT.capacity)
    })

    it('shares one budget across presign and multipart/init for the same IP', async () => {
        const { withDemoRateLimit, DEMO_RATE_LIMIT } = await load()
        const handle = withDemoRateLimit(ok)
        for (let i = 0; i < DEMO_RATE_LIMIT.capacity; i++) {
            await handle(
                post(i % 2 ? '/presign' : '/multipart/init', '203.0.113.2'),
            )
        }
        const res = await handle(post('/multipart/init', '203.0.113.2'))
        expect(res.status).toBe(429)
    })

    it('does not limit a different IP', async () => {
        const { withDemoRateLimit, DEMO_RATE_LIMIT } = await load()
        const handle = withDemoRateLimit(ok)
        for (let i = 0; i <= DEMO_RATE_LIMIT.capacity; i++) {
            await handle(post('/presign', '203.0.113.3'))
        }
        const res = await handle(post('/presign', '203.0.113.4'))
        expect(res.status).toBe(200)
    })

    it('never limits sign-part, complete, abort or drive routes', async () => {
        const { withDemoRateLimit, DEMO_RATE_LIMIT } = await load()
        const handle = withDemoRateLimit(ok)
        for (let i = 0; i <= DEMO_RATE_LIMIT.capacity; i++) {
            await handle(post('/presign', '203.0.113.5'))
        }
        for (const path of [
            '/multipart/sign-part',
            '/multipart/complete',
            '/multipart/abort',
            '/drive/google-drive/list',
        ]) {
            const res = await handle(post(path, '203.0.113.5'))
            expect(res.status).toBe(200)
        }
    })

    it('only limits POST (a GET to /presign passes through)', async () => {
        const { withDemoRateLimit, DEMO_RATE_LIMIT } = await load()
        const handle = withDemoRateLimit(ok)
        for (let i = 0; i <= DEMO_RATE_LIMIT.capacity; i++) {
            await handle(post('/presign', '203.0.113.6'))
        }
        const res = await handle(call('GET', '/presign', '203.0.113.6'))
        expect(res.status).toBe(200)
    })
})

describe('withDemoRateLimit trailing slashes (T-6184)', () => {
    // The server handler strips trailing slashes before routing and landing
    // sets trailingSlash: true, so these reach the handler as /presign etc.
    it.each(['/presign/', '/presign//', '/multipart/init/'])(
        'counts %s toward the limit',
        async path => {
            const { withDemoRateLimit, DEMO_RATE_LIMIT } = await load()
            const handle = withDemoRateLimit(ok)
            for (let i = 0; i < DEMO_RATE_LIMIT.capacity; i++) {
                const res = await handle(post(path, '203.0.113.7'))
                expect(res.status).toBe(200)
            }
            const res = await handle(post(path, '203.0.113.7'))
            expect(res.status).toBe(429)
        },
    )
})

describe('withDemoRateLimit client keying (T-6184)', () => {
    async function exhaust(ip: string) {
        const { withDemoRateLimit, DEMO_RATE_LIMIT } = await load()
        const handle = withDemoRateLimit(ok)
        for (let i = 0; i < DEMO_RATE_LIMIT.capacity; i++) {
            const res = await handle(post('/presign', ip))
            expect(res.status).toBe(200)
        }
        return handle
    }

    it('shares one bucket across IPv6 addresses in the same /64', async () => {
        const handle = await exhaust('2001:db8:1:2::1')
        for (const sibling of [
            '2001:db8:1:2:ffff:ffff:ffff:ffff',
            '2001:DB8:1:2:abcd::9',
            '[2001:db8:1:2::7]',
        ]) {
            const res = await handle(post('/presign', sibling))
            expect(res.status).toBe(429)
        }
    })

    it('does not share a bucket across different /64s', async () => {
        const handle = await exhaust('2001:db8:1:2::1')
        const res = await handle(post('/presign', '2001:db8:1:3::1'))
        expect(res.status).toBe(200)
    })

    it('counts an IPv4-mapped IPv6 address against the plain IPv4 bucket', async () => {
        const handle = await exhaust('203.0.113.20')
        for (const mapped of ['::ffff:203.0.113.20', '::ffff:cb00:7114']) {
            const res = await handle(post('/presign', mapped))
            expect(res.status).toBe(429)
        }
    })

    it('does not exempt a client that sends a session cookie', async () => {
        const handle = await exhaust('203.0.113.21')
        const res = await handle(
            new Request('https://useupup.com/api/upup/presign', {
                method: 'POST',
                headers: {
                    'x-forwarded-for': '203.0.113.21',
                    cookie: 'upup_demo_sid=11111111-1111-4111-8111-111111111111.forged',
                },
            }),
        )
        expect(res.status).toBe(429)
    })
})

describe('withVaryOrigin (T-6184)', () => {
    async function loadVary() {
        return import('@/lib/demo-vary-origin')
    }

    it('adds Vary: Origin to a response that has none', async () => {
        const { withVaryOrigin } = await loadVary()
        const res = await withVaryOrigin(ok)(post('/presign', '203.0.113.30'))
        expect(res.headers.get('vary')).toBe('Origin')
        expect(res.status).toBe(200)
    })

    it('appends Origin to an existing Vary without dropping its tokens', async () => {
        const { withVaryOrigin } = await loadVary()
        const res = await withVaryOrigin(
            async () =>
                new Response('ok', { headers: { vary: 'Accept-Encoding' } }),
        )(post('/presign', '203.0.113.31'))
        expect(res.headers.get('vary')).toBe('Accept-Encoding, Origin')
    })

    it.each(['Origin', 'accept-encoding, ORIGIN', '*'])(
        'leaves an existing Vary of %s untouched',
        async vary => {
            const { withVaryOrigin } = await loadVary()
            const res = await withVaryOrigin(
                async () => new Response('ok', { headers: { vary } }),
            )(post('/presign', '203.0.113.32'))
            expect(res.headers.get('vary')).toBe(vary)
        },
    )

    it('keeps status and Location of a response with immutable headers', async () => {
        const { withVaryOrigin } = await loadVary()
        const res = await withVaryOrigin(async () =>
            Response.redirect('https://useupup.com/done', 302),
        )(post('/presign', '203.0.113.33'))
        expect(res.status).toBe(302)
        expect(res.headers.get('location')).toBe('https://useupup.com/done')
        expect(res.headers.get('vary')).toBe('Origin')
    })

    it('covers the 429 the rate limiter answers itself', async () => {
        const { withDemoRateLimit, DEMO_RATE_LIMIT } = await load()
        const { withVaryOrigin } = await loadVary()
        const handle = withVaryOrigin(withDemoRateLimit(ok))
        for (let i = 0; i < DEMO_RATE_LIMIT.capacity; i++) {
            await handle(post('/presign', '203.0.113.34'))
        }
        const res = await handle(post('/presign', '203.0.113.34'))
        expect(res.status).toBe(429)
        expect(res.headers.get('vary')).toBe('Origin')
        expect(res.headers.get('retry-after')).toBe('60')
    })
})
