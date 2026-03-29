import type { UpupServerConfig, FileMetadata } from './config'
import {
  generatePresignedUrl,
  initiateMultipartUpload,
  generatePresignedPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} from './providers/aws'

export type RouteHandler = (req: Request) => Promise<Response>

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function createHandler(config: UpupServerConfig): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    const path = url.pathname

    // Auth check
    if (config.auth) {
      const authorized = await config.auth(req)
      if (!authorized) {
        return json({ error: 'Unauthorized' }, 401)
      }
    }

    // Route matching
    if (req.method === 'POST' && path.endsWith('/presign')) {
      return handlePresign(req, config)
    }
    if (req.method === 'POST' && path.endsWith('/multipart/init')) {
      return handleMultipartInit(req, config)
    }
    if (req.method === 'POST' && path.endsWith('/multipart/sign-part')) {
      return handleMultipartSignPart(req, config)
    }
    if (req.method === 'POST' && path.endsWith('/multipart/complete')) {
      return handleMultipartComplete(req, config)
    }
    if (req.method === 'POST' && path.endsWith('/multipart/abort')) {
      return handleMultipartAbort(req, config)
    }

    return json({ error: 'Not found' }, 404)
  }
}

async function handlePresign(req: Request, config: UpupServerConfig): Promise<Response> {
  const body = (await req.json()) as FileMetadata

  if (config.maxFileSize && body.size > config.maxFileSize) {
    return json({ error: 'File too large' }, 413)
  }

  if (config.allowedTypes?.length && !config.allowedTypes.includes(body.type)) {
    return json({ error: 'File type not allowed' }, 415)
  }

  if (config.hooks?.onBeforeUpload) {
    const allowed = await config.hooks.onBeforeUpload(body, req)
    if (!allowed) {
      return json({ error: 'Upload rejected' }, 403)
    }
  }

  try {
    const result = await generatePresignedUrl(
      config.storage,
      body.name,
      body.type,
      body.size,
    )
    return json(result)
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
}

async function handleMultipartInit(req: Request, config: UpupServerConfig): Promise<Response> {
  try {
    const body = (await req.json()) as { name: string; type: string; size: number; chunkSizeBytes?: number }
    const result = await initiateMultipartUpload(
      config.storage,
      body.name,
      body.type,
      body.size,
      undefined,
      body.chunkSizeBytes,
    )
    return json(result)
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
}

async function handleMultipartSignPart(req: Request, config: UpupServerConfig): Promise<Response> {
  try {
    const body = (await req.json()) as { key: string; uploadId: string; partNumber: number; contentLength: number }
    const result = await generatePresignedPartUrl(
      config.storage,
      body.key,
      body.uploadId,
      body.partNumber,
      body.contentLength,
    )
    return json(result)
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
}

async function handleMultipartComplete(req: Request, config: UpupServerConfig): Promise<Response> {
  try {
    const body = (await req.json()) as { key: string; uploadId: string; parts: Array<{ partNumber: number; eTag: string }> }
    const result = await completeMultipartUpload(
      config.storage,
      body.key,
      body.uploadId,
      body.parts,
    )
    return json(result)
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
}

async function handleMultipartAbort(req: Request, config: UpupServerConfig): Promise<Response> {
  try {
    const body = (await req.json()) as { key: string; uploadId: string }
    const result = await abortMultipartUpload(
      config.storage,
      body.key,
      body.uploadId,
    )
    return json(result)
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
}
