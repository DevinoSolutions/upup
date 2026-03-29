import { createHandler } from './handler'
import type { UpupServerConfig } from './config'

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
  send(body: string): void
}

export function createUpupMiddleware(config: UpupServerConfig) {
  const handler = createHandler(config)

  return async (req: ExpressReq, res: ExpressRes, _next: () => void) => {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
    const webReq = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body:
        req.method !== 'GET' && req.method !== 'HEAD'
          ? JSON.stringify(req.body)
          : undefined,
    })

    const webRes = await handler(webReq)
    const body = await webRes.text()

    res.status(webRes.status)
    webRes.headers.forEach((value, key) => res.setHeader(key, value))
    res.send(body)
  }
}

export type { UpupServerConfig }
