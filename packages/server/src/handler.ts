import { UpupErrorCode } from '@upup/core'
import type { UpupServerConfig, FileMetadata, DriveTokens } from './config'
import {
  generatePresignedUrl,
  initiateMultipartUpload,
  generatePresignedPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  getMultipartUploadedSize,
} from './providers/aws'
import {
  assertUploadTokenSecret,
  signUploadToken,
  verifyUploadToken,
  UploadTokenError,
  DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
  type UploadTokenPayload,
} from './uploadToken'
import {
  generateOAuthState,
  saveOAuthState,
  consumeOAuthState,
  setTokens,
  getTokens,
  deleteTokens,
  resolveUserId,
  DEFAULT_USER_ID,
} from './tokenStore'
import { defaultKeyStrategy } from './key'
import { reportServerError, toSafeError } from './observability'
import { handleHealth } from './health'

export type RouteHandler = (req: Request) => Promise<Response>
type ResponseHeaders = Record<string, string>

function corsHeaders(req: Request, config: UpupServerConfig): ResponseHeaders {
  const cors = config.cors
  if (!cors) return {}

  const origin = req.headers.get('origin') ?? ''
  const allowsWildcard = cors.allowedOrigins.includes('*')
  const allowsOrigin = origin && cors.allowedOrigins.includes(origin)
  if (!allowsWildcard && !allowsOrigin) return {}

  // Never send a literal '*' to a browser (Origin present): reflect the matched
  // origin so no route (incl. /files/*, /presign) exposes a bare wildcard. '*'
  // is emitted only for origin-less (non-browser) requests (audit S3).
  const allowOrigin = origin ? origin : '*'
  const headers: ResponseHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': (cors.allowedMethods ?? ['GET', 'POST', 'OPTIONS']).join(', '),
    'Access-Control-Allow-Headers': (cors.allowedHeaders ?? ['Content-Type', 'Authorization']).join(', '),
    'Access-Control-Max-Age': String(cors.maxAgeSeconds ?? 600),
    'Vary': 'Origin',
  }
  // Credentialed CORS is gated on a CONCRETE allowlist match only — NEVER a
  // wildcard-only match. Reflecting an arbitrary origin (allowed solely via '*')
  // together with credentials would let any site make credentialed cross-origin
  // reads, so a '*'-configured server gets public, NON-credentialed CORS. To use
  // the server-mode drive client (`credentials: 'include'`), operators must
  // enumerate their app origin(s) in `allowedOrigins` (audit S3 / CORS review).
  if (allowsOrigin && allowOrigin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  return headers
}

function json(data: unknown, status = 200, headers: ResponseHeaders = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/** One home for every non-2xx response: logs via the onError seam, then returns
 *  the uniform `{ error: <generic human message>, code: <machine code> }` body.
 *  The real cause (error.name/message/stack) goes to the logger, never the client. */
function fail(
  config: UpupServerConfig,
  h: ResponseHeaders,
  route: string,
  method: string,
  status: number,
  code: string,
  message: string,
  error: unknown,
): Response {
  reportServerError(config.onError, {
    route,
    method,
    status,
    code,
    message,
    requestId: h['x-upup-request-id'],
    error: toSafeError(error),
  })
  return json({ error: message, code }, status, h)
}

/** Secure-by-default gate for the capability-granting upload routes (/presign,
 *  /multipart/init): reject an unauthenticated, unidentified caller unless the
 *  integrator explicitly opts into the shared anonymous namespace. With
 *  `config.auth` set, an unauthorized caller is already 401'd by the global
 *  gate; with `config.getUserId` set, an unauthenticated caller is already
 *  401'd inside the route (resolveUserId returns null) — this check only bites
 *  when NEITHER is configured, which previously fell through to the non-null
 *  DEFAULT_USER_ID and let the upload proceed (F-110). */
function requireUploadAuthorization(
  config: UpupServerConfig,
  h: ResponseHeaders,
  route: string,
  method: string,
): Response | null {
  if (!config.auth && !config.getUserId && !config.allowAnonymousUploads) {
    return fail(
      config,
      h,
      route,
      method,
      403,
      UpupErrorCode.AUTH_REQUIRED,
      'Anonymous uploads are disabled. Set allowAnonymousUploads:true, or configure auth/getUserId.',
      new Error('anonymous upload rejected'),
    )
  }
  return null
}

/** Verify an upload token, or return the 403 Response to send as-is. Collapses
 *  the three duplicated inner try/catch blocks in sign-part/complete/abort into
 *  one call site, and surfaces the token's own malformed/bad_signature/expired
 *  code at the HTTP boundary (previously all three collapsed into one 403). */
async function verifyTokenOrRespond(
  config: UpupServerConfig,
  token: string,
  h: ResponseHeaders,
  route: string,
  method: string,
): Promise<UploadTokenPayload | Response> {
  assertUploadTokenSecret(config.uploadTokenSecret)
  try {
    return await verifyUploadToken(config.uploadTokenSecret, token, Date.now())
  } catch (e) {
    if (e instanceof UploadTokenError) {
      reportServerError(config.onError, {
        route,
        method,
        status: 403,
        code: e.code,
        message: 'Invalid upload token',
        requestId: h['x-upup-request-id'],
        error: toSafeError(e),
      })
      return json({ error: 'Invalid upload token', code: e.code }, 403, h)
    }
    throw e
  }
}

/** Re-check the caller's resolved identity against a verified token's bound
 *  uid on the multipart continuation routes (sign-part/complete/abort). The
 *  token itself only proves possession, not who currently holds it — so a
 *  leaked token could otherwise be replayed by a different authenticated user
 *  (F-106). Skipped entirely when no `getUserId` resolver exists: `payload.uid`
 *  is then always null (init never had an identity to bind), so token
 *  possession remains the intentional model, documented in the README (F-107). */
async function enforceTokenOwner(
  config: UpupServerConfig,
  req: Request,
  payload: UploadTokenPayload,
  h: ResponseHeaders,
  route: string,
  method: string,
): Promise<Response | null> {
  if (!config.getUserId) return null
  const currentUserId = await resolveUserId(config, req)
  const currentOwner = currentUserId === DEFAULT_USER_ID ? null : currentUserId
  if (currentOwner !== payload.uid) {
    return fail(
      config,
      h,
      route,
      method,
      403,
      UpupErrorCode.AUTH_DENIED,
      'Upload token does not belong to the current user',
      new Error('upload-token uid mismatch'),
    )
  }
  return null
}

/** Parse a JSON request body, returning a 400 Response (not an unhandled throw)
 *  on malformed JSON. Collapses the two divergent body-parse sites. */
async function parseJsonBody<T>(
  req: Request,
  h: ResponseHeaders,
): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  try {
    return { ok: true, value: (await req.json()) as T }
  } catch {
    return {
      ok: false,
      response: json({ error: 'Invalid JSON body', code: UpupErrorCode.BAD_REQUEST }, 400, h),
    }
  }
}

function matchesAllowedType(type: string, allowedTypes?: string[]): boolean {
  if (!allowedTypes?.length) return true
  return allowedTypes.some((allowed) => {
    if (allowed === type) return true
    if (allowed.endsWith('/*')) {
      return type.startsWith(`${allowed.slice(0, -2)}/`)
    }
    return false
  })
}

async function validateUploadMetadata(
  req: Request,
  config: UpupServerConfig,
  body: FileMetadata,
  responseHeaders: ResponseHeaders = {},
): Promise<Response | null> {
  if (
    typeof body?.name !== 'string' ||
    body.name.length === 0 ||
    typeof body?.type !== 'string' ||
    typeof body?.size !== 'number' ||
    !Number.isFinite(body.size) ||
    body.size < 0
  ) {
    return json(
      { error: 'Invalid file metadata', code: UpupErrorCode.BAD_REQUEST },
      400,
      responseHeaders,
    )
  }

  if (config.maxFileSize && body.size > config.maxFileSize) {
    return json({ error: 'File too large' }, 413, responseHeaders)
  }

  if (!matchesAllowedType(body.type, config.allowedTypes)) {
    return json({ error: 'File type not allowed' }, 415, responseHeaders)
  }

  if (config.hooks?.onBeforeUpload) {
    const allowed = await config.hooks.onBeforeUpload(body, req)
    if (!allowed) {
      return json({ error: 'Upload rejected' }, 403, responseHeaders)
    }
  }

  return null
}

export function createUpupHandler(config: UpupServerConfig): RouteHandler {
  // Secure-by-default: a stable token secret is mandatory (the multipart routes
  // are always live and issue/verify tokens), and drive/tokenStore use requires
  // a real identity resolver unless anonymous is explicitly opted into.
  assertUploadTokenSecret(config.uploadTokenSecret)
  if (
    (config.providers || config.tokenStore) &&
    !config.getUserId &&
    !config.allowAnonymous
  ) {
    throw new Error(
      '[@upup/server] drive providers / tokenStore require config.getUserId to ' +
        'scope tokens per user. Set getUserId, or set allowAnonymous:true to ' +
        'intentionally share ONE anonymous namespace (demos only).',
    )
  }

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    const path = url.pathname
    const responseHeaders = corsHeaders(req, config)
    const requestId = crypto.randomUUID()
    responseHeaders['x-upup-request-id'] = requestId

    try {
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: responseHeaders })
      }

      // Health check sits BEFORE the auth gate so uptime/deploy probes work
      // unauthenticated (F-426/F-428).
      if (req.method === 'GET' && path.endsWith('/health')) {
        return handleHealth(config, responseHeaders)
      }

      // Auth check
      if (config.auth) {
        const authorized = await config.auth(req)
        if (!authorized) {
          return json({ error: 'Unauthorized' }, 401, responseHeaders)
        }
      }

      // Route matching
      if (req.method === 'POST' && path.endsWith('/presign')) {
        return handlePresign(req, config, responseHeaders)
      }
      if (req.method === 'POST' && path.endsWith('/multipart/init')) {
        return handleMultipartInit(req, config, responseHeaders)
      }
      if (req.method === 'POST' && path.endsWith('/multipart/sign-part')) {
        return handleMultipartSignPart(req, config, responseHeaders)
      }
      if (req.method === 'POST' && path.endsWith('/multipart/complete')) {
        return handleMultipartComplete(req, config, responseHeaders)
      }
      if (req.method === 'POST' && path.endsWith('/multipart/abort')) {
        return handleMultipartAbort(req, config, responseHeaders)
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
          return handleFileTransfer(req, config, provider, responseHeaders)
        }
        if (req.method === 'GET' && !isTransfer) {
          return handleListFiles(req, config, provider, responseHeaders)
        }
      }

      return json({ error: 'Not found' }, 404, responseHeaders)
    } catch (error) {
      // Transport safety net (F-421/F-104): a last-resort catch so an unhandled
      // throw anywhere in routing surfaces as a logged, CORS-headered, coded 500
      // instead of an uncaught framework exception with no log and no CORS. This
      // is the single home for last-resort handling — the express/fastify/hono/
      // next adapters need no per-adapter catch of their own.
      return fail(config, responseHeaders, 'router', req.method, 500, UpupErrorCode.STORAGE_ERROR, 'Internal error', error)
    }
  }
}

async function handlePresign(req: Request, config: UpupServerConfig, responseHeaders: ResponseHeaders): Promise<Response> {
  const gate = requireUploadAuthorization(config, responseHeaders, 'presign', req.method)
  if (gate) return gate

  const parsed = await parseJsonBody<FileMetadata>(req, responseHeaders)
  if (!parsed.ok) return parsed.response
  const body = parsed.value

  const validationError = await validateUploadMetadata(req, config, body, responseHeaders)
  if (validationError) return validationError

  const userId = await resolveUserId(config, req)
  if (userId === null) return json({ error: 'Unauthenticated' }, 401, responseHeaders)
  const owner = userId === DEFAULT_USER_ID ? null : userId

  const key = (config.keyStrategy ?? defaultKeyStrategy)({
    userId: owner,
    fileName: body.name,
    contentType: body.type,
    size: body.size,
  })

  try {
    const result = await generatePresignedUrl(config.storage, key, body.type, body.size)
    return json(result, 200, responseHeaders)
  } catch (error) {
    return fail(config, responseHeaders, 'presign', req.method, 500, UpupErrorCode.PRESIGN_FAILED, 'Presign failed', error)
  }
}

async function handleMultipartInit(req: Request, config: UpupServerConfig, responseHeaders: ResponseHeaders): Promise<Response> {
  const gate = requireUploadAuthorization(config, responseHeaders, 'multipart/init', req.method)
  if (gate) return gate

  const parsed = await parseJsonBody<{ name: string; type: string; size: number; chunkSizeBytes?: number }>(req, responseHeaders)
  if (!parsed.ok) return parsed.response
  const body = parsed.value

  try {
    const validationError = await validateUploadMetadata(req, config, body, responseHeaders)
    if (validationError) return validationError

    const userId = await resolveUserId(config, req)
    if (userId === null) return json({ error: 'Unauthenticated' }, 401, responseHeaders)
    const owner = userId === DEFAULT_USER_ID ? null : userId

    const key = (config.keyStrategy ?? defaultKeyStrategy)({
      userId: owner,
      fileName: body.name,
      contentType: body.type,
      size: body.size,
    })

    const result = await initiateMultipartUpload(
      config.storage,
      key,
      body.type,
      body.size,
      undefined,
      body.chunkSizeBytes,
    )
    assertUploadTokenSecret(config.uploadTokenSecret)
    const token = await signUploadToken(config.uploadTokenSecret, {
      k: result.key,
      u: result.uploadId,
      uid: owner,
      smin: 0,
      smax: body.size,
      exp: Math.floor(Date.now() / 1000) + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
    })
    return json({ ...result, token }, 200, responseHeaders)
  } catch (error) {
    return fail(config, responseHeaders, 'multipart/init', req.method, 500, UpupErrorCode.STORAGE_ERROR, 'Multipart init failed', error)
  }
}

async function handleMultipartSignPart(req: Request, config: UpupServerConfig, responseHeaders: ResponseHeaders): Promise<Response> {
  try {
    const body = (await req.json()) as { token: string; partNumber: number }
    const payload = await verifyTokenOrRespond(config, body.token, responseHeaders, 'multipart/sign-part', req.method)
    if (payload instanceof Response) return payload
    const owned = await enforceTokenOwner(config, req, payload, responseHeaders, 'multipart/sign-part', req.method)
    if (owned) return owned
    const result = await generatePresignedPartUrl(config.storage, payload.k, payload.u, body.partNumber)
    return json(result, 200, responseHeaders)
  } catch (error) {
    return fail(config, responseHeaders, 'multipart/sign-part', req.method, 500, UpupErrorCode.STORAGE_ERROR, 'Multipart sign failed', error)
  }
}

async function handleMultipartComplete(req: Request, config: UpupServerConfig, responseHeaders: ResponseHeaders): Promise<Response> {
  try {
    const body = (await req.json()) as { token: string; parts: Array<{ partNumber: number; eTag: string }> }
    const payload = await verifyTokenOrRespond(config, body.token, responseHeaders, 'multipart/complete', req.method)
    if (payload instanceof Response) return payload
    const owned = await enforceTokenOwner(config, req, payload, responseHeaders, 'multipart/complete', req.method)
    if (owned) return owned

    // S1 (multipart): smin/smax are SIGNED at init but must be ENFORCED here —
    // otherwise a client can init with a tiny declared size (tiny smax) and
    // upload arbitrarily large real parts, since sign-part/PUT never sees the
    // client-declared size. Sum the bytes S3 actually received (ListParts) and
    // reject + abort if outside the signed envelope.
    const uploadedSize = await getMultipartUploadedSize(config.storage, payload.k, payload.u)
    if (uploadedSize < payload.smin || uploadedSize > payload.smax) {
      await abortMultipartUpload(config.storage, payload.k, payload.u)
      return json({ error: 'Upload size outside signed envelope' }, 403, responseHeaders)
    }

    const result = await completeMultipartUpload(config.storage, payload.k, payload.u, body.parts)
    return json(result, 200, responseHeaders)
  } catch (error) {
    return fail(config, responseHeaders, 'multipart/complete', req.method, 500, UpupErrorCode.STORAGE_ERROR, 'Multipart complete failed', error)
  }
}

async function handleMultipartAbort(req: Request, config: UpupServerConfig, responseHeaders: ResponseHeaders): Promise<Response> {
  try {
    const body = (await req.json()) as { token: string }
    const payload = await verifyTokenOrRespond(config, body.token, responseHeaders, 'multipart/abort', req.method)
    if (payload instanceof Response) return payload
    const owned = await enforceTokenOwner(config, req, payload, responseHeaders, 'multipart/abort', req.method)
    if (owned) return owned
    const result = await abortMultipartUpload(config.storage, payload.k, payload.u)
    return json(result, 200, responseHeaders)
  } catch (error) {
    return fail(config, responseHeaders, 'multipart/abort', req.method, 500, UpupErrorCode.STORAGE_ERROR, 'Multipart abort failed', error)
  }
}

const VALID_PROVIDERS = ['google-drive', 'onedrive', 'dropbox', 'box'] as const
type OAuthProvider = (typeof VALID_PROVIDERS)[number]

function isValidProvider(p: string): p is OAuthProvider {
  return (VALID_PROVIDERS as readonly string[]).includes(p)
}

type ProviderOAuthMeta = {
  authUrl: string
  tokenUrl: string
  scope: string
  clientId: string
  clientSecret: string
  extra?: Record<string, string>
}

function getProviderMeta(
  config: UpupServerConfig,
  provider: OAuthProvider,
): ProviderOAuthMeta | { error: string; status: number } {
  const providers = config.providers
  if (!providers) return { error: 'No OAuth providers configured', status: 500 }

  switch (provider) {
    case 'google-drive': {
      const gc = providers.googleDrive
      if (!gc) return { error: 'Google Drive not configured', status: 400 }
      return {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        clientId: gc.clientId,
        clientSecret: gc.clientSecret,
        extra: { access_type: 'offline', prompt: 'consent' },
      }
    }
    case 'onedrive': {
      const oc = providers.oneDrive
      if (!oc) return { error: 'OneDrive not configured', status: 400 }
      const tenant = oc.tenantId ?? 'common'
      return {
        authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        scope: 'Files.Read.All offline_access',
        clientId: oc.clientId,
        clientSecret: oc.clientSecret,
      }
    }
    case 'dropbox': {
      const dc = providers.dropbox
      if (!dc) return { error: 'Dropbox not configured', status: 400 }
      return {
        authUrl: 'https://www.dropbox.com/oauth2/authorize',
        tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
        scope: 'files.content.read files.metadata.read',
        clientId: dc.appKey,
        clientSecret: dc.appSecret,
        extra: { token_access_type: 'online' },
      }
    }
    case 'box': {
      const bc = providers.box
      if (!bc) return { error: 'Box not configured', status: 400 }
      return {
        authUrl: 'https://account.box.com/api/oauth2/authorize',
        tokenUrl: 'https://api.box.com/oauth2/token',
        scope: 'root_readonly',
        clientId: bc.clientId,
        clientSecret: bc.clientSecret,
      }
    }
  }
}

function callbackUrlFor(req: Request, provider: string): string {
  const url = new URL(req.url)
  // Strip the route suffix so this is idempotent across BOTH the auth request
  // (/auth/:provider) and the callback (/auth/:provider/cb) — otherwise the
  // token-exchange redirect_uri doubles the path and Google rejects it with
  // redirect_uri_mismatch. Mirrors the router's own /auth match (line ~128).
  const base = `${url.origin}${url.pathname.replace(/\/auth\/[\w-]+(?:\/cb)?$/, '')}`
  return `${base}/auth/${provider}/cb`
}

async function handleOAuthRedirect(
  req: Request,
  config: UpupServerConfig,
  provider: string,
): Promise<Response> {
  if (!isValidProvider(provider)) {
    return json({ error: `Unknown provider: ${provider}` }, 400)
  }

  if (!config.tokenStore) {
    return json({ error: 'tokenStore is required for OAuth flows' }, 500)
  }

  const userId = await resolveUserId(config, req)
  if (!userId) return json({ error: 'Unauthenticated' }, 401)

  const meta = getProviderMeta(config, provider)
  if ('error' in meta) return json({ error: meta.error }, meta.status)

  const state = generateOAuthState()
  const returnTo = new URL(req.url).searchParams.get('returnTo') ?? undefined
  await saveOAuthState(config.tokenStore, state, { userId, provider, returnTo })

  const params = new URLSearchParams({
    client_id: meta.clientId,
    redirect_uri: callbackUrlFor(req, provider),
    response_type: 'code',
    scope: meta.scope,
    state,
    ...(meta.extra ?? {}),
  })

  return new Response(null, {
    status: 302,
    headers: { Location: `${meta.authUrl}?${params.toString()}` },
  })
}

async function handleOAuthCallback(
  req: Request,
  config: UpupServerConfig,
  provider: string,
): Promise<Response> {
  if (!isValidProvider(provider)) {
    return json({ error: `Unknown provider: ${provider}` }, 400)
  }
  if (!config.tokenStore) {
    return json({ error: 'tokenStore is required' }, 500)
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) return json({ error: `OAuth error: ${error}` }, 400)
  if (!code || !state) return json({ error: 'Missing code or state' }, 400)

  const stateData = await consumeOAuthState(config.tokenStore, state)
  if (!stateData || stateData.provider !== provider) {
    return json({ error: 'Invalid or expired state' }, 400)
  }

  const meta = getProviderMeta(config, provider)
  if ('error' in meta) return json({ error: meta.error }, meta.status)

  const tokenRes = await fetch(meta.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: meta.clientId,
      client_secret: meta.clientSecret,
      redirect_uri: callbackUrlFor(req, provider),
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    reportServerError(config.onError, {
      route: `auth/${provider}/cb`,
      method: req.method,
      status: 502,
      code: UpupErrorCode.AUTH_PROVIDER_ERROR,
      message: 'Token exchange failed',
      error: toSafeError(new Error(body.slice(0, 500))),
    })
    return json({ error: 'Token exchange failed', code: UpupErrorCode.AUTH_PROVIDER_ERROR }, 502)
  }

  const payload = (await tokenRes.json()) as {
    access_token: string
    expires_in?: number
    refresh_token?: string
    scope?: string
    token_type?: string
  }

  const tokens: DriveTokens = {
    accessToken: payload.access_token,
    expiresAt: payload.expires_in
      ? Date.now() + payload.expires_in * 1000
      : undefined,
    scope: payload.scope,
    tokenType: payload.token_type,
    refreshToken: payload.refresh_token,
  }
  await setTokens(config.tokenStore, stateData.userId, provider, tokens)

  const validatedReturn = validateReturnTo(stateData.returnTo, req, config.cors)
  const targetOrigins = concreteAllowedOrigins(config.cors)
  return htmlResponse(buildOAuthSuccessPage(provider, { returnTo: validatedReturn, targetOrigins }))
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/** Validate an OAuth returnTo against same-origin + the CORS allowlist (audit S7).
 *  Returns the resolved absolute URL string if allowed, else undefined.
 *  A wildcard '*' in allowedOrigins does NOT authorize an arbitrary cross-origin returnTo.
 *  Proxy caveat: a RELATIVE returnTo resolves against `new URL(req.url).origin` and is
 *  returned ABSOLUTE. Behind an origin-rewriting reverse proxy (internal req.url origin ≠
 *  public origin) it becomes absolute to the INTERNAL origin — this fails closed (never an
 *  open redirect); to keep relative returnTo working there, add the public origin to
 *  cors.allowedOrigins. */
export function validateReturnTo(
  returnTo: string | undefined,
  req: Request,
  cors: { allowedOrigins: string[] } | undefined,
): string | undefined {
  if (!returnTo) return undefined
  const serverOrigin = new URL(req.url).origin
  let resolved: URL
  try {
    resolved = new URL(returnTo, serverOrigin) // relative returnTo resolves to same-origin
  } catch {
    return undefined
  }
  if (resolved.origin === serverOrigin) return resolved.toString()
  const concrete = (cors?.allowedOrigins ?? []).filter((o) => o !== '*')
  if (concrete.includes(resolved.origin)) return resolved.toString()
  return undefined
}

/** Concrete (non-wildcard) origins to target postMessage at (audit S7). */
export function concreteAllowedOrigins(cors: { allowedOrigins: string[] } | undefined): string[] {
  return (cors?.allowedOrigins ?? []).filter((o) => o !== '*')
}

export function buildOAuthSuccessPage(
  provider: string,
  opts: { returnTo?: string; targetOrigins: string[] },
): string {
  const safeProvider = provider.replace(/[^a-z0-9-]/gi, '')
  const { returnTo, targetOrigins } = opts

  let postMessageScript: string
  if (targetOrigins.length > 0) {
    postMessageScript = targetOrigins
      .map(
        (origin) =>
          `window.opener.postMessage({ type: 'upup:oauth-success', provider: ${JSON.stringify(safeProvider)} }, ${JSON.stringify(origin)});`,
      )
      .join('\n      ')
  } else {
    // '*' is acceptable here because the payload is token-free ({type, provider}, no secret)
    postMessageScript = `window.opener.postMessage({ type: 'upup:oauth-success', provider: ${JSON.stringify(safeProvider)} }, '*' /* token-free payload */);`
  }

  const elseBody = returnTo
    ? `window.location.replace(${JSON.stringify(returnTo)});`
    : `document.body.textContent = 'Connected to ' + ${JSON.stringify(safeProvider)} + '. You may close this window.';`

  return `<!doctype html>
<html><head><title>Connected</title></head><body>
<script>
  try {
    if (window.opener) {
      ${postMessageScript}
      window.close();
    } else if (${JSON.stringify(returnTo ?? '')}) {
      ${elseBody}
    } else {
      document.body.textContent = 'Connected to ' + ${JSON.stringify(safeProvider)} + '. You may close this window.';
    }
  } catch (e) {
    document.body.textContent = 'Connected. You may close this window.';
  }
</script>
</body></html>`
}

async function refreshAccessToken(
  config: UpupServerConfig,
  provider: OAuthProvider,
  userId: string,
  tokens: DriveTokens,
): Promise<DriveTokens | null> {
  if (!tokens.refreshToken || !config.tokenStore) return null
  const meta = getProviderMeta(config, provider)
  if ('error' in meta) return null
  const res = await fetch(meta.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: meta.clientId,
      client_secret: meta.clientSecret,
    }),
  })
  if (!res.ok) {
    // Refresh token is dead/revoked -> force a clean re-auth.
    const body = await res.text().catch(() => '')
    reportServerError(config.onError, {
      route: `auth/${provider}/refresh`,
      method: 'POST',
      status: res.status,
      code: UpupErrorCode.AUTH_EXPIRED,
      message: 'Drive token refresh failed',
      error: toSafeError(new Error(body.slice(0, 500) || res.statusText)),
    })
    await deleteTokens(config.tokenStore, userId, provider)
    return null
  }
  const payload = (await res.json()) as {
    access_token: string
    expires_in?: number
    refresh_token?: string
    scope?: string
    token_type?: string
  }
  const next: DriveTokens = {
    accessToken: payload.access_token,
    expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : undefined,
    scope: payload.scope ?? tokens.scope,
    tokenType: payload.token_type ?? tokens.tokenType,
    // Some providers omit refresh_token on refresh -> keep the existing one.
    refreshToken: payload.refresh_token ?? tokens.refreshToken,
  }
  await setTokens(config.tokenStore, userId, provider, next)
  return next
}

async function handleListFiles(
  req: Request,
  config: UpupServerConfig,
  provider: string,
  responseHeaders: ResponseHeaders = {},
): Promise<Response> {
  if (!isValidProvider(provider)) {
    return json({ error: `Unknown provider: ${provider}` }, 400, responseHeaders)
  }
  if (!config.tokenStore)
    return json({ error: 'tokenStore is required' }, 500, responseHeaders)

  const userId = await resolveUserId(config, req)
  if (!userId) return json({ error: 'Unauthenticated' }, 401, responseHeaders)

  let tokens = await getTokens(config.tokenStore, userId, provider)
  if (!tokens) {
    return json({ reauth: true, provider }, 401, responseHeaders)
  }
  if (
    tokens.refreshToken &&
    tokens.expiresAt &&
    Date.now() > tokens.expiresAt - 30_000
  ) {
    const refreshed = await refreshAccessToken(config, provider, userId, tokens)
    if (!refreshed) {
      return json({ reauth: true, provider }, 401, responseHeaders)
    }
    tokens = refreshed
  }

  const url = new URL(req.url)
  const folderId = url.searchParams.get('folderId') ?? undefined
  const search = url.searchParams.get('search') ?? undefined

  try {
    const files = await listDriveFiles(provider, tokens.accessToken, {
      folderId,
      search,
    })
    return json({ provider, files }, 200, responseHeaders)
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      await deleteTokens(config.tokenStore, userId, provider)
      return json({ reauth: true, provider }, 401, responseHeaders)
    }
    return fail(config, responseHeaders, `files/${provider}`, req.method, 500, UpupErrorCode.STORAGE_ERROR, 'Drive request failed', err)
  }
}

async function handleFileTransfer(
  req: Request,
  config: UpupServerConfig,
  provider: string,
  responseHeaders: ResponseHeaders = {},
): Promise<Response> {
  if (!isValidProvider(provider)) {
    return json({ error: `Unknown provider: ${provider}` }, 400, responseHeaders)
  }
  if (!config.tokenStore)
    return json({ error: 'tokenStore is required' }, 500, responseHeaders)

  const userId = await resolveUserId(config, req)
  if (!userId) return json({ error: 'Unauthenticated' }, 401, responseHeaders)

  let tokens = await getTokens(config.tokenStore, userId, provider)
  if (!tokens) return json({ reauth: true, provider }, 401, responseHeaders)
  if (
    tokens.refreshToken &&
    tokens.expiresAt &&
    Date.now() > tokens.expiresAt - 30_000
  ) {
    const refreshed = await refreshAccessToken(config, provider, userId, tokens)
    if (!refreshed) {
      return json({ reauth: true, provider }, 401, responseHeaders)
    }
    tokens = refreshed
  }

  let body: {
    fileId: string
    fileName?: string
    size?: number
    mimeType?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, responseHeaders)
  }
  if (!body.fileId) return json({ error: 'Missing fileId' }, 400, responseHeaders)

  if (
    config.maxFileSize &&
    typeof body.size === 'number' &&
    body.size > config.maxFileSize
  ) {
    return json({ error: 'File too large' }, 413, responseHeaders)
  }
  if (
    config.allowedTypes?.length &&
    body.mimeType &&
    !config.allowedTypes.includes(body.mimeType)
  ) {
    return json({ error: 'File type not allowed' }, 415, responseHeaders)
  }

  try {
    const { stream, size, fileName, mimeType } = await fetchDriveFile(
      provider,
      tokens.accessToken,
      body,
    )
    const { transferDriveFileToS3 } = await import('./transfer')
    const result = await transferDriveFileToS3({
      stream,
      size,
      fileName,
      mimeType,
      storage: config.storage,
      multipartThreshold: config.multipartThreshold,
    })
    if (config.hooks?.onFileUploaded) {
      await config.hooks.onFileUploaded(result, req)
    }
    return json({ provider, ...result }, 200, responseHeaders)
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      await deleteTokens(config.tokenStore, userId, provider)
      return json({ reauth: true, provider }, 401, responseHeaders)
    }
    return fail(config, responseHeaders, `files/${provider}/transfer`, req.method, 500, UpupErrorCode.STORAGE_ERROR, 'Drive request failed', err)
  }
}

type DriveFile = {
  id: string
  name: string
  size?: number
  mimeType?: string
  thumbnailUrl?: string
  isFolder: boolean
  modifiedAt?: string
}

async function listDriveFiles(
  provider: OAuthProvider,
  accessToken: string,
  opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
  switch (provider) {
    case 'google-drive':
      return listGoogleDriveFiles(accessToken, opts)
    case 'onedrive':
      return listOneDriveFiles(accessToken, opts)
    case 'dropbox':
      return listDropboxFiles(accessToken, opts)
    case 'box':
      return listBoxFiles(accessToken, opts)
  }
}

async function fetchDriveFile(
  provider: OAuthProvider,
  accessToken: string,
  body: { fileId: string; fileName?: string; size?: number; mimeType?: string },
): Promise<{
  stream: ReadableStream<Uint8Array>
  size: number
  fileName: string
  mimeType: string
}> {
  switch (provider) {
    case 'google-drive':
      return fetchGoogleDriveFile(accessToken, body)
    case 'onedrive':
      return fetchOneDriveFile(accessToken, body)
    case 'dropbox':
      return fetchDropboxFile(accessToken, body)
    case 'box':
      return fetchBoxFile(accessToken, body)
  }
}

async function driveFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, init)
  if (res.status === 401) {
    const err = new Error('Drive API 401') as Error & { status: number }
    err.status = 401
    throw err
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Drive API ${res.status}: ${text.slice(0, 200) || res.statusText}`,
    )
  }
  return res
}

/** Escape a value for use inside a Google Drive API query string literal (single-quoted).
 * Backslashes must be escaped before quotes to prevent query injection (audit S5). */
export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * Escape a user value for an OData string literal (Microsoft Graph). OData
 * escapes a single quote by doubling it. Applied before encodeURIComponent so
 * the doubled quote survives URL-decoding on Graph's side (defense-in-depth
 * parity with Google Drive's escapeDriveQueryValue).
 */
export function escapeODataSearchValue(value: string): string {
  return value.replace(/'/g, "''")
}

async function listGoogleDriveFiles(
  accessToken: string,
  opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
  const parent = opts.folderId ?? 'root'
  const q = opts.search
    ? `name contains '${escapeDriveQueryValue(opts.search)}' and trashed = false`
    : `'${parent}' in parents and trashed = false`
  const params = new URLSearchParams({
    q,
    fields:
      'files(id,name,size,mimeType,thumbnailLink,modifiedTime,iconLink)',
    pageSize: '200',
  })
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const data = (await res.json()) as {
    files: Array<{
      id: string
      name: string
      size?: string
      mimeType: string
      thumbnailLink?: string
      modifiedTime?: string
    }>
  }
  return data.files.map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size ? Number(f.size) : undefined,
    mimeType: f.mimeType,
    thumbnailUrl: f.thumbnailLink,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    modifiedAt: f.modifiedTime,
  }))
}

async function fetchGoogleDriveFile(
  accessToken: string,
  body: { fileId: string; fileName?: string; size?: number; mimeType?: string },
) {
  const metaRes = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      body.fileId,
    )}?fields=name,size,mimeType`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const meta = (await metaRes.json()) as {
    name: string
    size?: string
    mimeType?: string
  }
  const dlRes = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      body.fileId,
    )}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!dlRes.body) throw new Error('Empty download body')
  return {
    stream: dlRes.body,
    size: Number(meta.size ?? body.size ?? 0),
    fileName: body.fileName ?? meta.name,
    mimeType: body.mimeType ?? meta.mimeType ?? 'application/octet-stream',
  }
}

async function listOneDriveFiles(
  accessToken: string,
  opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
  const path = opts.search
    ? `/me/drive/root/search(q='${encodeURIComponent(escapeODataSearchValue(opts.search))}')`
    : opts.folderId
      ? `/me/drive/items/${encodeURIComponent(opts.folderId)}/children`
      : '/me/drive/root/children'
  const res = await driveFetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json()) as {
    value: Array<{
      id: string
      name: string
      size?: number
      file?: { mimeType?: string }
      folder?: unknown
      lastModifiedDateTime?: string
    }>
  }
  return data.value.map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size,
    mimeType: f.file?.mimeType,
    isFolder: !!f.folder,
    modifiedAt: f.lastModifiedDateTime,
  }))
}

async function fetchOneDriveFile(
  accessToken: string,
  body: { fileId: string; fileName?: string; size?: number; mimeType?: string },
) {
  const metaRes = await driveFetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(
      body.fileId,
    )}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const meta = (await metaRes.json()) as {
    name: string
    size?: number
    file?: { mimeType?: string }
  }
  const dlRes = await driveFetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(
      body.fileId,
    )}/content`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!dlRes.body) throw new Error('Empty download body')
  return {
    stream: dlRes.body,
    size: meta.size ?? body.size ?? 0,
    fileName: body.fileName ?? meta.name,
    mimeType:
      body.mimeType ?? meta.file?.mimeType ?? 'application/octet-stream',
  }
}

async function listDropboxFiles(
  accessToken: string,
  opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
  const endpoint = opts.search
    ? 'https://api.dropboxapi.com/2/files/search_v2'
    : 'https://api.dropboxapi.com/2/files/list_folder'
  const body = opts.search
    ? { query: opts.search }
    : { path: opts.folderId ?? '', recursive: false }
  const res = await driveFetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as
    | {
        entries: Array<{
          '.tag': 'file' | 'folder' | 'deleted'
          id: string
          name: string
          path_lower?: string
          size?: number
          server_modified?: string
        }>
      }
    | {
        matches: Array<{
          metadata: {
            metadata: {
              '.tag': 'file' | 'folder'
              id: string
              name: string
              path_lower?: string
              size?: number
            }
          }
        }>
      }
  const entries =
    'entries' in data
      ? data.entries
      : data.matches.map((m) => m.metadata.metadata)
  return entries
    .filter((e) => e['.tag'] !== 'deleted')
    .map((e) => ({
      id: e.path_lower ?? e.id,
      name: e.name,
      size: 'size' in e ? e.size : undefined,
      isFolder: e['.tag'] === 'folder',
      modifiedAt: 'server_modified' in e ? e.server_modified : undefined,
    }))
}

async function fetchDropboxFile(
  accessToken: string,
  body: { fileId: string; fileName?: string; size?: number; mimeType?: string },
) {
  const dlRes = await driveFetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: body.fileId }),
    },
  })
  if (!dlRes.body) throw new Error('Empty download body')
  const apiResult = dlRes.headers.get('Dropbox-API-Result')
  let name = body.fileName ?? 'download'
  let size = body.size ?? 0
  if (apiResult) {
    try {
      const parsed = JSON.parse(apiResult) as { name?: string; size?: number }
      name = body.fileName ?? parsed.name ?? name
      size = parsed.size ?? size
    } catch {}
  }
  return {
    stream: dlRes.body,
    size,
    fileName: name,
    mimeType:
      body.mimeType ??
      dlRes.headers.get('Content-Type') ??
      'application/octet-stream',
  }
}

async function listBoxFiles(
  accessToken: string,
  opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
  if (opts.search) {
    const params = new URLSearchParams({
      query: opts.search,
      limit: '200',
    })
    const res = await driveFetch(
      `https://api.box.com/2.0/search?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const data = (await res.json()) as {
      entries: Array<{
        type: 'file' | 'folder'
        id: string
        name: string
        size?: number
        modified_at?: string
      }>
    }
    return data.entries.map((e) => ({
      id: e.id,
      name: e.name,
      size: e.size,
      isFolder: e.type === 'folder',
      modifiedAt: e.modified_at,
    }))
  }
  const folderId = opts.folderId ?? '0'
  const res = await driveFetch(
    `https://api.box.com/2.0/folders/${encodeURIComponent(folderId)}/items?limit=200&fields=id,name,size,type,modified_at`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const data = (await res.json()) as {
    entries: Array<{
      type: 'file' | 'folder'
      id: string
      name: string
      size?: number
      modified_at?: string
    }>
  }
  return data.entries.map((e) => ({
    id: e.id,
    name: e.name,
    size: e.size,
    isFolder: e.type === 'folder',
    modifiedAt: e.modified_at,
  }))
}

async function fetchBoxFile(
  accessToken: string,
  body: { fileId: string; fileName?: string; size?: number; mimeType?: string },
) {
  const metaRes = await driveFetch(
    `https://api.box.com/2.0/files/${encodeURIComponent(body.fileId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const meta = (await metaRes.json()) as { name: string; size?: number }
  const dlRes = await driveFetch(
    `https://api.box.com/2.0/files/${encodeURIComponent(body.fileId)}/content`,
    { headers: { Authorization: `Bearer ${accessToken}` }, redirect: 'follow' },
  )
  if (!dlRes.body) throw new Error('Empty download body')
  return {
    stream: dlRes.body,
    size: meta.size ?? body.size ?? 0,
    fileName: body.fileName ?? meta.name,
    mimeType:
      body.mimeType ??
      dlRes.headers.get('Content-Type') ??
      'application/octet-stream',
  }
}
