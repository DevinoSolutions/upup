import { createHandler } from './handler'
import type { UpupServerConfig } from './config'

export function createUpupHandler(config: UpupServerConfig) {
  const handler = createHandler(config)
  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
  }
}

export type { UpupServerConfig }
