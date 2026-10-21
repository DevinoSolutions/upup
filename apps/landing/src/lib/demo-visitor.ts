import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

/**
 * Per-visitor identity for the public demo upload/drive route.
 *
 * The demo is anonymous by design, but a single shared identity means one
 * visitor's connected cloud drive is listable and transferable by every other
 * visitor. Each browser instead gets its own random id, carried in an
 * HMAC-signed cookie only this server can mint. The id reaches
 * `createUpupNextHandler` as the internal `x-upup-visitor` request header,
 * which the wrapper below ALWAYS overwrites, so a client can never choose it.
 *
 * The cookie is minted EARLY by `src/proxy.ts` on the pages that can render an
 * uploader (and on /api/upup/*), so it is already in the browser before the
 * uploader's first API call. The mint inside `withDemoVisitor` is only a
 * fallback for a client that hits the API with no prior page load; without the
 * early mint, parallel first-visit requests (UploadManager runs files
 * concurrently) would each mint a different id and the browser would keep only
 * the last cookie, orphaning the other uploads' multipart tokens.
 *
 * Node runtime only (node:crypto): Next 16's `proxy.ts` runs on Node, which is
 * why this one implementation serves both the proxy and the route.
 */

const DEMO_SID_COOKIE = 'upup_demo_sid'
const VISITOR_HEADER = 'x-upup-visitor'

// Path=/ is load-bearing: the proxy mints on PAGE requests, and a browser only
// sends a cookie whose Path prefix-matches the request path. A narrower
// `/api/upup` path was never sent on page / RSC requests, so the proxy saw no
// cookie and re-minted a new identity on every navigation.
const COOKIE_PATH = '/'
// The pre-fix cookie lived here; it is cleared whenever a new one is minted so a
// browser never holds (and sends) two cookies with the same name.
const LEGACY_COOKIE_PATH = '/api/upup'
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
const SID_DOMAIN = 'upup-demo-sid:'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const sign = (secret: string, id: string) =>
    createHmac('sha256', secret)
        .update(`${SID_DOMAIN}${id}`)
        .digest('base64url')

/** Every value of `name` in a Cookie header, in order. A browser may send
 *  duplicates (different Paths), so callers must not assume the first is good. */
function readCookies(header: string | null, name: string): string[] {
    if (!header) return []
    const values: string[] = []
    for (const part of header.split(';')) {
        const eq = part.indexOf('=')
        if (eq === -1) continue
        if (part.slice(0, eq).trim() === name)
            values.push(part.slice(eq + 1).trim())
    }
    return values
}

function macMatches(expected: string, actual: string): boolean {
    const a = Buffer.from(expected)
    const b = Buffer.from(actual)
    return a.length === b.length && timingSafeEqual(a, b)
}

export function resolveVisitor(
    secret: string,
    req: Request,
): { id: string; fresh: boolean } {
    for (const raw of readCookies(req.headers.get('cookie'), DEMO_SID_COOKIE)) {
        const dot = raw.indexOf('.')
        const id = dot === -1 ? '' : raw.slice(0, dot)
        const mac = dot === -1 ? '' : raw.slice(dot + 1)
        if (UUID_RE.test(id) && mac && macMatches(sign(secret, id), mac)) {
            return { id, fresh: false }
        }
    }
    return { id: randomUUID(), fresh: true }
}

function isHttps(req: Request): boolean {
    // Behind Traefik, req.url is the container-internal http origin; the
    // proxy-owned x-forwarded-proto carries the real scheme (the route already
    // trusts it via `trustProxy`).
    const forwarded = req.headers
        .get('x-forwarded-proto')
        ?.split(',')[0]
        ?.trim()
    if (forwarded) return forwarded.toLowerCase() === 'https'
    return new URL(req.url).protocol === 'https:'
}

/** The Set-Cookie headers that hand `id` to the browser: the new cookie, then
 *  an expiry for the legacy `Path=/api/upup` one (harmless if absent). */
export function visitorCookies(
    secret: string,
    id: string,
    req: Request,
): string[] {
    const secure = isHttps(req) ? ['Secure'] : []
    return [
        [
            `${DEMO_SID_COOKIE}=${id}.${sign(secret, id)}`,
            `Path=${COOKIE_PATH}`,
            'HttpOnly',
            'SameSite=Lax',
            `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
            ...secure,
        ].join('; '),
        [
            `${DEMO_SID_COOKIE}=`,
            `Path=${LEGACY_COOKIE_PATH}`,
            'HttpOnly',
            'SameSite=Lax',
            'Max-Age=0',
            ...secure,
        ].join('; '),
    ]
}

/** A Cookie request header with the demo sid set to a freshly minted, signed
 *  value (dropping any forged/stale one), so downstream code in the SAME
 *  request sees the identity the response is about to hand the browser. */
export function cookieHeaderWithVisitor(
    secret: string,
    header: string | null,
    id: string,
): string {
    const kept = (header ?? '')
        .split(';')
        .map(p => p.trim())
        .filter(p => p && p.split('=')[0]!.trim() !== DEMO_SID_COOKIE)
    kept.push(`${DEMO_SID_COOKIE}=${id}.${sign(secret, id)}`)
    return kept.join('; ')
}

/** The handler's `getUserId`. Never null: a request that somehow reaches the
 *  handler without the wrapper gets its own throwaway namespace rather than a
 *  shared one. */
export async function getVisitorId(req: Request): Promise<string> {
    return req.headers.get(VISITOR_HEADER) || randomUUID()
}

/**
 * Wrap a Request handler so every request carries a trusted visitor id and a
 * first-time visitor is handed their signed cookie.
 */
export function withDemoVisitor(
    secret: string,
    handle: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
    return async req => {
        const visitor = resolveVisitor(secret, req)
        const headers = new Headers(req.headers)
        // set(), not append(): any client-sent value is discarded.
        headers.set(VISITOR_HEADER, visitor.id)
        // `new Request(req, { headers })` carries the original (possibly
        // streamed) body through untouched.
        const res = await handle(new Request(req, { headers }))
        if (!visitor.fresh) return res

        const out = new Response(res.body, res)
        for (const cookie of visitorCookies(secret, visitor.id, req)) {
            out.headers.append('Set-Cookie', cookie)
        }
        return out
    }
}
