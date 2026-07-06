// packages/server/src/upload-routes.ts
//
// The HMAC upload trust boundary in isolation: upload-metadata validation, the
// S3 presign route, and the full multipart lifecycle (init/sign-part/complete/
// abort) with its token issue + verify + owner-binding + signed size-envelope
// enforcement. Extracted verbatim from handler.ts (F-101/F-505) so a reviewer
// can read the trust core without wading through OAuth or drive-provider code.
// The HMAC/token/envelope logic is UNCHANGED — this is a move, not a rewrite.

import { UpupErrorCode } from '@upup/core'
import type { UpupServerConfig, FileMetadata, UploadedFile } from './config'
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

/** Verify an upload token, or return the 403 Response to send as-is. Collapses
 *  the three duplicated inner try/catch blocks in sign-part/complete/abort into
 *  one call site, and surfaces the token's own malformed/bad_signature/expired
 *  code at the HTTP boundary (previously all three collapsed into one 403). */
async function verifyTokenOrRespond(
    config: UpupServerConfig,
    token: string,
    res: Responder,
    route: string,
    method: string,
): Promise<UploadTokenPayload | Response> {
    assertUploadTokenSecret(config.uploadTokenSecret)
    try {
        return await verifyUploadToken(
            config.uploadTokenSecret,
            token,
            Date.now(),
        )
    } catch (e) {
        if (e instanceof UploadTokenError) {
            reportServerError(config.onError, {
                route,
                method,
                status: 403,
                code: e.code,
                message: 'Invalid upload token',
                requestId: res.headers['x-upup-request-id'],
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

function matchesAllowedType(type: string, allowedTypes?: string[]): boolean {
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
        const token = await signUploadToken(config.uploadTokenSecret, {
            k: result.key,
            u: result.uploadId,
            uid: owner,
            smin: 0,
            smax: body.size,
            exp:
                Math.floor(Date.now() / 1000) +
                DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
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

export async function handleMultipartSignPart(
    req: Request,
    config: UpupServerConfig,
    res: Responder,
): Promise<Response> {
    try {
        const body = (await req.json()) as { token: string; partNumber: number }
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
    try {
        const body = (await req.json()) as {
            token: string
            parts: Array<{ partNumber: number; eTag: string }>
        }
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
        if (config.hooks?.onFileUploaded)
            await config.hooks.onFileUploaded(uploaded, req)
        if (config.hooks?.onUploadComplete)
            await config.hooks.onUploadComplete([uploaded], req)

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
    try {
        const body = (await req.json()) as { token: string }
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
