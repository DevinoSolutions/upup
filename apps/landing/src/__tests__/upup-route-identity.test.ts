import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The landing demo route is a PUBLIC, anonymous upload/drive surface. Without a
// per-visitor identity every caller resolved to the shared "default" user, so a
// Drive one visitor connected was listable and transferable by any other. These
// tests drive the REAL route module (and the real @useupup/server handler behind
// it) and read the visitor identity off the presign key namespace, so they prove
// the whole chain: signed cookie -> internal header -> getUserId -> key owner.

const SECRET = 'test-upload-token-secret-0123456789abcdef'
const COOKIE = 'upup_demo_sid'
const BASE = 'https://demo.example.test/api/upup'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const sign = (id: string) =>
    createHmac('sha256', SECRET)
        .update(`upup-demo-sid:${id}`)
        .digest('base64url')

type Route = typeof import('@/app/api/upup/[...path]/route')

async function loadRoute(): Promise<Route> {
    vi.resetModules()
    return import('@/app/api/upup/[...path]/route')
}

function presign(
    route: Route,
    init: {
        cookie?: string
        headers?: Record<string, string>
        size?: number
    } = {},
) {
    const headers: Record<string, string> = {
        'content-type': 'application/json',
        ...(init.cookie ? { cookie: init.cookie } : {}),
        ...init.headers,
    }
    return route.POST(
        new Request(`${BASE}/presign`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'a.txt',
                type: 'text/plain',
                size: init.size ?? 10,
            }),
        }),
    )
}

const setCookies = (res: Response) => res.headers.getSetCookie()
const sidFrom = (res: Response) => {
    const raw = setCookies(res).find(c => c.startsWith(`${COOKIE}=`))
    return raw?.slice(COOKIE.length + 1).split(';')[0]
}
const ownerOf = async (res: Response) =>
    ((await res.json()) as { key: string }).key.split('/')[0]

beforeEach(() => {
    vi.stubEnv('UPUP_UPLOAD_TOKEN_SECRET', SECRET)
    vi.stubEnv('S3_BUCKET', 'demo-bucket')
    vi.stubEnv('S3_REGION', 'us-west-004')
    vi.stubEnv('S3_KEY_ID', 'AKIATESTTESTTESTTEST')
    vi.stubEnv('S3_SECRET', 'secretsecretsecretsecretsecretsecretse')
    vi.stubEnv('S3_ENDPOINT', 'https://s3.us-west-004.example.test')
})

afterEach(() => {
    vi.unstubAllEnvs()
})

// Each test cold-imports the route (resetModules) and with it the S3 SDK, which
// can exceed the 5 s default when the whole landing suite runs in parallel.
describe('landing demo route visitor identity', { timeout: 30_000 }, () => {
    it('issues a signed, scoped cookie on first contact', async () => {
        const route = await loadRoute()
        const res = await presign(route, {
            headers: { 'x-forwarded-proto': 'https' },
        })
        expect(res.status).toBe(200)

        const cookies = setCookies(res)
        expect(cookies).toHaveLength(1)
        const cookie = cookies[0]!
        expect(cookie).toMatch(new RegExp(`^${COOKIE}=`))
        expect(cookie).toContain('HttpOnly')
        expect(cookie).toContain('SameSite=Lax')
        expect(cookie).toContain('Path=/api/upup')
        expect(cookie).toContain('Max-Age=604800')
        expect(cookie).toContain('Secure')

        const [id, mac] = sidFrom(res)!.split('.')
        expect(id).toMatch(UUID)
        expect(mac).toBe(sign(id!))
        expect(await ownerOf(res)).toBe(id)
    })

    it('omits Secure on plain-http local dev', async () => {
        const route = await loadRoute()
        const res = await route.GET(
            new Request('http://localhost:3000/api/upup/health'),
        )
        const cookie = setCookies(res)[0]!
        expect(cookie).toMatch(new RegExp(`^${COOKIE}=`))
        expect(cookie).not.toContain('Secure')
    })

    it('sets Secure when a trusted proxy says the client used https', async () => {
        const route = await loadRoute()
        const res = await route.GET(
            new Request('http://localhost:3000/api/upup/health', {
                headers: { 'x-forwarded-proto': 'https' },
            }),
        )
        expect(setCookies(res)[0]!).toContain('Secure')
    })

    it('reuses a valid cookie without issuing a new one', async () => {
        const route = await loadRoute()
        const first = await presign(route)
        const sid = sidFrom(first)!
        const second = await presign(route, { cookie: `${COOKIE}=${sid}` })

        expect(second.status).toBe(200)
        expect(setCookies(second)).toHaveLength(0)
        expect(await ownerOf(second)).toBe(sid.split('.')[0])
    })

    it('replaces a forged or tampered cookie with a fresh identity', async () => {
        const route = await loadRoute()
        const victim = sidFrom(await presign(route))!
        const [victimId] = victim.split('.')

        const forged = [
            `${victimId}.${sign('someone-else')}`,
            `${victimId}.AAAA`,
            `${victimId}`,
            `${victimId}.`,
            `.${sign('x')}`,
            `${victimId}.${sign(victimId!)}x`,
        ]
        for (const value of forged) {
            const res = await presign(route, { cookie: `${COOKIE}=${value}` })
            expect(res.status).toBe(200)
            const issued = sidFrom(res)
            expect(issued, `forged "${value}" must be re-minted`).toBeTruthy()
            const [freshId] = issued!.split('.')
            expect(freshId).not.toBe(victimId)
            expect(await ownerOf(res)).toBe(freshId)
        }
    })

    it('ignores a client-supplied x-upup-visitor header', async () => {
        const route = await loadRoute()

        // No cookie: the spoofed header must not become the identity.
        const anon = await presign(route, {
            headers: { 'x-upup-visitor': 'victim-id' },
        })
        const anonId = sidFrom(anon)!.split('.')[0]
        expect(anonId).not.toBe('victim-id')
        expect(await ownerOf(anon)).toBe(anonId)

        // Valid cookie for A plus a spoofed header naming B: A wins.
        const a = sidFrom(await presign(route))!
        const spoofed = await presign(route, {
            cookie: `${COOKIE}=${a}`,
            headers: { 'x-upup-visitor': 'victim-id' },
        })
        expect(await ownerOf(spoofed)).toBe(a.split('.')[0])
    })

    it('gives two cookieless visitors different identities', async () => {
        const route = await loadRoute()
        const [one, two] = await Promise.all([presign(route), presign(route)])
        const ownerOne = await ownerOf(one)
        const ownerTwo = await ownerOf(two)
        expect(ownerOne).toMatch(UUID)
        expect(ownerTwo).toMatch(UUID)
        expect(ownerOne).not.toBe(ownerTwo)
        expect(ownerOne).not.toBe('default')
    })

    it('rejects an oversized presign with a 4xx', async () => {
        const route = await loadRoute()
        const res = await presign(route, { size: 100 * 1024 * 1024 + 1 })
        expect(res.status).toBe(413)
        const ok = await presign(route, { size: 100 * 1024 * 1024 })
        expect(ok.status).toBe(200)
    })

    it('carries a streamed request body through the identity wrapper', async () => {
        const route = await loadRoute()
        const payload = JSON.stringify({
            name: 'stream.txt',
            type: 'text/plain',
            size: 7,
        })
        const bytes = new TextEncoder().encode(payload)
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(bytes.slice(0, 10))
                controller.enqueue(bytes.slice(10))
                controller.close()
            },
        })
        const res = await route.POST(
            new Request(`${BASE}/presign`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body,
                duplex: 'half',
            } as RequestInit & { duplex: 'half' }),
        )
        expect(res.status).toBe(200)
        const { key } = (await res.json()) as { key: string }
        expect(key.endsWith('/stream.txt')).toBe(true)
    })
})
