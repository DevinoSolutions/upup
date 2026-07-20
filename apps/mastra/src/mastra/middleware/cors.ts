type Context = {
    req: {
        method: string
        header: (name: string) => string | undefined
        url: string
    }
    header: (name: string, value: string) => void
}
type Next = () => Promise<void>
import { env } from '../../lib/env.js'

/**
 * CORS middleware.
 *
 * Reads ALLOWED_ORIGINS (comma-separated) from the env. If it's unset, falls
 * back to allowing the standard local-dev origins so a fresh clone "just works".
 * In production, set it explicitly — otherwise the playground domain won't
 * be in the allowlist and the browser will block the request.
 */
export function corsMiddleware() {
    const raw = env.ALLOWED_ORIGINS?.trim()
    const allowList = raw
        ? raw
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
        : [
              'http://localhost:5173',
              'http://localhost:3000',
              'http://localhost:4321',
              'http://localhost:53056', // apps/playground (PLAYGROUND_PORT in local-dev/.env.ports)
          ]

    return async (c: Context, next: Next) => {
        const origin = c.req.header('origin') ?? ''
        const allowed = allowList.includes(origin)

        if (allowed) {
            c.header('access-control-allow-origin', origin)
            c.header('vary', 'origin')
            c.header('access-control-allow-credentials', 'true')
        }

        if (c.req.method === 'OPTIONS') {
            if (!allowed) return new Response(null, { status: 403 })
            c.header('access-control-allow-methods', 'GET,POST,OPTIONS')
            c.header(
                'access-control-allow-headers',
                'content-type,authorization,x-upup-origin-token',
            )
            c.header('access-control-max-age', '86400')
            return new Response(null, { status: 204 })
        }

        await next()
    }
}
