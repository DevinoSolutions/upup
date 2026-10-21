import { NextResponse, type NextRequest } from 'next/server'
import {
    cookieHeaderWithVisitor,
    resolveVisitor,
    visitorCookie,
} from '@/lib/demo-visitor'
import { requireServerEnv } from '@/lib/env'

/**
 * Mint the signed `upup_demo_sid` visitor cookie BEFORE the uploader makes its
 * first API call (see lib/demo-visitor.ts for why the route-level mint alone
 * races). Valid cookie: untouched. Absent or forged: replaced.
 *
 * The minted cookie is also forwarded on the request itself, so when this runs
 * for /api/upup/* the route sees the same identity the response hands out
 * instead of minting a second one.
 *
 * Matcher scope: only paths that can host an uploader or call the demo API,
 * so static assets, `_next/*`, images, the first-party `/_t/` telemetry tunnel
 * and the SEO files never pass through here and keep their CDN caching
 * (Set-Cookie would otherwise make every asset response per-visitor):
 *   /                      homepage demo
 *   /<framework>           framework landing pages (kept in sync with
 *                          FRAMEWORK_IDS by src/__tests__/upup-demo-proxy.test.ts)
 *   /docs/*                docs pages with the live demo
 *   /mobile-demo           the embeddable demo page
 *   /api/upup/*            the demo API itself
 */
export function proxy(req: NextRequest) {
    let secret = ''
    try {
        secret = requireServerEnv([
            'UPUP_UPLOAD_TOKEN_SECRET',
        ] as const).UPUP_UPLOAD_TOKEN_SECRET
    } catch {
        // Missing secret: handled below.
    }
    // No secret configured: nothing can be signed. Pages still render; the API
    // route fails loudly on its own requireServerEnv.
    if (!secret) return NextResponse.next()

    const visitor = resolveVisitor(secret, req)
    if (!visitor.fresh) return NextResponse.next()

    const headers = new Headers(req.headers)
    headers.set(
        'cookie',
        cookieHeaderWithVisitor(secret, req.headers.get('cookie'), visitor.id),
    )
    const res = NextResponse.next({ request: { headers } })
    res.headers.append('Set-Cookie', visitorCookie(secret, visitor.id, req))
    return res
}

export const config = {
    matcher: [
        '/',
        '/:framework(react|vue|svelte|angular|vanilla|preact)',
        '/docs/:path*',
        '/mobile-demo',
        '/api/upup/:path*',
    ],
}
