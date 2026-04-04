import { createHandler } from './handler'
import type { UpupServerConfig } from './config'

export function createUpupRoutes(config: UpupServerConfig) {
  const handler = createHandler(config)
  return handler
}

export type { UpupServerConfig }
