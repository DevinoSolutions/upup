// App Router handler + origin utilities live in @useupup/server/next; this entry
// re-exports them and adds the Pages Router adapter + config helper (Node-only).
export {
    createUpupNextHandler,
    normalizeRequestOrigin,
    resolveOrigin,
} from '@useupup/server/next'
export type { UpupNextOptions } from '@useupup/server/next'

export { createUpupPagesHandler } from './pages-handler'
export { defineUpupConfig } from './define-config'

// Token-store utilities surfaced for the persistent-store guidance.
export { InMemoryTokenStore } from '@useupup/server'
export type { UpupServerConfig, TokenStore, DriveTokens } from '@useupup/server'
