// Issue #338: a hook to rewrite the presign-side responses, for deployments
// where the storage endpoint is not browser-reachable (same-origin proxy route,
// docker-internal MinIO hostname, VPC-only endpoints), plus surfacing an
// UpupError thrown by onBeforeUpload instead of the generic "Upload rejected".
//
// Drives the REAL handler with only the AWS provider mocked, so the hook runs
// where it actually runs: after validation and token issuance, immediately
// before the route responds.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpupQuotaError, UpupError, UpupErrorCode } from '@upupjs/core'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn().mockResolvedValue({
        key: 'u1/uuid/photo.png',
        uploadUrl: 'https://internal-minio:9000/bucket/u1/uuid/photo.png?sig',
        downloadUrl: 'https://internal-minio:9000/bucket/u1/uuid/photo.png?get',
        uploadHeaders: { 'Content-Type': 'image/png' },
        expiresIn: 3600,
    }),
    initiateMultipartUpload: vi.fn().mockResolvedValue({
        key: 'u1/uuid/big.zip',
        uploadId: 'mp-1',
        partSize: 5 * 1024 * 1024,
        expiresIn: 3600,
    }),
    generatePresignedPartUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://internal-minio:9000/bucket/part?sig',
        expiresIn: 3600,
    }),
    completeMultipartUpload: vi.fn().mockResolvedValue({ key: 'k' }),
    abortMultipartUpload: vi.fn().mockResolvedValue({ ok: true }),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
    checkStorageReachable: vi.fn().mockResolvedValue({ ok: true }),
    generateSignedPublicUrl: vi.fn().mockResolvedValue('https://signed'),
    DEFAULT_DOWNLOAD_URL_EXPIRES_IN: 3600 * 24 * 3,
    MIN_PART_SIZE: 5 * 1024 * 1024,
}))

import { createUpupHandler } from '../src/handler'
import type { UpupServerConfig } from '../src/config'

const base: UpupServerConfig = {
    storage: { type: 'minio', bucket: 'b', region: 'us-east-1' },
    uploadTokenSecret: 'a-stable-secret-at-least-16',
    allowAnonymousUploads: true,
}

function post(path: string, body: unknown): Request {
    return new Request(`https://app.example.com/api/upup${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    })
}

const meta = { name: 'photo.png', type: 'image/png', size: 1024 }

/** Swap the docker-internal host for the browser-reachable proxy route. */
const proxied = (url: string) =>
    url.replace('https://internal-minio:9000', 'https://app.example.com/api/s3')

beforeEach(() => {
    vi.clearAllMocks()
})

describe('hooks.onPresignResponse (#338)', () => {
    it('replaces the /presign payload when the hook returns an object', async () => {
        const handler = createUpupHandler({
            ...base,
            hooks: {
                onPresignResponse: res =>
                    'uploadUrl' in res
                        ? { ...res, uploadUrl: proxied(res.uploadUrl) }
                        : undefined,
            },
        })
        const body = (await (
            await handler(post('/presign', meta))
        ).json()) as Record<string, unknown>
        expect(body.uploadUrl).toBe(
            'https://app.example.com/api/s3/bucket/u1/uuid/photo.png?sig',
        )
        // Untouched fields survive the rewrite.
        expect(body.key).toBe('u1/uuid/photo.png')
        expect(body.expiresIn).toBe(3600)
    })

    it('replaces the /multipart/init payload, token included', async () => {
        const handler = createUpupHandler({
            ...base,
            hooks: {
                onPresignResponse: res => ({ ...res, region: 'eu-west-1' }),
            },
        })
        const body = (await (
            await handler(post('/multipart/init', meta))
        ).json()) as Record<string, unknown>
        expect(body.region).toBe('eu-west-1')
        expect(body.uploadId).toBe('mp-1')
        expect(typeof body.token).toBe('string')
    })

    it('replaces the /multipart/sign-part payload', async () => {
        const issue = createUpupHandler(base)
        const init = (await (
            await issue(post('/multipart/init', meta))
        ).json()) as { token: string }

        const handler = createUpupHandler({
            ...base,
            hooks: {
                onPresignResponse: res =>
                    'uploadUrl' in res
                        ? { ...res, uploadUrl: proxied(res.uploadUrl) }
                        : undefined,
            },
        })
        const body = (await (
            await handler(
                post('/multipart/sign-part', {
                    token: init.token,
                    partNumber: 1,
                }),
            )
        ).json()) as Record<string, unknown>
        expect(body.uploadUrl).toBe(
            'https://app.example.com/api/s3/bucket/part?sig',
        )
    })

    it('leaves the payload untouched when the hook returns void', async () => {
        const handler = createUpupHandler({
            ...base,
            hooks: {
                onPresignResponse: () => {
                    /* inspect only */
                },
            },
        })
        const body = (await (
            await handler(post('/presign', meta))
        ).json()) as Record<string, unknown>
        expect(body.uploadUrl).toBe(
            'https://internal-minio:9000/bucket/u1/uuid/photo.png?sig',
        )
    })

    it('reports phase, key, metadata and userId per response', async () => {
        const seen: Array<Record<string, unknown>> = []
        const config: UpupServerConfig = {
            ...base,
            allowAnonymousUploads: false,
            getUserId: async () => 'user-7',
            hooks: {
                onPresignResponse: (_res, ctx) => {
                    seen.push({
                        phase: ctx.phase,
                        key: ctx.key,
                        file: ctx.file,
                        metadata: ctx.metadata,
                        userId: ctx.userId,
                        isRequest: ctx.req instanceof Request,
                    })
                },
            },
        }
        const handler = createUpupHandler(config)
        await handler(post('/presign', meta))
        const init = (await (
            await handler(post('/multipart/init', meta))
        ).json()) as { token: string }
        await handler(
            post('/multipart/sign-part', { token: init.token, partNumber: 2 }),
        )

        expect(seen).toEqual([
            {
                phase: 'presign',
                key: 'u1/uuid/photo.png',
                file: meta,
                // This client sent no free-form routing metadata.
                metadata: undefined,
                userId: 'user-7',
                isRequest: true,
            },
            {
                phase: 'multipart-init',
                key: 'u1/uuid/big.zip',
                file: meta,
                metadata: undefined,
                userId: 'user-7',
                isRequest: true,
            },
            {
                // sign-part sees only a verified token, never the file.
                phase: 'multipart-sign-part',
                key: 'u1/uuid/big.zip',
                file: undefined,
                metadata: undefined,
                userId: 'user-7',
                isRequest: true,
            },
        ])
    })

    it('never runs for a request rejected before the route (403 AUTH_REQUIRED)', async () => {
        const onPresignResponse = vi.fn()
        const handler = createUpupHandler({
            storage: base.storage,
            uploadTokenSecret: 'a-stable-secret-at-least-16',
            hooks: { onPresignResponse },
        })
        const res = await handler(post('/presign', meta))
        expect(res.status).toBe(403)
        const body = (await res.json()) as { code: string }
        expect(body.code).toBe(UpupErrorCode.AUTH_REQUIRED)
        expect(onPresignResponse).not.toHaveBeenCalled()
    })

    it('never runs for a request the auth gate rejected (401)', async () => {
        const onPresignResponse = vi.fn()
        const onBeforeUpload = vi.fn().mockResolvedValue(true)
        const handler = createUpupHandler({
            ...base,
            auth: async () => false,
            hooks: { onPresignResponse, onBeforeUpload },
        })
        const res = await handler(post('/presign', meta))
        expect(res.status).toBe(401)
        expect(onBeforeUpload).not.toHaveBeenCalled()
        expect(onPresignResponse).not.toHaveBeenCalled()
    })
})

describe('onBeforeUpload rejection messages (#338)', () => {
    it('surfaces an UpupError thrown by the hook with its message and code', async () => {
        const handler = createUpupHandler({
            ...base,
            hooks: {
                onBeforeUpload: async () => {
                    throw new UpupQuotaError(
                        'Storage limit exceeded — upgrade to keep uploading',
                        100,
                        120,
                    )
                },
            },
        })
        const res = await handler(post('/presign', meta))
        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({
            error: 'Storage limit exceeded — upgrade to keep uploading',
            code: UpupErrorCode.QUOTA_EXCEEDED,
        })
    })

    it('surfaces it on /multipart/init too', async () => {
        const handler = createUpupHandler({
            ...base,
            hooks: {
                onBeforeUpload: async () => {
                    throw new UpupError('Docs are read-only today', 'READ_ONLY')
                },
            },
        })
        const res = await handler(post('/multipart/init', meta))
        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({
            error: 'Docs are read-only today',
            code: 'READ_ONLY',
        })
    })

    it('keeps the generic rejection when the hook returns false', async () => {
        const handler = createUpupHandler({
            ...base,
            hooks: { onBeforeUpload: async () => false },
        })
        const res = await handler(post('/presign', meta))
        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({ error: 'Upload rejected' })
    })

    it('does not leak a non-UpupError throw into the response body', async () => {
        const handler = createUpupHandler({
            ...base,
            onError: () => {},
            hooks: {
                onBeforeUpload: async () => {
                    throw new Error('db password is hunter2')
                },
            },
        })
        const res = await handler(post('/presign', meta))
        expect(res.status).toBe(500)
        const body = (await res.json()) as { error: string }
        expect(body.error).not.toContain('hunter2')
        expect(body.error).toBe('Internal error')
    })
})
