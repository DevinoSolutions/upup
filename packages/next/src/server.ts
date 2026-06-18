import { createHandler } from '@upup/server'
import type { UpupServerConfig } from '@upup/server'
import { normalizeRequestOrigin } from './normalize-origin'
import type { UpupNextOptions } from './normalize-origin'

/**
 * App Router handler. Returns the GET/POST/PUT/DELETE methods Next expects.
 * `opts.baseUrl` (or x-forwarded-* when `trustProxy`) corrects the OAuth callback
 * origin behind a proxy/CDN; a no-op on Vercel (req.url is already public).
 */
export function createUpupHandler(
  config: UpupServerConfig,
  opts?: UpupNextOptions,
) {
  const handler = createHandler(config)
  const wrapped = (req: Request) => handler(normalizeRequestOrigin(req, opts))
  return { GET: wrapped, POST: wrapped, PUT: wrapped, DELETE: wrapped }
}

export { createUpupPagesHandler } from './pages-handler'
export { defineUpupConfig } from './define-config'
export { normalizeRequestOrigin, resolveOrigin } from './normalize-origin'
export type { UpupNextOptions } from './normalize-origin'

// Token-store utilities surfaced for the persistent-store guidance.
export { InMemoryTokenStore } from '@upup/server'
export type { UpupServerConfig, TokenStore, DriveTokens } from '@upup/server'
