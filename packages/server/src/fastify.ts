import { createHandler } from './handler'
import type { UpupServerConfig } from './config'

export function createUpupPlugin(config: UpupServerConfig) {
  const handler = createHandler(config)

  return async (fastify: any) => {
    fastify.all('/upup/*', async (request: any, reply: any) => {
      const url = `${request.protocol}://${request.hostname}${request.url}`
      const webReq = new Request(url, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        body:
          request.method !== 'GET' && request.method !== 'HEAD'
            ? JSON.stringify(request.body)
            : undefined,
      })

      const webRes = await handler(webReq)
      const body = await webRes.text()

      reply.code(webRes.status)
      webRes.headers.forEach((value: string, key: string) => reply.header(key, value))
      reply.send(body)
    })
  }
}

export type { UpupServerConfig }
