import type { NextApiRequest, NextApiResponse } from 'next'
import { createUpupHandler } from '@upup/server'
import type { UpupServerConfig } from '@upup/server'
import type { UpupNextOptions } from '@upup/server/next'

function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return undefined
  const first = raw.split(',')[0]?.trim()
  return first || undefined
}

/** Resolve the public origin for the Web Request we hand to the core handler. */
function resolveBase(req: NextApiRequest, opts?: UpupNextOptions): string {
  if (opts?.baseUrl) return new URL(opts.baseUrl).origin
  const xfHost = firstHeaderValue(req.headers['x-forwarded-host'])
  const host = (opts?.trustProxy && xfHost) || req.headers.host || 'localhost'
  const xfProto = firstHeaderValue(req.headers['x-forwarded-proto'])
  const isLocal = host.startsWith('localhost') || host.startsWith('127.')
  const proto = (opts?.trustProxy && xfProto) || (isLocal ? 'http' : 'https')
  return `${proto}://${host}`
}

async function readBody(req: NextApiRequest): Promise<Buffer | undefined> {
  const method = (req.method ?? 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') return undefined
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
  }
  return chunks.length ? Buffer.concat(chunks) : undefined
}

async function toWebRequest(
  req: NextApiRequest,
  base: string,
): Promise<Request> {
  const body = await readBody(req)
  const url = new URL(req.url ?? '/', base).toString()
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) for (const v of value) headers.append(key, v)
    else headers.set(key, value)
  }
  return new Request(url, { method: req.method ?? 'GET', headers, body })
}

async function sendWebResponse(
  res: NextApiResponse,
  webRes: Response,
): Promise<void> {
  res.status(webRes.status)
  webRes.headers.forEach((value, key) => {
    // Node recomputes content-length from the buffer; copying it risks a mismatch.
    if (key.toLowerCase() === 'content-length') return
    res.setHeader(key, value)
  })
  const buf = Buffer.from(await webRes.arrayBuffer())
  res.send(buf)
}

/**
 * Pages Router (`pages/api/...`) adapter. Bridges Node req/res to the
 * framework-agnostic Web handler. The route MUST set
 * `export const config = { api: { bodyParser: false } }` so we receive the
 * raw request body. `opts.baseUrl` / `trustProxy` correct the OAuth callback
 * origin behind a proxy/CDN.
 */
export function createUpupPagesHandler(
  config: UpupServerConfig,
  opts?: UpupNextOptions,
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  const handler = createUpupHandler(config)
  return async (req, res) => {
    try {
      const base = resolveBase(req, opts)
      const webReq = await toWebRequest(req, base)
      const webRes = await handler(webReq)
      await sendWebResponse(res, webRes)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Internal error' })
    }
  }
}
