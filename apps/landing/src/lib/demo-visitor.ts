import 'server-only'
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
 */

const DEMO_SID_COOKIE = 'upup_demo_sid'
const VISITOR_HEADER = 'x-upup-visitor'

const COOKIE_PATH = '/api/upup'
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
const SID_DOMAIN = 'upup-demo-sid:'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const sign = (secret: string, id: string) =>
    createHmac('sha256', secret)
        .update(`${SID_DOMAIN}${id}`)
        .digest('base64url')

function readCookie(header: string | null, name: string): string | undefined {
    if (!header) return undefined
    for (const part of header.split(';')) {
        const eq = part.indexOf('=')
        if (eq === -1) continue
        if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
    }
    return undefined
}

function macMatches(expected: string, actual: string): boolean {
    const a = Buffer.from(expected)
    const b = Buffer.from(actual)
    return a.length === b.length && timingSafeEqual(a, b)
}

function resolveVisitor(
    secret: string,
    req: Request,
): { id: string; fresh: boolean } {
    const raw = readCookie(req.headers.get('cookie'), DEMO_SID_COOKIE)
    if (raw) {
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
        out.headers.append(
            'Set-Cookie',
            [
                `${DEMO_SID_COOKIE}=${visitor.id}.${sign(secret, visitor.id)}`,
                `Path=${COOKIE_PATH}`,
                'HttpOnly',
                'SameSite=Lax',
                `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
                ...(isHttps(req) ? ['Secure'] : []),
            ].join('; '),
        )
        return out
    }
}
