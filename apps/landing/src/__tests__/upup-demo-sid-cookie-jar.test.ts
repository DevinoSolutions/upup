import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { proxy } from '@/proxy'

// The unit tests elsewhere replay a cookie by hand, so they never model the
// browser rule that decides whether a cookie is SENT: RFC 6265 path matching.
// With `Path=/api/upup` the sid was never sent on page / RSC requests, so the
// proxy re-minted a new identity on every navigation. This jar applies
// Set-Cookie with its Path (and Max-Age=0 deletion) and replays only the
// cookies a real browser would, so the whole page -> page -> API journey is
// exercised through the real proxy and the real route.

const SECRET = 'test-upload-token-secret-0123456789abcdef'
const COOKIE = 'upup_demo_sid'
const ORIGIN = 'https://demo.example.test'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const sign = (id: string) =>
    createHmac('sha256', SECRET)
        .update(`upup-demo-sid:${id}`)
        .digest('base64url')

type Entry = { name: string; value: string; path: string }

class CookieJar {
    entries: Entry[] = []

    apply(setCookies: string[]) {
        for (const raw of setCookies) {
            const [pair, ...attrs] = raw.split(';').map(s => s.trim())
            const eq = pair!.indexOf('=')
            const name = pair!.slice(0, eq)
            const value = pair!.slice(eq + 1)
            let path = '/'
            let maxAge: number | undefined
            for (const a of attrs) {
                const [k, v] = a.split('=')
                if (k!.toLowerCase() === 'path') path = v!
                if (k!.toLowerCase() === 'max-age') maxAge = Number(v)
            }
            this.entries = this.entries.filter(
                e => !(e.name === name && e.path === path),
            )
            if (maxAge === undefined || maxAge > 0) {
                this.entries.push({ name, value, path })
            }
        }
    }

    /** RFC 6265 5.1.4 path-match; longer paths are listed first. */
    header(requestPath: string): string | undefined {
        const matches = this.entries
            .filter(
                e =>
                    requestPath === e.path ||
                    (requestPath.startsWith(e.path) &&
                        (e.path.endsWith('/') ||
                            requestPath[e.path.length] === '/')),
            )
            .sort((a, b) => b.path.length - a.path.length)
        return matches.length
            ? matches.map(e => `${e.name}=${e.value}`).join('; ')
            : undefined
    }
}

/** One proxied navigation; applies whatever the proxy sets. */
function navigate(jar: CookieJar, path: string) {
    const cookie = jar.header(path.split('?')[0]!)
    const res = proxy(
        new NextRequest(`${ORIGIN}${path}`, {
            headers: {
                'x-forwarded-proto': 'https',
                ...(cookie ? { cookie } : {}),
            },
        }),
    )
    jar.apply(res.headers.getSetCookie())
    return res
}

type Route = typeof import('@/app/api/upup/[...path]/route')

async function presignOwner(route: Route, jar: CookieJar) {
    const path = '/api/upup/presign'
    const cookie = jar.header(path)
    const res = await route.POST(
        new Request(`${ORIGIN}${path}`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-proto': 'https',
                ...(cookie ? { cookie } : {}),
            },
            body: JSON.stringify({
                name: 'a.txt',
                type: 'text/plain',
                size: 5,
            }),
        }),
    )
    expect(res.status).toBe(200)
    jar.apply(res.headers.getSetCookie())
    return ((await res.json()) as { key: string }).key.split('/')[0]!
}

const sids = (jar: CookieJar) =>
    jar.entries.filter(e => e.name === COOKIE).map(e => e.value)

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

async function loadRoute(): Promise<Route> {
    vi.resetModules()
    return import('@/app/api/upup/[...path]/route')
}

describe(
    'demo sid under browser cookie path matching',
    { timeout: 30_000 },
    () => {
        it('keeps ONE stable sid across page, page, then API requests', async () => {
            const route = await loadRoute()
            const jar = new CookieJar()

            navigate(jar, '/')
            const [first] = sids(jar)
            expect(first).toBeTruthy()

            navigate(jar, '/docs/getting-started')
            navigate(jar, '/react?_rsc=abc')
            expect(sids(jar)).toEqual([first])

            const owner = await presignOwner(route, jar)
            expect(owner).toBe(first!.split('.')[0])
            expect(sids(jar)).toEqual([first])
        })

        it('mints a valid signed Path=/ cookie with the original flags', () => {
            const jar = new CookieJar()
            const res = navigate(jar, '/')
            const cookie = res.headers
                .getSetCookie()
                .find(
                    c => c.startsWith(`${COOKIE}=`) && !c.includes('Max-Age=0'),
                )!
            expect(cookie).toContain('Path=/;')
            expect(cookie).toContain('HttpOnly')
            expect(cookie).toContain('SameSite=Lax')
            expect(cookie).toContain('Max-Age=604800')
            expect(cookie).toContain('Secure')
            const [id, mac] = sids(jar)[0]!.split('.')
            expect(id).toMatch(UUID)
            expect(mac).toBe(sign(id!))
        })

        it('replaces a legacy Path=/api/upup cookie without ever sending two', async () => {
            const route = await loadRoute()
            const legacyId = '11111111-2222-4333-8444-555555555555'
            const jar = new CookieJar()
            jar.entries.push({
                name: COOKIE,
                value: `${legacyId}.${sign(legacyId)}`,
                path: '/api/upup',
            })

            // Pages never carried the legacy cookie, so the proxy mints a new sid
            // and must clear the legacy one in the same response.
            navigate(jar, '/')
            expect(
                jar.entries.filter(e => e.path === '/api/upup'),
            ).toHaveLength(0)
            expect(sids(jar)).toHaveLength(1)
            const [stable] = sids(jar)

            navigate(jar, '/docs')
            const header = jar.header('/api/upup/presign')!
            expect(
                header.split(';').filter(c => c.includes(COOKIE)),
            ).toHaveLength(1)
            expect(await presignOwner(route, jar)).toBe(stable!.split('.')[0])
        })

        it('picks the valid sid when a request carries two cookies of that name', async () => {
            const route = await loadRoute()
            const goodId = '11111111-2222-4333-8444-555555555555'
            const res = await route.POST(
                new Request(`${ORIGIN}/api/upup/presign`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-forwarded-proto': 'https',
                        cookie: `${COOKIE}=forged.garbage; ${COOKIE}=${goodId}.${sign(goodId)}`,
                    },
                    body: JSON.stringify({
                        name: 'a.txt',
                        type: 'text/plain',
                        size: 5,
                    }),
                }),
            )
            expect(res.status).toBe(200)
            expect(res.headers.getSetCookie()).toHaveLength(0)
            expect(
                ((await res.json()) as { key: string }).key.split('/')[0],
            ).toBe(goodId)
        })
    },
)
