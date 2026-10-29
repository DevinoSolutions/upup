// T-6184: the route is where withVaryOrigin, withDemoRateLimit and
// withDemoVisitor are composed. The unit tests prove each wrapper alone; this
// one imports the REAL route module so dropping `withVaryOrigin` from it (or
// moving it inside the limiter, which would leave the limiter's own 429
// without the header) turns red. Only the env and the upload handler factory
// are replaced - the wrappers and the rate-limit bucket are the real ones.
import { describe, expect, it, vi } from 'vitest'

const SECRET = vi.hoisted(() => 'route-test-secret-route-test-secret')

vi.mock('@/lib/env', () => ({
    env: {
        S3_BUCKET: 'bucket',
        S3_REGION: 'region',
        S3_KEY_ID: 'key',
        S3_SECRET: 'secret',
        S3_ENDPOINT: 'https://s3.example.test',
    },
    requireServerEnv: () => ({ UPUP_UPLOAD_TOKEN_SECRET: SECRET }),
}))

vi.mock('@useupup/server', () => ({ InMemoryTokenStore: class {} }))

const inner = vi.hoisted(() => {
    const respond = async () => new Response('ok', { status: 200 })
    return { GET: respond, POST: respond, PUT: respond, DELETE: respond }
})
vi.mock('@useupup/server/next', () => ({
    createUpupNextHandler: () => inner,
}))

async function loadRoute() {
    // Fresh module graph: the route caches its handler and the limiter keeps
    // its buckets at module level.
    vi.resetModules()
    return import('@/app/api/upup/[...path]/route')
}

function request(method: string, path: string, ip: string): Request {
    return new Request(`https://useupup.com/api/upup${path}`, {
        method,
        headers: { 'x-forwarded-for': ip },
    })
}

describe('demo upload route Vary: Origin (T-6184)', () => {
    it.each(['GET', 'POST', 'PUT', 'DELETE'] as const)(
        'carries Vary: Origin on a pass-through %s',
        async method => {
            const route = await loadRoute()
            const res = await route[method](
                request(method, '/multipart/sign-part', '203.0.113.50'),
            )
            expect(res.status).toBe(200)
            expect(res.headers.get('vary')).toBe('Origin')
        },
    )

    it('carries Vary: Origin on the 429 the limiter answers itself', async () => {
        const route = await loadRoute()
        const { DEMO_RATE_LIMIT } = await import('@/lib/demo-rate-limit')
        for (let i = 0; i < DEMO_RATE_LIMIT.capacity; i++) {
            const res = await route.POST(
                request('POST', '/presign', '203.0.113.51'),
            )
            expect(res.status).toBe(200)
        }
        const limited = await route.POST(
            request('POST', '/presign', '203.0.113.51'),
        )
        expect(limited.status).toBe(429)
        expect(limited.headers.get('vary')).toBe('Origin')
    })
})
