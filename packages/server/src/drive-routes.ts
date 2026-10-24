// packages/server/src/drive-routes.ts
//
// The authenticated cloud-drive HTTP routes (F-101/F-505): list a provider's
// files, and transfer a chosen file server-side into S3. Both resolve/refresh/
// reauth the caller's per-user drive tokens, then delegate the actual API calls
// to ./drive-clients. Extracted verbatim from handler.ts. The dynamic
// `import('./transfer')` keeps its path (same src/ dir). No behavior change.

import { UpupErrorCode, UpupNetworkError } from '@useupup/core'
import type { UpupServerConfig } from './config'
import { getTokens, deleteTokens, resolveUserId } from './tokenStore'
import { isValidProvider, refreshAccessToken } from './oauth'
import { getDriveClient } from './drive-clients'
import {
    matchesAllowedType,
    runBeforeUploadHook,
    runPostCompletionHooks,
} from './upload-routes'
import { isJsonObject, type Responder } from './respond'
import { resolveStorage } from './resolve-storage'
import type { UpupClientMetadata } from './config'

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
        const files = await getDriveClient(provider).listFiles(
            tokens.accessToken,
            { folderId, search },
        )
        return res.json({ provider, files }, 200)
    } catch (err) {
        if (err instanceof UpupNetworkError && err.status === 401) {
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

/**
 * Disconnect a drive: drop the CALLER's stored tokens for this provider so the
 * next list/transfer demands a fresh sign-in. Scoped by resolveUserId (same
 * gate as list/transfer) to exactly one user+provider key; idempotent, so a
 * second logout (or one with no stored grant) is still 200.
 */
export async function handleDriveLogout(
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

    await deleteTokens(config.tokenStore, userId, provider)
    return res.json({ provider, ok: true }, 200)
}

/** The client's own restrictions for this transfer (T-7058). They are an
 *  ADDITIONAL tightening of the server policy, never a loosening: a malformed
 *  value is ignored, and the effective cap is min(server, client). */
function clientRestrictions(raw: unknown): { cap?: number; accept?: string } {
    if (!isJsonObject(raw)) return {}
    const { maxFileSize, accept } = raw
    return {
        ...(typeof maxFileSize === 'number' &&
        Number.isFinite(maxFileSize) &&
        maxFileSize > 0
            ? { cap: maxFileSize }
            : {}),
        ...(typeof accept === 'string' && accept.length <= 2000
            ? { accept }
            : {}),
    }
}

/** `accept` semantics of the client: `*` / `*\/*`, `type/*`, exact MIME, and
 *  `.ext` (matched on the provider's file name). */
function matchesAccept(accept: string, name: string, type: string): boolean {
    const entries = accept
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)
    if (entries.length === 0) return true
    const lower = name.toLowerCase()
    return entries.some(
        e =>
            e === '*' ||
            e === '*/*' ||
            (e.endsWith('/*') ? type.startsWith(e.slice(0, -1)) : e === type) ||
            (e.startsWith('.') && lower.endsWith(e)),
    )
}

/** Cancel an open drive stream. Best-effort and idempotent: a stream the
 *  transfer already consumed (locked or closed) rejects, which is fine. */
async function releaseStream(
    stream: ReadableStream<Uint8Array> | undefined,
): Promise<void> {
    if (!stream) return
    await stream.cancel().catch(() => undefined)
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
        metadata?: UpupClientMetadata
        restrictions?: unknown
    }
    try {
        const raw: unknown = await req.json()
        // null / array / scalar is a client error, not something to dereference.
        if (!isJsonObject(raw)) {
            return res.json({ error: 'Invalid JSON body' }, 400)
        }
        body = raw as typeof body
    } catch {
        // upup-catch: a malformed JSON body is surfaced to the client as 400 —
        // returned, not swallowed.
        return res.json({ error: 'Invalid JSON body' }, 400)
    }
    if (!body.fileId) return res.json({ error: 'Missing fileId' }, 400)

    // Fast client-declared-size reject (cheap early-out before we open the
    // drive stream); the AUTHORITATIVE cap is enforced against actual streamed
    // bytes inside transferDriveFileToS3 via `maxBytes` below (F-743).
    const client = clientRestrictions(body.restrictions)
    const maxBytes = Math.min(
        config.maxFileSize || Infinity,
        client.cap ?? Infinity,
    )
    if (typeof body.size === 'number' && body.size > maxBytes) {
        return res.json({ error: 'File too large' }, 413)
    }
    // One shared allowed-types policy with the upload path (F-743): honour the
    // `image/*` wildcard, and treat an ABSENT mimeType as a non-match against a
    // non-empty allowlist (`?? ''`) rather than silently bypassing the check.
    // This is only a cheap early-out on the CLIENT's claim (and the gate for the
    // fallback case where the provider reports no type); the claim is never
    // what gets stored — the provider-reported type is re-gated below (T-5467).
    if (!matchesAllowedType(body.mimeType ?? '', config.allowedTypes)) {
        return res.json({ error: 'File type not allowed' }, 415)
    }

    // The open drive response body, tracked outside the try so EVERY failure
    // after the provider fetch (a rejection, a throwing onBeforeUpload, a
    // throwing storage resolver, a failed transfer) releases the connection.
    let driveStream: ReadableStream<Uint8Array> | undefined
    try {
        const { stream, size, fileName, mimeType } = await getDriveClient(
            provider,
        ).fetchFile(tokens.accessToken, body)
        driveStream = stream
        // T-5467: `mimeType` is the PROVIDER's type (the client's claim only
        // fills in when the provider reports none), so re-gate it against
        // allowedTypes and run the same onBeforeUpload admission as the upload
        // routes, on the real name/type/size. Reject BEFORE any bytes are
        // consumed, and cancel the open drive stream so the connection is freed.
        const rejected = !matchesAllowedType(mimeType, config.allowedTypes)
            ? res.json({ error: 'File type not allowed' }, 415)
            : size > maxBytes
              ? // The provider's own size already breaks the (client or server)
                // cap: refuse before streaming, so nothing is stored.
                res.json({ error: 'File too large' }, 413)
              : client.accept !== undefined &&
                  !matchesAccept(client.accept, fileName, mimeType)
                ? res.json({ error: 'File type not allowed' }, 415)
                : await runBeforeUploadHook(
                      config,
                      {
                          name: fileName,
                          size,
                          type: mimeType,
                          ...(body.metadata !== undefined
                              ? { metadata: body.metadata }
                              : {}),
                      },
                      req,
                      res,
                  )
        if (rejected) {
            await releaseStream(driveStream)
            return rejected
        }
        // Resolved AFTER the drive reports the real name/type/size, so a
        // resolver can route on what is actually being transferred rather than
        // on the client's claim (#337).
        const storage = await resolveStorage(config, {
            req,
            phase: 'drive-transfer',
            userId,
            ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
            fileName,
            contentType: mimeType,
            size,
        })
        const { transferDriveFileToS3 } = await import('./transfer')
        const result = await transferDriveFileToS3({
            stream,
            size,
            fileName,
            mimeType,
            storage,
            // Enforce maxFileSize against the ACTUAL streamed bytes, and route
            // an abort-cleanup failure through onError instead of swallowing it
            // (F-743 / F-744).
            maxBytes: Number.isFinite(maxBytes) ? maxBytes : undefined,
            onError: config.onError,
            requestId: res.requestId,
            downloadUrlExpiresIn: config.downloadUrlExpiresIn,
        })
        // Post-commit: object durably in S3. A throwing onFileUploaded hook is
        // logged + swallowed by runPostCompletionHooks, never bubbling to the
        // catch below as a 500 (F-745).
        await runPostCompletionHooks(
            config,
            res,
            `files/${provider}/transfer`,
            req.method,
            async () => {
                if (config.hooks?.onFileUploaded)
                    await config.hooks.onFileUploaded(result, req)
            },
        )
        return res.json({ provider, ...result }, 200)
    } catch (err) {
        await releaseStream(driveStream)
        if (err instanceof UpupNetworkError && err.status === 401) {
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
