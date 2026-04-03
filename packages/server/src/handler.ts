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

    // OAuth routes: GET /auth/:provider and GET /auth/:provider/cb
    const authMatch = path.match(/\/auth\/([\w-]+?)(?:\/(cb))?$/)
    if (req.method === 'GET' && authMatch) {
      const provider = authMatch[1]
      const isCallback = authMatch[2] === 'cb'
      if (isCallback) {
        return handleOAuthCallback(req, config, provider)
      }
      return handleOAuthRedirect(req, config, provider)
    }

    // File routes: GET /files/:provider and POST /files/:provider/transfer
    const filesMatch = path.match(/\/files\/([\w-]+?)(?:\/(transfer))?$/)
    if (filesMatch) {
      const provider = filesMatch[1]
      const isTransfer = filesMatch[2] === 'transfer'
      if (req.method === 'POST' && isTransfer) {
        return handleFileTransfer(req, config, provider)
      }
      if (req.method === 'GET' && !isTransfer) {
        return handleListFiles(req, config, provider)
      }
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

const VALID_PROVIDERS = ['google-drive', 'onedrive', 'dropbox'] as const
type OAuthProvider = (typeof VALID_PROVIDERS)[number]

function isValidProvider(p: string): p is OAuthProvider {
  return (VALID_PROVIDERS as readonly string[]).includes(p)
}

async function handleOAuthRedirect(
  req: Request,
  config: UpupServerConfig,
  provider: string,
): Promise<Response> {
  if (!isValidProvider(provider)) {
    return json({ error: `Unknown provider: ${provider}` }, 400)
  }

  const providerConfig = config.providers
  if (!providerConfig) {
    return json({ error: 'No OAuth providers configured' }, 500)
  }

  const url = new URL(req.url)
  const redirectBase = `${url.origin}${url.pathname.replace(/\/auth\/[\w-]+$/, '')}`
  const callbackUrl = `${redirectBase}/auth/${provider}/cb`

  // Build provider-specific OAuth URL
  let oauthUrl: string
  switch (provider) {
    case 'google-drive': {
      const gc = providerConfig.googleDrive
      if (!gc) return json({ error: 'Google Drive not configured' }, 400)
      oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(gc.clientId)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}` +
        `&access_type=offline`
      break
    }
    case 'onedrive': {
      const oc = providerConfig.oneDrive
      if (!oc) return json({ error: 'OneDrive not configured' }, 400)
      const tenant = oc.tenantId ?? 'common'
      oauthUrl =
        `https://login.microsoftonline.com/${tenant}/oauth2/v2/authorize?` +
        `client_id=${encodeURIComponent(oc.clientId)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code&scope=${encodeURIComponent('Files.Read.All offline_access')}`
      break
    }
    case 'dropbox': {
      const dc = providerConfig.dropbox
      if (!dc) return json({ error: 'Dropbox not configured' }, 400)
      oauthUrl =
        `https://www.dropbox.com/oauth2/authorize?` +
        `client_id=${encodeURIComponent(dc.appKey)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code&token_access_type=offline`
      break
    }
    default:
      return json({ error: `Unknown provider: ${provider}` }, 400)
  }

  return new Response(null, {
    status: 302,
    headers: { Location: oauthUrl },
  })
}

async function handleOAuthCallback(
  _req: Request,
  _config: UpupServerConfig,
  provider: string,
): Promise<Response> {
  if (!isValidProvider(provider)) {
    return json({ error: `Unknown provider: ${provider}` }, 400)
  }

  // TODO: Exchange authorization code for tokens using provider credentials
  // For now return a placeholder indicating the callback was received
  const url = new URL(_req.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return json({ error: 'Missing authorization code' }, 400)
  }

  return json({
    provider,
    status: 'callback_received',
    message: 'TODO: Exchange code for tokens',
  })
}

async function handleListFiles(
  _req: Request,
  _config: UpupServerConfig,
  provider: string,
): Promise<Response> {
  if (!isValidProvider(provider)) {
    return json({ error: `Unknown provider: ${provider}` }, 400)
  }

  // TODO: Use stored tokens to list files from provider's API
  return json({
    provider,
    files: [],
    message: 'TODO: List files from cloud drive',
  })
}

async function handleFileTransfer(
  req: Request,
  _config: UpupServerConfig,
  provider: string,
): Promise<Response> {
  if (!isValidProvider(provider)) {
    return json({ error: `Unknown provider: ${provider}` }, 400)
  }

  try {
    const body = (await req.json()) as { fileId: string; fileName?: string }
    if (!body.fileId) {
      return json({ error: 'Missing fileId' }, 400)
    }

    // TODO: Download file from cloud provider and upload to S3
    return json({
      provider,
      fileId: body.fileId,
      status: 'pending',
      message: 'TODO: Transfer file from cloud drive to S3',
    })
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
}
