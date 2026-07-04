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
    type OAuthProvider,
} from './oauth'

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
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
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
        fields: 'files(id,name,size,mimeType,thumbnailLink,modifiedTime,iconLink)',
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
    return data.files.map(f => ({
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
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
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
    return data.value.map(f => ({
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
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
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
            : data.matches.map(m => m.metadata.metadata)
    return entries
        .filter(e => e['.tag'] !== 'deleted')
        .map(e => ({
            id: e.path_lower ?? e.id,
            name: e.name,
            size: 'size' in e ? e.size : undefined,
            isFolder: e['.tag'] === 'folder',
            modifiedAt: 'server_modified' in e ? e.server_modified : undefined,
        }))
}

async function fetchDropboxFile(
    accessToken: string,
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
) {
    const dlRes = await driveFetch(
        'https://content.dropboxapi.com/2/files/download',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Dropbox-API-Arg': JSON.stringify({ path: body.fileId }),
            },
        },
    )
    if (!dlRes.body) throw new Error('Empty download body')
    const apiResult = dlRes.headers.get('Dropbox-API-Result')
    let name = body.fileName ?? 'download'
    let size = body.size ?? 0
    if (apiResult) {
        try {
            const parsed = JSON.parse(apiResult) as {
                name?: string
                size?: number
            }
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
        return data.entries.map(e => ({
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
    return data.entries.map(e => ({
        id: e.id,
        name: e.name,
        size: e.size,
        isFolder: e.type === 'folder',
        modifiedAt: e.modified_at,
    }))
}

async function fetchBoxFile(
    accessToken: string,
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
) {
    const metaRes = await driveFetch(
        `https://api.box.com/2.0/files/${encodeURIComponent(body.fileId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const meta = (await metaRes.json()) as { name: string; size?: number }
    const dlRes = await driveFetch(
        `https://api.box.com/2.0/files/${encodeURIComponent(body.fileId)}/content`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
            redirect: 'follow',
        },
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
