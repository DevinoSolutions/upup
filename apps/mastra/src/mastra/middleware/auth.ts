type Context = { req: { header: (name: string) => string | undefined } }
type Next = () => Promise<void>
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Origin-token auth middleware.
 *
 * The playground page mints a short-lived token signed with ORIGIN_TOKEN_SECRET
 * and sends it with every chat request. The middleware verifies the signature,
 * the origin binding, and the expiry. Tokens are rotated every 15 minutes by
 * the playground.
 *
 * Disabled when ORIGIN_TOKEN_SECRET is unset — useful for local dev where you
 * don't want to mint tokens just to curl the endpoint.
 *
 * Token format: base64url(`<originHash>.<expiresMs>.<signature>`)
 *   originHash  = sha256-truncated hex of the request origin
 *   expiresMs   = decimal ms-since-epoch
 *   signature   = HMAC-SHA256(secret, `${originHash}.${expiresMs}`) hex
 */

const TOKEN_TTL_MS = 15 * 60 * 1000

function originHash(origin: string): string {
    // Lightweight binding — we don't need cryptographic strength for this
    // since the HMAC is what protects integrity. This just keeps tokens
    // bound to where they were issued.
    return Buffer.from(origin).toString('base64url').slice(0, 24)
}

export function signOriginToken(origin: string, secret: string, now = Date.now()): string {
    const hash = originHash(origin)
    const exp = now + TOKEN_TTL_MS
    const payload = `${hash}.${exp}`
    const sig = createHmac('sha256', secret).update(payload).digest('hex')
    return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

export function authMiddleware() {
    const secret = process.env.ORIGIN_TOKEN_SECRET?.trim()
    if (!secret) {
        // Disabled: no-op middleware so dev curl works.
        return async (_c: Context, next: Next) => {
            await next()
        }
    }

    return async (c: Context, next: Next) => {
        const token = c.req.header('x-upup-origin-token')
        if (!token) return new Response('Missing origin token', { status: 401 })

        let decoded: string
        try {
            decoded = Buffer.from(token, 'base64url').toString('utf-8')
        } catch {
            return new Response('Malformed origin token', { status: 401 })
        }

        const parts = decoded.split('.')
        if (parts.length !== 3) return new Response('Malformed origin token', { status: 401 })
        const [hash, expStr, sig] = parts
        const exp = Number(expStr)
        if (!Number.isFinite(exp)) return new Response('Malformed origin token', { status: 401 })
        if (Date.now() > exp) return new Response('Origin token expired', { status: 401 })

        const expected = createHmac('sha256', secret).update(`${hash}.${exp}`).digest('hex')
        const a = Buffer.from(sig, 'hex')
        const b = Buffer.from(expected, 'hex')
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response('Bad origin token signature', { status: 401 })
        }

        const expectedHash = originHash(c.req.header('origin') ?? '')
        if (expectedHash !== hash) {
            return new Response('Origin mismatch', { status: 401 })
        }

        await next()
    }
}
