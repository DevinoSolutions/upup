// packages/server/src/drive-routes.ts
//
// The authenticated cloud-drive HTTP routes (F-101/F-505): list a provider's
// files, and transfer a chosen file server-side into S3. Both resolve/refresh/
// reauth the caller's per-user drive tokens, then delegate the actual API calls
// to ./drive-clients. Extracted verbatim from handler.ts. The dynamic
// `import('./transfer')` keeps its path (same src/ dir). No behavior change.

import { UpupErrorCode } from '@upup/core'
import type { UpupServerConfig } from './config'
import { getTokens, deleteTokens, resolveUserId } from './tokenStore'
import { isValidProvider, refreshAccessToken } from './oauth'
import { listDriveFiles, fetchDriveFile } from './drive-clients'
import { type Responder } from './respond'

export async function handleListFiles(
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

export async function handleFileTransfer(
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
