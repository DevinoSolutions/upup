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
