import { createUpupHandler, type RouteHandler } from './handler'
import type { UpupServerConfig } from './config'

export function createUpupRoutes(config: UpupServerConfig): RouteHandler {
    const handler = createUpupHandler(config)
    return handler
}

export type { UpupServerConfig }
