import { createHandler } from './handler'
import type { UpupServerConfig } from './config'

interface FastifyInstance {
  all(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>): void
}

interface FastifyRequest {
  protocol: string
  hostname: string
  url: string
  method: string
  headers: Record<string, string | string[] | undefined>
  body: unknown
}

interface FastifyReply {
  code(statusCode: number): FastifyReply
  header(key: string, value: string): FastifyReply
  send(payload: string): FastifyReply
}

export function createUpupPlugin(config: UpupServerConfig) {
  const handler = createHandler(config)

  return async (fastify: FastifyInstance) => {
    fastify.all('/upup/*', async (request: FastifyRequest, reply: FastifyReply) => {
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
