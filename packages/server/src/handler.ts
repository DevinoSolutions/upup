import { UpupErrorCode, NON_S3_STORAGE_PROVIDERS } from '@upup/core'
import type { UpupServerConfig } from './config'
import { assertUploadTokenSecret } from './uploadToken'
import { getTokens, deleteTokens, resolveUserId } from './tokenStore'
import { handleHealth } from './health'
import { createResponder, type Responder } from './respond'
import {
    handlePresign,
    handleMultipartInit,
    handleMultipartSignPart,
    handleMultipartComplete,
    handleMultipartAbort,
} from './upload-routes'
import {
    handleOAuthRedirect,
    handleOAuthCallback,
    isValidProvider,
    refreshAccessToken,
} from './oauth'
import { listDriveFiles, fetchDriveFile } from './drive-clients'

export type RouteHandler = (req: Request) => Promise<Response>

export function createUpupHandler(config: UpupServerConfig): RouteHandler {
    // Secure-by-default: a stable token secret is mandatory (the multipart routes
    // are always live and issue/verify tokens), and drive/tokenStore use requires
    // a real identity resolver unless anonymous is explicitly opted into.
    assertUploadTokenSecret(config.uploadTokenSecret)

    // Fail-fast (F-657): storage.type accepted all 21 StorageProvider values, but
    // the S3 upload path (buildS3ClientConfig) is honored by none of them — it
    // always builds an @aws-sdk/client-s3 client via endpoint/forcePathStyle/
    // credentials/region. A provider with no S3-compatible surface (currently
    // just Azure) could never function, with zero compile- or startup-time
    // signal until now.
    const storageType = config.storage?.type
    if (
        typeof storageType === 'string' &&
        (NON_S3_STORAGE_PROVIDERS as ReadonlySet<string>).has(storageType)
    ) {
        throw new Error(
            `[@upup/server] storage.type "${storageType}" has no S3-compatible API and cannot be served. ` +
                'upup uploads via the S3 API — use an S3-compatible provider ' +
                '(aws, minio, r2, wasabi, …) and set storage.endpoint for non-AWS backends.',
        )
    }
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
        const res = createResponder(req, config)

        try {
            if (req.method === 'OPTIONS') {
                return res.noContent()
            }

            // Health check sits BEFORE the auth gate so uptime/deploy probes work
            // unauthenticated (F-426/F-428).
            if (req.method === 'GET' && path.endsWith('/health')) {
                return handleHealth(config, res.headers)
            }

            // Auth check
            if (config.auth) {
                const authorized = await config.auth(req)
                if (!authorized) {
                    return res.json({ error: 'Unauthorized' }, 401)
                }
            }

            // Route matching
            if (req.method === 'POST' && path.endsWith('/presign')) {
                return handlePresign(req, config, res)
            }
            if (req.method === 'POST' && path.endsWith('/multipart/init')) {
                return handleMultipartInit(req, config, res)
            }
            if (
                req.method === 'POST' &&
                path.endsWith('/multipart/sign-part')
            ) {
                return handleMultipartSignPart(req, config, res)
            }
            if (req.method === 'POST' && path.endsWith('/multipart/complete')) {
                return handleMultipartComplete(req, config, res)
            }
            if (req.method === 'POST' && path.endsWith('/multipart/abort')) {
                return handleMultipartAbort(req, config, res)
            }

            // OAuth routes: GET /auth/:provider and GET /auth/:provider/cb
            const authMatch = path.match(/\/auth\/([\w-]+?)(?:\/(cb))?$/)
            if (req.method === 'GET' && authMatch) {
                const provider = authMatch[1]
                const isCallback = authMatch[2] === 'cb'
                if (isCallback) {
                    return handleOAuthCallback(req, config, provider, res)
                }
                return handleOAuthRedirect(req, config, provider, res)
            }

            // File routes: GET /files/:provider and POST /files/:provider/transfer
            const filesMatch = path.match(
                /\/files\/([\w-]+?)(?:\/(transfer))?$/,
            )
            if (filesMatch) {
                const provider = filesMatch[1]
                const isTransfer = filesMatch[2] === 'transfer'
                if (req.method === 'POST' && isTransfer) {
                    return handleFileTransfer(req, config, provider, res)
                }
                if (req.method === 'GET' && !isTransfer) {
                    return handleListFiles(req, config, provider, res)
                }
            }

            return res.json({ error: 'Not found' }, 404)
        } catch (error) {
            // Transport safety net (F-421/F-104): a last-resort catch so an unhandled
            // throw anywhere in routing surfaces as a logged, CORS-headered, coded 500
            // instead of an uncaught framework exception with no log and no CORS. This
            // is the single home for last-resort handling — the express/fastify/hono/
            // next adapters need no per-adapter catch of their own.
            return res.fail(
                'router',
                req.method,
                500,
                UpupErrorCode.STORAGE_ERROR,
                'Internal error',
                error,
            )
        }
    }
}

async function handleListFiles(
    req: Request,
    config: UpupServerConfig,
    provider: string,
    res: Responder,
): Promise<Response> {
    if (!isValidProvider(provider)) {
        return res.json({ error: `Unknown provider: ${provider}` }, 400)
    }
    if (!config.tokenStore)
        return res.json({ error: 'tokenStore is required' }, 500)

    const userId = await resolveUserId(config, req)
    if (!userId) return res.json({ error: 'Unauthenticated' }, 401)

    let tokens = await getTokens(config.tokenStore, userId, provider)
    if (!tokens) {
        return res.json({ reauth: true, provider }, 401)
    }
    if (
        tokens.refreshToken &&
        tokens.expiresAt &&
        Date.now() > tokens.expiresAt - 30_000
    ) {
        const refreshed = await refreshAccessToken(
            config,
            provider,
            userId,
            tokens,
        )
        if (!refreshed) {
            return res.json({ reauth: true, provider }, 401)
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
        return res.json({ provider, files }, 200)
    } catch (err) {
        if ((err as { status?: number }).status === 401) {
            await deleteTokens(config.tokenStore, userId, provider)
            return res.json({ reauth: true, provider }, 401)
        }
        return res.fail(
            `files/${provider}`,
            req.method,
            500,
            UpupErrorCode.STORAGE_ERROR,
            'Drive request failed',
            err,
        )
    }
}

async function handleFileTransfer(
    req: Request,
    config: UpupServerConfig,
    provider: string,
    res: Responder,
): Promise<Response> {
    if (!isValidProvider(provider)) {
        return res.json({ error: `Unknown provider: ${provider}` }, 400)
    }
    if (!config.tokenStore)
        return res.json({ error: 'tokenStore is required' }, 500)

    const userId = await resolveUserId(config, req)
    if (!userId) return res.json({ error: 'Unauthenticated' }, 401)

    let tokens = await getTokens(config.tokenStore, userId, provider)
    if (!tokens) return res.json({ reauth: true, provider }, 401)
    if (
        tokens.refreshToken &&
        tokens.expiresAt &&
        Date.now() > tokens.expiresAt - 30_000
    ) {
        const refreshed = await refreshAccessToken(
            config,
            provider,
            userId,
            tokens,
        )
        if (!refreshed) {
            return res.json({ reauth: true, provider }, 401)
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
        return res.json({ error: 'Invalid JSON body' }, 400)
    }
    if (!body.fileId) return res.json({ error: 'Missing fileId' }, 400)

    if (
        config.maxFileSize &&
        typeof body.size === 'number' &&
        body.size > config.maxFileSize
    ) {
        return res.json({ error: 'File too large' }, 413)
    }
    if (
        config.allowedTypes?.length &&
        body.mimeType &&
        !config.allowedTypes.includes(body.mimeType)
    ) {
        return res.json({ error: 'File type not allowed' }, 415)
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
        })
        if (config.hooks?.onFileUploaded) {
            await config.hooks.onFileUploaded(result, req)
        }
        return res.json({ provider, ...result }, 200)
    } catch (err) {
        if ((err as { status?: number }).status === 401) {
            await deleteTokens(config.tokenStore, userId, provider)
            return res.json({ reauth: true, provider }, 401)
        }
        return res.fail(
            `files/${provider}/transfer`,
            req.method,
            500,
            UpupErrorCode.STORAGE_ERROR,
            'Drive request failed',
            err,
        )
    }
}
