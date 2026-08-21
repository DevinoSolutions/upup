// packages/server/src/upload-routes.ts
//
// The HMAC upload trust boundary in isolation: upload-metadata validation, the
// S3 presign route, and the full multipart lifecycle (init/sign-part/complete/
// abort) with its token issue + verify + owner-binding + signed size-envelope
// enforcement. Extracted verbatim from handler.ts (F-101/F-505) so a reviewer
// can read the trust core without wading through OAuth or drive-provider code.
// The HMAC/token/envelope logic is UNCHANGED — this is a move, not a rewrite.

import { UpupErrorCode, type MultipartResumeResponse } from '@upupjs/core'
import type { UpupServerConfig, FileMetadata, UploadedFile } from './config'
import {
    generatePresignedUrl,
    initiateMultipartUpload,
    generatePresignedPartUrl,
    completeMultipartUpload,
    abortMultipartUpload,
    getMultipartUploadedSize,
    listMultipartParts,
} from './providers/aws'
import {
    assertUploadTokenSecret,
    signUploadToken,
    verifyUploadToken,
    UploadTokenError,
    DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
    type UploadTokenPayload,
} from './uploadToken'
import { resolveUserId, DEFAULT_USER_ID } from './tokenStore'
import { defaultKeyStrategy } from './key'
import { reportServerError, toSafeError } from './observability'
import { parseJsonBody, type Responder } from './respond'

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
    res: Responder,
    route: string,
    method: string,
): Response | null {
    if (!config.auth && !config.getUserId && !config.allowAnonymousUploads) {
        return res.fail(
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

/** How long after the original init an upload stays resumable, when the
 *  integrator sets no `multipartResumeWindowSeconds`. 24h — the client's
 *  localStorage session TTL, so neither side outlives the other. */
export const DEFAULT_MULTIPART_RESUME_WINDOW_SECONDS = 86_400

/** Verify an upload token, or return the 403 Response to send as-is. Collapses
 *  the three duplicated inner try/catch blocks in sign-part/complete/abort into
 *  one call site, and surfaces the token's own malformed/bad_signature/expired
 *  code at the HTTP boundary (previously all three collapsed into one 403).
 *  `allowExpired` is set by /multipart/resume ALONE — see the note on
 *  VerifyUploadTokenOptions; every other caller keeps today's expiry rejection. */
async function verifyTokenOrRespond(
    config: UpupServerConfig,
    token: string,
    res: Responder,
    route: string,
    method: string,
    allowExpired = false,
): Promise<UploadTokenPayload | Response> {
    assertUploadTokenSecret(config.uploadTokenSecret)
    try {
        return await verifyUploadToken(
            config.uploadTokenSecret,
            token,
            Date.now(),
            { allowExpired },
        )
    } catch (e) {
        if (e instanceof UploadTokenError) {
            reportServerError(config.onError, {
                route,
                method,
                status: 403,
                code: e.code,
                message: 'Invalid upload token',
                requestId: res.requestId,
                error: toSafeError(e),
            })
            return res.json(
                { error: 'Invalid upload token', code: e.code },
                403,
            )
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
    res: Responder,
    route: string,
    method: string,
): Promise<Response | null> {
    if (!config.getUserId) return null
    const currentUserId = await resolveUserId(config, req)
    const currentOwner =
        currentUserId === DEFAULT_USER_ID ? null : currentUserId
    if (currentOwner !== payload.uid) {
        return res.fail(
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

/** The single allowed-types policy, shared by the presign/multipart path and
 *  the drive-transfer path (F-743). No allowlist -> everything passes; an
 *  `image/*` entry honours the wildcard; an absent/empty type does NOT match a
 *  non-empty allowlist (callers pass `mimeType ?? ''` so a missing type is
 *  rejected identically on both paths, never bypassed). */
export function matchesAllowedType(
    type: string,
    allowedTypes?: string[],
): boolean {
    if (!allowedTypes?.length) return true
    return allowedTypes.some(allowed => {
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
    res: Responder,
): Promise<Response | null> {
    if (
        typeof body.name !== 'string' ||
        body.name.length === 0 ||
        typeof body.type !== 'string' ||
        typeof body.size !== 'number' ||
        !Number.isFinite(body.size) ||
        body.size < 0
    ) {
        return res.json(
            { error: 'Invalid file metadata', code: UpupErrorCode.BAD_REQUEST },
            400,
        )
    }

    if (config.maxFileSize && body.size > config.maxFileSize) {
        return res.json({ error: 'File too large' }, 413)
    }

    if (!matchesAllowedType(body.type, config.allowedTypes)) {
        return res.json({ error: 'File type not allowed' }, 415)
    }

    if (config.hooks?.onBeforeUpload) {
        const allowed = await config.hooks.onBeforeUpload(body, req)
        if (!allowed) {
            return res.json({ error: 'Upload rejected' }, 403)
        }
    }

    return null
}

/** Run integrator post-completion hooks (onFileUploaded/onUploadComplete) AFTER
 *  the object is durably written, in their OWN try so a throwing hook is logged
 *  via onError and swallowed — never re-coded as a 500 that would tell the
 *  client to retry an already-stored object (F-745). Shared by the multipart-
 *  complete and drive-transfer completion paths so both behave identically. */
export async function runPostCompletionHooks(
    config: UpupServerConfig,
    res: Responder,
    route: string,
    method: string,
    run: () => Promise<void>,
): Promise<void> {
    if (!config.hooks) return
    try {
        await run()
    } catch (error) {
        // upup-catch: a post-completion hook failure is REPORTED (below) and
        // deliberately swallowed — the upload already durably succeeded, so it
        // must not propagate and re-code the committed write as a 500 (F-745).
        reportServerError(config.onError, {
            route,
            method,
            status: 200,
            // No dedicated HOOK_ERROR code exists in @upupjs/core; the message
            // carries the real meaning — the upload itself succeeded.
            code: UpupErrorCode.STORAGE_ERROR,
            message:
                'Post-completion hook threw after a durably-completed upload; ' +
                'the upload succeeded and the client was returned 200 (F-745).',
            requestId: res.requestId,
            error: toSafeError(error),
        })
    }
}

export async function handlePresign(
    req: Request,
    config: UpupServerConfig,
    res: Responder,
): Promise<Response> {
    const gate = requireUploadAuthorization(config, res, 'presign', req.method)
    if (gate) return gate

    const parsed = await parseJsonBody(req, res)
    if (!parsed.ok) return parsed.response
    const body = parsed.value as FileMetadata

    const validationError = await validateUploadMetadata(req, config, body, res)
    if (validationError) return validationError

    const userId = await resolveUserId(config, req)
    if (userId === null) return res.json({ error: 'Unauthenticated' }, 401)
    const owner = userId === DEFAULT_USER_ID ? null : userId

    const key = (config.keyStrategy ?? defaultKeyStrategy)({
        userId: owner,
        fileName: body.name,
        contentType: body.type,
        size: body.size,
    })

    try {
        const result = await generatePresignedUrl(
            config.storage,
            key,
            body.type,
            body.size,
        )
        return res.json(result, 200)
    } catch (error) {
        return res.fail(
            'presign',
            req.method,
            500,
            UpupErrorCode.PRESIGN_FAILED,
            'Presign failed',
            error,
        )
    }
}

export async function handleMultipartInit(
    req: Request,
    config: UpupServerConfig,
    res: Responder,
): Promise<Response> {
    const gate = requireUploadAuthorization(
        config,
        res,
        'multipart/init',
        req.method,
    )
    if (gate) return gate

    const parsed = await parseJsonBody(req, res)
    if (!parsed.ok) return parsed.response
    const body = parsed.value as {
        name: string
        type: string
        size: number
        chunkSizeBytes?: number
    }

    try {
        const validationError = await validateUploadMetadata(
            req,
            config,
            body,
            res,
        )
        if (validationError) return validationError

        const userId = await resolveUserId(config, req)
        if (userId === null) return res.json({ error: 'Unauthenticated' }, 401)
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
        // `iat` stamps the moment this upload was born. /multipart/resume anchors
        // its window here and carries the value forward untouched, so no chain of
        // resumes can outlive the window the original init started.
        const issuedAt = Math.floor(Date.now() / 1000)
        const token = await signUploadToken(config.uploadTokenSecret, {
            k: result.key,
            u: result.uploadId,
            uid: owner,
            smin: 0,
            smax: body.size,
            exp: issuedAt + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
            iat: issuedAt,
        })
        return res.json({ ...result, token }, 200)
    } catch (error) {
        return res.fail(
            'multipart/init',
            req.method,
            500,
            UpupErrorCode.STORAGE_ERROR,
            'Multipart init failed',
            error,
        )
    }
}

/** S3/MinIO's "that multipart upload is gone" signal — it completed, was
 *  aborted, or a lifecycle rule reaped it. Matched on the modelled error name /
 *  wire Code only, NOT on a bare 404 status: a missing BUCKET also 404s, and
 *  mistaking that for a dead upload would tell the client its session is stale
 *  when the deployment is actually misconfigured. */
function isNoSuchUpload(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false
    const shape = error as { name?: unknown; Code?: unknown }
    return shape.name === 'NoSuchUpload' || shape.Code === 'NoSuchUpload'
}

/**
 * Re-attach to a multipart upload a previous page-load left in flight: hand
 * back the parts the provider already holds and a fresh token, so the client
 * can finish the file instead of re-uploading it from byte zero.
 *
 * Trust posture is deliberately identical to sign-part/complete/abort — the
 * token is the ONLY carrier. The client sends nothing but the token: no key, no
 * uploadId, and none comes back either (S2 stays closed). Sits after the global
 * `config.auth` gate like the other continuation routes, and owner-binds via
 * `enforceTokenOwner` whenever `getUserId` exists.
 *
 * The ONE relaxation: an expired `exp` is accepted, because handing an expired
 * token back as a fresh one is the entire point (an upload can easily outlive
 * the 1h TTL). A tighter bound replaces it — the resume window, measured from
 * the ORIGINAL init's `iat` and carried forward on every re-issue, so this is a
 * fixed-length extension of a token's life, never an open-ended renewal.
 */
export async function handleMultipartResume(
    req: Request,
    config: UpupServerConfig,
    res: Responder,
): Promise<Response> {
    const parsed = await parseJsonBody(req, res)
    if (!parsed.ok) return parsed.response
    const body = parsed.value as { token: string }
    try {
        const payload = await verifyTokenOrRespond(
            config,
            body.token,
            res,
            'multipart/resume',
            req.method,
            true, // allowExpired — the resume window below is the real bound
        )
        if (payload instanceof Response) return payload

        const nowSeconds = Math.floor(Date.now() / 1000)
        // Tokens minted before `iat` existed still resume: their init time is
        // recoverable from the expiry, since init is the only issuer and always
        // used the same TTL.
        const issuedAt =
            payload.iat ?? payload.exp - DEFAULT_UPLOAD_TOKEN_TTL_SECONDS
        const windowSeconds =
            config.multipartResumeWindowSeconds ??
            DEFAULT_MULTIPART_RESUME_WINDOW_SECONDS
        if (nowSeconds > issuedAt + windowSeconds) {
            // Code stays the literal 'expired' the token layer uses: the client
            // keys its mid-flight token refresh on `403 + code:'expired'`, and a
            // second spelling here would silently break that path.
            return res.fail(
                'multipart/resume',
                req.method,
                403,
                'expired',
                'Upload resume window has expired',
                new Error('resume window elapsed'),
            )
        }

        const owned = await enforceTokenOwner(
            config,
            req,
            payload,
            res,
            'multipart/resume',
            req.method,
        )
        if (owned) return owned

        let listed
        try {
            listed = await listMultipartParts(
                config.storage,
                payload.k,
                payload.u,
            )
        } catch (error) {
            // upup-catch: a dead upload is a 4xx, never a 5xx. The client drops
            // its session and starts fresh on any 4xx; a 5xx would read as
            // "try again later" and retry an upload that can never come back.
            if (isNoSuchUpload(error)) {
                return res.fail(
                    'multipart/resume',
                    req.method,
                    404,
                    UpupErrorCode.NOT_FOUND,
                    'Multipart upload no longer exists',
                    error,
                )
            }
            throw error
        }

        assertUploadTokenSecret(config.uploadTokenSecret)
        const token = await signUploadToken(config.uploadTokenSecret, {
            // Every binding is copied from the VERIFIED payload, unchanged: same
            // key, same uploadId, same owner, same size envelope. Only `exp`
            // moves — `iat` is the original, so the window does not roll.
            k: payload.k,
            u: payload.u,
            uid: payload.uid,
            smin: payload.smin,
            smax: payload.smax,
            // Clamp to the resume window, not a fresh full TTL. The window is
            // the operator's stated cap on how long a leaked token stays
            // usable (multipartResumeWindowSeconds); a re-issued token that
            // outlived it by up to a full TTL would make that cap — and the
            // documented leak mitigation — a lie.
            exp: Math.min(
                nowSeconds + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
                issuedAt + windowSeconds,
            ),
            iat: issuedAt,
        })

        const response: MultipartResumeResponse = {
            key: payload.k,
            token,
            parts: listed.parts,
        }
        return res.json(response, 200)
    } catch (error) {
        return res.fail(
            'multipart/resume',
            req.method,
            500,
            UpupErrorCode.STORAGE_ERROR,
            'Multipart resume failed',
            error,
        )
    }
}

export async function handleMultipartSignPart(
    req: Request,
    config: UpupServerConfig,
    res: Responder,
): Promise<Response> {
    const parsed = await parseJsonBody(req, res)
    if (!parsed.ok) return parsed.response
    const body = parsed.value as { token: string; partNumber: number }
    try {
        const payload = await verifyTokenOrRespond(
            config,
            body.token,
            res,
            'multipart/sign-part',
            req.method,
        )
        if (payload instanceof Response) return payload
        const owned = await enforceTokenOwner(
            config,
            req,
            payload,
            res,
            'multipart/sign-part',
            req.method,
        )
        if (owned) return owned
        const result = await generatePresignedPartUrl(
            config.storage,
            payload.k,
            payload.u,
            body.partNumber,
        )
        return res.json(result, 200)
    } catch (error) {
        return res.fail(
            'multipart/sign-part',
            req.method,
            500,
            UpupErrorCode.STORAGE_ERROR,
            'Multipart sign failed',
            error,
        )
    }
}

export async function handleMultipartComplete(
    req: Request,
    config: UpupServerConfig,
    res: Responder,
): Promise<Response> {
    const parsed = await parseJsonBody(req, res)
    if (!parsed.ok) return parsed.response
    const body = parsed.value as {
        token: string
        parts: Array<{ partNumber: number; eTag: string }>
    }
    try {
        const payload = await verifyTokenOrRespond(
            config,
            body.token,
            res,
            'multipart/complete',
            req.method,
        )
        if (payload instanceof Response) return payload
        const owned = await enforceTokenOwner(
            config,
            req,
            payload,
            res,
            'multipart/complete',
            req.method,
        )
        if (owned) return owned

        // S1 (multipart): smin/smax are SIGNED at init but must be ENFORCED here —
        // otherwise a client can init with a tiny declared size (tiny smax) and
        // upload arbitrarily large real parts, since sign-part/PUT never sees the
        // client-declared size. Sum the bytes S3 actually received (ListParts) and
        // reject + abort if outside the signed envelope.
        const uploadedSize = await getMultipartUploadedSize(
            config.storage,
            payload.k,
            payload.u,
        )
        if (uploadedSize < payload.smin || uploadedSize > payload.smax) {
            await abortMultipartUpload(config.storage, payload.k, payload.u)
            return res.json(
                { error: 'Upload size outside signed envelope' },
                403,
            )
        }

        const result = await completeMultipartUpload(
            config.storage,
            payload.k,
            payload.u,
            body.parts,
        )

        const uploaded: UploadedFile = {
            key: result.key,
            name: result.key.split('/').pop() ?? result.key,
            size: uploadedSize, // already computed above for the envelope check
            type: '', // not retained server-side on the multipart path
            url: result.downloadUrl ?? '',
        }

        // Post-commit: the object is durably in S3. A throwing hook is logged +
        // swallowed here, never bubbling to the catch below as a 500 (F-745).
        await runPostCompletionHooks(
            config,
            res,
            'multipart/complete',
            req.method,
            async () => {
                if (config.hooks?.onFileUploaded)
                    await config.hooks.onFileUploaded(uploaded, req)
                if (config.hooks?.onUploadComplete)
                    await config.hooks.onUploadComplete([uploaded], req)
            },
        )

        return res.json(result, 200)
    } catch (error) {
        return res.fail(
            'multipart/complete',
            req.method,
            500,
            UpupErrorCode.STORAGE_ERROR,
            'Multipart complete failed',
            error,
        )
    }
}

export async function handleMultipartAbort(
    req: Request,
    config: UpupServerConfig,
    res: Responder,
): Promise<Response> {
    const parsed = await parseJsonBody(req, res)
    if (!parsed.ok) return parsed.response
    const body = parsed.value as { token: string }
    try {
        const payload = await verifyTokenOrRespond(
            config,
            body.token,
            res,
            'multipart/abort',
            req.method,
        )
        if (payload instanceof Response) return payload
        const owned = await enforceTokenOwner(
            config,
            req,
            payload,
            res,
            'multipart/abort',
            req.method,
        )
        if (owned) return owned
        const result = await abortMultipartUpload(
            config.storage,
            payload.k,
            payload.u,
        )
        return res.json(result, 200)
    } catch (error) {
        return res.fail(
            'multipart/abort',
            req.method,
            500,
            UpupErrorCode.STORAGE_ERROR,
            'Multipart abort failed',
            error,
        )
    }
}
