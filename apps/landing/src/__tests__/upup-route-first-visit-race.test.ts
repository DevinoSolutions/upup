import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { NextRequest } from 'next/server'
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import { proxy } from '@/proxy'

// First-visit race: UploadManager uploads several files in parallel, so a
// brand-new visitor fires concurrent /multipart/init calls with NO cookie yet.
// If each one mints its own identity the browser keeps only the last
// Set-Cookie, and every other file's sign-part/complete is owner-denied (403).
// The proxy mints the cookie on the page load instead, so the race cannot occur.

const SECRET = 'test-upload-token-secret-0123456789abcdef'
const COOKIE = 'upup_demo_sid'
const BASE = 'https://demo.example.test'

type Route = typeof import('@/app/api/upup/[...path]/route')

// Minimal S3 stand-in: CreateMultipartUpload is the only call that reaches the
// network (part URLs are presigned locally).
let s3: Server
let endpoint = ''
let uploadCounter = 0

// The fake echoes the request path back as the object key; escape it so request
// data is never interpolated into the XML response as markup.
const escapeXml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

beforeAll(async () => {
    s3 = createServer((req, res) => {
        const key = decodeURIComponent(
            (req.url ?? '').split('?')[0]!.replace(/^\/[^/]+\//, ''),
        )
        res.setHeader('content-type', 'application/xml')
        res.end(
            `<?xml version="1.0" encoding="UTF-8"?><InitiateMultipartUploadResult><Bucket>demo-bucket</Bucket><Key>${escapeXml(key)}</Key><UploadId>mp-${++uploadCounter}</UploadId></InitiateMultipartUploadResult>`,
        )
    })
    await new Promise<void>(r => s3.listen(0, '127.0.0.1', r))
    endpoint = `http://127.0.0.1:${(s3.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>(r => s3.close(() => r())))

beforeEach(() => {
    vi.stubEnv('UPUP_UPLOAD_TOKEN_SECRET', SECRET)
    vi.stubEnv('S3_BUCKET', 'demo-bucket')
    vi.stubEnv('S3_REGION', 'us-west-004')
    vi.stubEnv('S3_KEY_ID', 'AKIATESTTESTTESTTEST')
    vi.stubEnv('S3_SECRET', 'secretsecretsecretsecretsecretsecretse')
    vi.stubEnv('S3_ENDPOINT', endpoint)
})
afterEach(() => {
    vi.unstubAllEnvs()
})

async function loadRoute(): Promise<Route> {
    vi.resetModules()
    return import('@/app/api/upup/[...path]/route')
}

const post = (route: Route, path: string, body: unknown, cookie?: string) =>
    route.POST(
        new Request(`${BASE}/api/upup/${path}`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-proto': 'https',
                ...(cookie ? { cookie } : {}),
            },
            body: JSON.stringify(body),
        }),
    )

const init = (route: Route, name: string, cookie?: string) =>
    post(
        route,
        'multipart/init',
        { name, type: 'application/zip', size: 12 * 1024 * 1024 },
        cookie,
    )

const signPart = (route: Route, token: string, cookie: string) =>
    post(route, 'multipart/sign-part', { token, partNumber: 1 }, cookie)

const cookieFrom = (res: Response) =>
    res.headers
        .getSetCookie()
        .find(c => c.startsWith(`${COOKIE}=`))
        ?.split(';')[0]

describe('first-visit parallel multipart uploads', { timeout: 30_000 }, () => {
    it('fallback only (no proxy): concurrent cookieless inits get different identities and the earlier token is denied', async () => {
        const route = await loadRoute()
        const [a, b] = await Promise.all([
            init(route, 'a.zip'),
            init(route, 'b.zip'),
        ])
        expect(a.status).toBe(200)
        expect(b.status).toBe(200)
        const cookieA = cookieFrom(a)!
        const cookieB = cookieFrom(b)!
        expect(cookieA).not.toBe(cookieB)

        // The browser keeps the last Set-Cookie; A's token is owner-bound to A.
        const tokenA = ((await a.json()) as { token: string }).token
        const denied = await signPart(route, tokenA, cookieB)
        expect(denied.status).toBe(403)
        expect(((await denied.json()) as { code: string }).code).toBe(
            'AUTH_DENIED',
        )
    })

    it('with the proxy: the page load mints one cookie and every concurrent file keeps working', async () => {
        const route = await loadRoute()

        const pageRes = proxy(
            new NextRequest(`${BASE}/`, {
                headers: { 'x-forwarded-proto': 'https' },
            }),
        )
        const cookie = cookieFrom(pageRes)!

        const inits = await Promise.all(
            ['a.zip', 'b.zip', 'c.zip'].map(n => init(route, n, cookie)),
        )
        for (const res of inits) {
            expect(res.status).toBe(200)
            expect(res.headers.getSetCookie()).toHaveLength(0)
        }
        const bodies = (await Promise.all(inits.map(r => r.json()))) as {
            token: string
            key: string
        }[]
        expect(new Set(bodies.map(b => b.key.split('/')[0])).size).toBe(1)

        const signed = await Promise.all(
            bodies.map(b => signPart(route, b.token, cookie)),
        )
        expect(signed.map(r => r.status)).toEqual([200, 200, 200])
    })

    it('with the proxy on the API path: the route reuses the forwarded cookie instead of minting a second', async () => {
        const route = await loadRoute()
        const res = proxy(
            new NextRequest(`${BASE}/api/upup/multipart/init`, {
                method: 'POST',
                headers: { 'x-forwarded-proto': 'https' },
            }),
        )
        const minted = cookieFrom(res)!
        const forwarded = res.headers.get('x-middleware-request-cookie')!
        expect(forwarded).toBe(minted)

        const routeRes = await init(route, 'a.zip', forwarded)
        expect(routeRes.status).toBe(200)
        expect(routeRes.headers.getSetCookie()).toHaveLength(0)
    })
})
