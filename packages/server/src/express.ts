import { createUpupHandler } from './handler'
import type { UpupServerConfig } from './config'
import { toWebRequest, writeWebResponse } from './node-http-bridge'

interface ExpressReq {
    protocol: string
    get(name: string): string | undefined
    originalUrl: string
    method: string
    headers: Record<string, string | string[] | undefined>
    body: unknown
}

interface ExpressRes {
    status(code: number): ExpressRes
    setHeader(name: string, value: string): ExpressRes
    /** Real Express always has it; kept optional so minimal fakes still satisfy the shape. */
    append?(name: string, value: string): unknown
    send(body: string | Buffer): void
}

export function createUpupMiddleware(config: UpupServerConfig) {
    const handler = createUpupHandler(config)

    return async (
        req: ExpressReq,
        res: ExpressRes,
        _next: () => void,
    ): Promise<void> => {
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
        const webReq = toWebRequest({
            url,
            method: req.method,
            headers: req.headers,
            body:
                req.method !== 'GET' && req.method !== 'HEAD'
                    ? JSON.stringify(req.body)
                    : undefined,
        })

        const webRes = await handler(webReq)

        await writeWebResponse(
            {
                status: c => res.status(c),
                setHeader: (k, v) => res.setHeader(k, v),
                appendHeader: (k, v) =>
                    res.append ? res.append(k, v) : res.setHeader(k, v),
                send: b => {
                    res.send(b)
                },
            },
            webRes,
        )
    }
}

export type { UpupServerConfig }
