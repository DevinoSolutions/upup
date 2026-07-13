// App Router handler + origin utilities live in @upupjs/server/next; this entry
// re-exports them and adds the Pages Router adapter + config helper (Node-only).
export {
    createUpupNextHandler,
    normalizeRequestOrigin,
    resolveOrigin,
} from '@upupjs/server/next'
export type { UpupNextOptions } from '@upupjs/server/next'

export { createUpupPagesHandler } from './pages-handler'
export { defineUpupConfig } from './define-config'

// Token-store utilities surfaced for the persistent-store guidance.
export { InMemoryTokenStore } from '@upupjs/server'
export type { UpupServerConfig, TokenStore, DriveTokens } from '@upupjs/server'
