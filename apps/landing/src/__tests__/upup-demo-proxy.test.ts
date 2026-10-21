import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FRAMEWORK_IDS } from '@/lib/frameworks'
import { config, proxy } from '@/proxy'

// src/proxy.ts mints the signed upup_demo_sid cookie on page loads (and on
// /api/upup/*) BEFORE the uploader's first API call, so parallel first-visit
// requests can never each mint a different identity.

const SECRET = 'test-upload-token-secret-0123456789abcdef'
const COOKIE = 'upup_demo_sid'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const sign = (id: string) =>
    createHmac('sha256', SECRET)
        .update(`upup-demo-sid:${id}`)
        .digest('base64url')

const page = (cookie?: string, path = '/') =>
    new NextRequest(`https://demo.example.test${path}`, {
        headers: {
            'x-forwarded-proto': 'https',
            ...(cookie ? { cookie } : {}),
        },
    })

const issued = (res: Response) =>
    res.headers.getSetCookie().find(c => c.startsWith(`${COOKIE}=`))

const valueOf = (setCookie: string) =>
    setCookie.slice(COOKIE.length + 1).split(';')[0]!

beforeEach(() => {
    vi.stubEnv('UPUP_UPLOAD_TOKEN_SECRET', SECRET)
})
afterEach(() => {
    vi.unstubAllEnvs()
})

describe('demo visitor proxy', () => {
    it('sets a signed, scoped cookie when absent', () => {
        const cookie = issued(proxy(page()))!
        expect(cookie).toBeTruthy()
        expect(cookie).toContain('HttpOnly')
        expect(cookie).toContain('SameSite=Lax')
        expect(cookie).toContain('Path=/;')
        expect(cookie).toContain('Max-Age=604800')
        expect(cookie).toContain('Secure')
        const [id, mac] = valueOf(cookie).split('.')
        expect(id).toMatch(UUID)
        expect(mac).toBe(sign(id!))
    })

    it('leaves a valid cookie untouched', () => {
        const id = '11111111-2222-4333-8444-555555555555'
        const res = proxy(page(`${COOKIE}=${id}.${sign(id)}; other=1`))
        expect(res.headers.getSetCookie()).toHaveLength(0)
        expect(res.headers.get('x-middleware-request-cookie')).toBeNull()
    })

    it.each([
        ['wrong mac', (id: string) => `${id}.${sign('someone-else')}`],
        ['no mac', (id: string) => id],
        ['garbage', () => 'not-a-sid'],
    ])('replaces a forged cookie (%s)', (_name, build) => {
        const victim = '11111111-2222-4333-8444-555555555555'
        const res = proxy(page(`keep=1; ${COOKIE}=${build(victim)}`))
        const cookie = issued(res)!
        expect(cookie).toBeTruthy()
        const [id] = valueOf(cookie).split('.')
        expect(id).not.toBe(victim)
        // The forged value is not forwarded; the fresh one is, other cookies kept.
        const forwarded = res.headers.get('x-middleware-request-cookie')!
        expect(forwarded).toContain('keep=1')
        expect(forwarded).toContain(`${COOKIE}=${id}.${sign(id!)}`)
        expect(forwarded).not.toContain(build(victim))
    })

    it('forwards the minted cookie to the same request so the route does not mint a second', () => {
        const res = proxy(page(undefined, '/api/upup/health'))
        const value = valueOf(issued(res)!)
        expect(res.headers.get('x-middleware-request-cookie')).toBe(
            `${COOKIE}=${value}`,
        )
    })

    it('does nothing (and does not throw) without a configured secret', () => {
        vi.stubEnv('UPUP_UPLOAD_TOKEN_SECRET', '')
        const res = proxy(page())
        expect(res.headers.getSetCookie()).toHaveLength(0)
    })
})

describe('demo visitor proxy on the /_t telemetry rewrites', () => {
    const sid = `${COOKIE}=11111111-2222-4333-8444-555555555555.${sign('11111111-2222-4333-8444-555555555555')}`

    it.each(['/_t/9lc5/i/v0/e/', '/_t/9lc5/x/'])(
        'strips only the sid from the cookie forwarded to the rewrite (%s)',
        path => {
            const res = proxy(page(`ph_phc=abc; ${sid}; other=2`, path))
            expect(res.headers.get('x-middleware-request-cookie')).toBe(
                'ph_phc=abc; other=2',
            )
            expect(res.headers.get('x-middleware-override-headers')).toContain(
                'cookie',
            )
            expect(res.headers.getSetCookie()).toHaveLength(0)
        },
    )

    it('drops the cookie header entirely when the sid was the only cookie', () => {
        const res = proxy(page(sid, '/_t/9lc5/e/'))
        expect(res.headers.get('x-middleware-request-cookie')).toBeNull()
        const overridden = (
            res.headers.get('x-middleware-override-headers') ?? ''
        )
            .split(',')
            .map(h => h.trim())
        // Absent from the override list => Next deletes it from the forwarded request.
        expect(overridden).not.toContain('cookie')
        expect(res.headers.getSetCookie()).toHaveLength(0)
    })

    it('strips a legacy/duplicate sid too and never mints', () => {
        const res = proxy(
            page(`${COOKIE}=forged; ${sid}; keep=1`, '/_t/9lc5/s/'),
        )
        expect(res.headers.get('x-middleware-request-cookie')).toBe('keep=1')
        expect(res.headers.getSetCookie()).toHaveLength(0)
    })

    it('does not mint on /_t when there is no cookie, and works without a secret', () => {
        for (const secret of [SECRET, '']) {
            vi.stubEnv('UPUP_UPLOAD_TOKEN_SECRET', secret)
            const bare = proxy(page(undefined, '/_t/9lc5/flags/'))
            expect(bare.headers.getSetCookie()).toHaveLength(0)
            const withSid = proxy(page(`a=1; ${sid}`, '/_t/9lc5/flags/'))
            expect(withSid.headers.get('x-middleware-request-cookie')).toBe(
                'a=1',
            )
        }
    })
})

describe('demo visitor proxy matcher', () => {
    const matcher = config.matcher as string[]

    it('covers every framework landing page', () => {
        const group = matcher.find(m => m.startsWith('/:framework('))!
        const allowed = group.slice(group.indexOf('(') + 1, -1).split('|')
        expect([...allowed].sort()).toEqual([...FRAMEWORK_IDS].sort())
    })

    it('covers the homepage, docs, mobile demo and the demo API', () => {
        expect(matcher).toEqual(
            expect.arrayContaining([
                '/',
                '/docs/:path*',
                '/mobile-demo',
                '/api/upup/:path*',
            ]),
        )
    })

    it('matches the telemetry rewrites only to strip the sid from them', () => {
        expect(matcher).toContain('/_t/:path*')
    })

    it('never matches assets, telemetry or SEO files', () => {
        const joined = matcher.join(' ')
        for (const excluded of ['_next', 'favicon', 'robots', 'sitemap']) {
            expect(joined).not.toContain(excluded)
        }
        // No catch-all that would sweep in every asset.
        expect(matcher.some(m => m.includes('(.*)') || m === '/:path*')).toBe(
            false,
        )
    })
})
