import { createUpupHandler } from './handler'
import type { UpupServerConfig } from './config'

export function createUpupRoutes(config: UpupServerConfig) {
    const handler = createUpupHandler(config)
    return handler
}

export type { UpupServerConfig }
