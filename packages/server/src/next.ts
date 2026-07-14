import { createUpupHandler, type RouteHandler } from './handler'
import type { UpupServerConfig } from './config'
import { normalizeRequestOrigin } from './normalize-origin'
import type { UpupNextOptions } from './normalize-origin'

/**
 * App Router handler. Returns the GET/POST/PUT/DELETE methods Next expects.
 * `opts.baseUrl` (or x-forwarded-* when `trustProxy`) corrects the OAuth callback
 * origin behind a proxy/CDN; a no-op on Vercel (req.url is already public).
 */
export function createUpupNextHandler(
    config: UpupServerConfig,
    opts?: UpupNextOptions,
): Record<'GET' | 'POST' | 'PUT' | 'DELETE', RouteHandler> {
    const handler = createUpupHandler(config)
    const wrapped = (req: Request) => handler(normalizeRequestOrigin(req, opts))
    return { GET: wrapped, POST: wrapped, PUT: wrapped, DELETE: wrapped }
}

export { normalizeRequestOrigin, resolveOrigin } from './normalize-origin'
export type { UpupNextOptions } from './normalize-origin'
export type { UpupServerConfig }
