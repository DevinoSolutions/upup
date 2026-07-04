import { createUpupHandler } from './handler'
import type { UpupServerConfig } from './config'
import { toWebRequest, writeWebResponse } from './node-http-bridge'

interface FastifyInstance {
    all(
        path: string,
        handler: (
            request: FastifyRequest,
            reply: FastifyReply,
        ) => Promise<void>,
    ): void
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
    send(payload: string | Buffer): FastifyReply
}

/**
 * @param opts.path Mount path passed to `fastify.all`. Defaults to `/upup/*`.
 *   Every other adapter (express is plain middleware the consumer mounts
 *   anywhere, hono returns the raw handler, next uses file-based routing)
 *   never dictates its own route — this override brings fastify in line
 *   (F-652). `fastify.all` structurally requires a path be registered inside
 *   the plugin, so this is a defaulted override rather than "no default."
 */
export function createUpupPlugin(
    config: UpupServerConfig,
    opts?: { path?: string },
) {
    const handler = createUpupHandler(config)
    const routePath = opts?.path ?? '/upup/*'

    return async (fastify: FastifyInstance) => {
        fastify.all(
            routePath,
            async (request: FastifyRequest, reply: FastifyReply) => {
                const url = `${request.protocol}://${request.hostname}${request.url}`
                const webReq = toWebRequest({
                    url,
                    method: request.method,
                    headers: request.headers,
                    body:
                        request.method !== 'GET' && request.method !== 'HEAD'
                            ? JSON.stringify(request.body)
                            : undefined,
                })

                const webRes = await handler(webReq)

                await writeWebResponse(
                    {
                        status: c => reply.code(c),
                        setHeader: (k, v) => reply.header(k, v),
                        send: b => reply.send(b),
                    },
                    webRes,
                )
            },
        )
    }
}

export type { UpupServerConfig }
