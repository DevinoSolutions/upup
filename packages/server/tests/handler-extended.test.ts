import { describe, it, expect, vi } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    setTokens,
    DEFAULT_USER_ID,
} from '../src/tokenStore'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn().mockResolvedValue({
        key: 'uuid-test.jpg',
        publicUrl: 'https://bucket.s3.amazonaws.com/uuid-test.jpg',
        uploadUrl: 'https://bucket.s3.amazonaws.com/uuid-test.jpg?presigned',
        expiresIn: 3600,
    }),
    initiateMultipartUpload: vi.fn().mockResolvedValue({
        key: 'uuid-big.zip',
        uploadId: 'mp-123',
        partSize: 5 * 1024 * 1024,
        expiresIn: 3600,
    }),
    generatePresignedPartUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://bucket.s3.amazonaws.com/part?presigned',
        expiresIn: 3600,
    }),
    completeMultipartUpload: vi.fn().mockResolvedValue({
        key: 'uuid-big.zip',
        publicUrl: 'https://bucket.s3.amazonaws.com/uuid-big.zip',
        downloadUrl: 'https://bucket.s3.amazonaws.com/uuid-big.zip?signed',
        etag: '"final"',
    }),
    abortMultipartUpload: vi.fn().mockResolvedValue(undefined),
    listMultipartParts: vi.fn().mockResolvedValue({ parts: [] }),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
    checkStorageReachable: vi.fn().mockResolvedValue({ ok: true }),
}))

const config = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'handler-ext-secret-0123456789',
    allowAnonymousUploads: true,
}

// Shared shape for the JSON bodies read back from createUpupHandler's
// presign / multipart / health routes in this file -- most fields are
// optional since no single route response carries all of them, but `checks`
// (and its members) are always present together on the /health body.
type ResBody = {
    uploadId?: string
    key?: string
    token?: string
    uploadUrl?: string
    code?: string
    status?: string
    checks: { config: string; storage: string }
    reauth?: boolean
}

// ─────────────────────────────────────────────
// allowedTypes enforcement
// ─────────────────────────────────────────────
describe('handler — allowedTypes', () => {
    it('rejects disallowed file type', async () => {
        const handler = createUpupHandler({
            ...config,
            allowedTypes: ['image/*'],
        })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'doc.pdf',
                size: 100,
                type: 'application/pdf',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(415)
    })

    it('accepts allowed file type (exact match)', async () => {
        const handler = createUpupHandler({
            ...config,
            allowedTypes: ['image/jpeg'],
        })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'photo.jpg',
                size: 100,
                type: 'image/jpeg',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })

    it('accepts any type when allowedTypes not configured', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'anything.xyz',
                size: 100,
                type: 'application/octet-stream',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })
})

// ─────────────────────────────────────────────
// hooks.onBeforeUpload
// ─────────────────────────────────────────────
describe('handler — hooks.onBeforeUpload', () => {
    it('rejects upload when hook returns false', async () => {
        const handler = createUpupHandler({
            ...config,
            hooks: { onBeforeUpload: async () => false },
        })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'blocked.jpg',
                size: 100,
                type: 'image/jpeg',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(403)
    })

    it('allows upload when hook returns true', async () => {
        const handler = createUpupHandler({
            ...config,
            hooks: { onBeforeUpload: async () => true },
        })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'ok.jpg',
                size: 100,
                type: 'image/jpeg',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })

    it('hook receives file metadata', async () => {
        const hook = vi.fn().mockResolvedValue(true)
        const handler = createUpupHandler({
            ...config,
            hooks: { onBeforeUpload: hook },
        })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'check.jpg',
                size: 512,
                type: 'image/jpeg',
            }),
        })
        await handler(req)
        expect(hook).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'check.jpg',
                size: 512,
                type: 'image/jpeg',
            }),
            expect.anything(),
        )
    })
})

// ─────────────────────────────────────────────
// Multipart endpoints
// ─────────────────────────────────────────────
describe('handler — multipart', () => {
    it('applies allowedTypes wildcard validation to multipart init', async () => {
        const handler = createUpupHandler({
            ...config,
            allowedTypes: ['image/*'],
        })
        const req = new Request('http://localhost/multipart/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'big.zip',
                size: 50 * 1024 * 1024,
                type: 'application/zip',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(415)
    })

    it('initiates multipart upload and returns a token', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/multipart/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'big.zip',
                size: 50 * 1024 * 1024,
                type: 'application/zip',
            }),
        })
        const res = await handler(req)
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(200)
        expect(body.uploadId).toBeDefined()
        expect(body.key).toBeDefined()
        expect(typeof body.token).toBe('string')
    })

    it('signs a part using the issued token', async () => {
        const handler = createUpupHandler(config)
        const init = (await (
            await handler(
                new Request('http://localhost/multipart/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'big.zip',
                        size: 50 * 1024 * 1024,
                        type: 'application/zip',
                    }),
                }),
            )
        ).json()) as ResBody

        const res = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: init.token, partNumber: 1 }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(200)
        expect(body.uploadUrl).toBeDefined()
    })

    it('rejects sign-part with a forged token (403)', async () => {
        const handler = createUpupHandler(config)
        const res = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: 'forged.token', partNumber: 1 }),
            }),
        )
        expect(res.status).toBe(403)
    })

    it('completes multipart upload using the issued token', async () => {
        const handler = createUpupHandler(config)
        const init = (await (
            await handler(
                new Request('http://localhost/multipart/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'big.zip',
                        size: 50 * 1024 * 1024,
                        type: 'application/zip',
                    }),
                }),
            )
        ).json()) as ResBody

        const res = await handler(
            new Request('http://localhost/multipart/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: init.token,
                    parts: [{ partNumber: 1, eTag: '"etag1"' }],
                }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(200)
        expect(body.key).toBeDefined()
    })
})

// ─────────────────────────────────────────────
// hooks.onFileUploaded / onUploadComplete fire on multipart-complete (F-109)
// ─────────────────────────────────────────────
describe('handler — hooks fire on multipart-complete (F-109)', () => {
    it('fires onFileUploaded and onUploadComplete exactly once on /multipart/complete', async () => {
        const onFileUploaded = vi.fn().mockResolvedValue(undefined)
        const onUploadComplete = vi.fn().mockResolvedValue(undefined)
        const handler = createUpupHandler({
            ...config,
            hooks: { onFileUploaded, onUploadComplete },
        })

        const init = (await (
            await handler(
                new Request('http://localhost/multipart/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'big.zip',
                        size: 50 * 1024 * 1024,
                        type: 'application/zip',
                    }),
                }),
            )
        ).json()) as ResBody

        await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: init.token, partNumber: 1 }),
            }),
        )

        const res = await handler(
            new Request('http://localhost/multipart/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: init.token,
                    parts: [{ partNumber: 1, eTag: '"etag1"' }],
                }),
            }),
        )
        expect(res.status).toBe(200)

        expect(onFileUploaded).toHaveBeenCalledTimes(1)
        expect(onFileUploaded).toHaveBeenCalledWith(
            expect.objectContaining({ key: init.key }),
            expect.anything(),
        )
        expect(onUploadComplete).toHaveBeenCalledTimes(1)
        expect(onUploadComplete).toHaveBeenCalledWith(
            [expect.objectContaining({ key: init.key })],
            expect.anything(),
        )
    })

    it('does not fire either hook on a /presign request', async () => {
        const onFileUploaded = vi.fn().mockResolvedValue(undefined)
        const onUploadComplete = vi.fn().mockResolvedValue(undefined)
        const handler = createUpupHandler({
            ...config,
            hooks: { onFileUploaded, onUploadComplete },
        })

        const res = await handler(
            new Request('http://localhost/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'photo.jpg',
                    size: 100,
                    type: 'image/jpeg',
                }),
            }),
        )
        expect(res.status).toBe(200)

        expect(onFileUploaded).not.toHaveBeenCalled()
        expect(onUploadComplete).not.toHaveBeenCalled()
    })
})

describe('handler — CORS', () => {
    it('responds to OPTIONS with configured CORS headers', async () => {
        const handler = createUpupHandler({
            ...config,
            cors: {
                allowedOrigins: ['http://localhost:3000'],
                allowedHeaders: ['Content-Type', 'X-Test'],
            },
        })
        const req = new Request('http://localhost/presign', {
            method: 'OPTIONS',
            headers: { origin: 'http://localhost:3000' },
        })
        const res = await handler(req)

        expect(res.status).toBe(204)
        expect(res.headers.get('access-control-allow-origin')).toBe(
            'http://localhost:3000',
        )
        expect(res.headers.get('access-control-allow-headers')).toContain(
            'X-Test',
        )
    })

    it('does not reflect disallowed origins', async () => {
        const handler = createUpupHandler({
            ...config,
            cors: { allowedOrigins: ['https://app.example.com'] },
        })
        const req = new Request('http://localhost/presign', {
            method: 'OPTIONS',
            headers: { origin: 'https://evil.example.com' },
        })
        const res = await handler(req)

        expect(res.status).toBe(204)
        expect(res.headers.get('access-control-allow-origin')).toBeNull()
    })

    // Regression: server-mode Drive routes are fetched cross-origin from the
    // browser, so their actual (non-OPTIONS) responses — including 401 reauth
    // and success — MUST carry Access-Control-Allow-Origin, or the browser
    // blocks them and the client sees "Failed to fetch" (never learning it
    // must re-auth). Caught by live stealth-chrome verification of @upupjs/next.
    const serverCors = (tokenStore = new InMemoryTokenStore()) => ({
        ...config,
        tokenStore,
        allowAnonymous: true,
        providers: { googleDrive: { clientId: 'gid', clientSecret: 'gsec' } },
        cors: { allowedOrigins: ['http://localhost:53052'] },
    })

    it('sets CORS header on GET /files/:provider 401 reauth response', async () => {
        const handler = createUpupHandler(serverCors())
        const res = await handler(
            new Request('http://localhost/files/google-drive', {
                method: 'GET',
                headers: { origin: 'http://localhost:53052' },
            }),
        )
        expect(res.status).toBe(401)
        expect(((await res.json()) as ResBody).reauth).toBe(true)
        expect(res.headers.get('access-control-allow-origin')).toBe(
            'http://localhost:53052',
        )
        expect(res.headers.get('access-control-allow-credentials')).toBe('true')
    })

    it('sets CORS header on GET /files/:provider success response', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ files: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        )
        const handler = createUpupHandler(serverCors(store))
        const res = await handler(
            new Request('http://localhost/files/google-drive', {
                method: 'GET',
                headers: { origin: 'http://localhost:53052' },
            }),
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('access-control-allow-origin')).toBe(
            'http://localhost:53052',
        )
        expect(res.headers.get('access-control-allow-credentials')).toBe('true')
        fetchSpy.mockRestore()
    })

    it('sets CORS header on POST /files/:provider/transfer 401 reauth response', async () => {
        const handler = createUpupHandler(serverCors())
        const res = await handler(
            new Request('http://localhost/files/google-drive/transfer', {
                method: 'POST',
                headers: {
                    origin: 'http://localhost:53052',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileId: 'f1' }),
            }),
        )
        expect(res.status).toBe(401)
        expect(res.headers.get('access-control-allow-origin')).toBe(
            'http://localhost:53052',
        )
        expect(res.headers.get('access-control-allow-credentials')).toBe('true')
    })
})

// ─────────────────────────────────────────────
// OAuth redirect_uri consistency (Workstream D)
// ─────────────────────────────────────────────
// The redirect_uri in the token-exchange POST MUST byte-for-byte match the one
// sent in the initial authorization request, or Google rejects the exchange
// with `redirect_uri_mismatch`. callbackUrlFor() is invoked from BOTH the
// /auth/:provider path and the /auth/:provider/cb path, so it must derive the
// same canonical callback URL from either. Caught live in Workstream D
// (server-mode Google Drive): consent succeeded but the token exchange failed
// because the callback path produced a doubled redirect_uri.
describe('handler — OAuth redirect_uri consistency', () => {
    const oauthConfig = (tokenStore: InMemoryTokenStore) => ({
        ...config,
        tokenStore,
        allowAnonymous: true,
        providers: { googleDrive: { clientId: 'gid', clientSecret: 'gsec' } },
    })

    it('uses the same redirect_uri for the auth request and the token exchange', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(oauthConfig(store))

        // 1. Authorization request → capture redirect_uri + state from Location.
        const authRes = await handler(
            new Request('http://localhost:53060/auth/google-drive', {
                method: 'GET',
            }),
        )
        expect(authRes.status).toBe(302)
        const authLocation = new URL(authRes.headers.get('location') as string)
        const authRedirectUri = authLocation.searchParams.get('redirect_uri')
        const state = authLocation.searchParams.get('state') as string
        expect(authRedirectUri).toBe(
            'http://localhost:53060/auth/google-drive/cb',
        )

        // 2. Callback → capture redirect_uri sent in the token-exchange POST.
        let tokenRedirectUri: string | null = null
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementation(async (_input, init) => {
                const body = init?.body as URLSearchParams | undefined
                if (
                    tokenRedirectUri === null &&
                    body &&
                    typeof body.get === 'function'
                ) {
                    tokenRedirectUri = body.get('redirect_uri')
                }
                return new Response(
                    JSON.stringify({ access_token: 'AT', expires_in: 3600 }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                )
            })

        await handler(
            new Request(
                `http://localhost:53060/auth/google-drive/cb?code=AUTHCODE&state=${state}`,
                { method: 'GET' },
            ),
        )
        fetchSpy.mockRestore()

        expect(tokenRedirectUri).toBe(authRedirectUri)
        expect(tokenRedirectUri).toBe(
            'http://localhost:53060/auth/google-drive/cb',
        )
    })
})

// ─────────────────────────────────────────────
// Presign edge cases
// ─────────────────────────────────────────────
describe('handler — presign edge cases', () => {
    it('rejects GET on presign endpoint', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/presign', { method: 'GET' })
        const res = await handler(req)
        expect([404, 405]).toContain(res.status)
    })

    it('presign rejects empty body (400)', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })
        const res = await handler(req)
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(400)
        expect(body.code).toBe('BAD_REQUEST')
    })

    it('presign rejects malformed JSON (400, not an unhandled throw)', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{not valid json',
        })
        const res = await handler(req)
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(400)
        expect(body.code).toBe('BAD_REQUEST')
    })

    it('presign with a full valid body still succeeds (200)', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'valid.jpg',
                size: 100,
                type: 'image/jpeg',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })

    it('auth success allows presign', async () => {
        const handler = createUpupHandler({ ...config, auth: async () => true })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'test.jpg',
                size: 100,
                type: 'image/jpeg',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })
})

// ─────────────────────────────────────────────
// Adversarial presign metadata: validateUploadMetadata only checks
// name/type/size SHAPE (non-empty string / finite non-negative number) — it
// does not bound length or strip control characters. Sanitization happens
// downstream in defaultKeyStrategy's sanitizeFilename call, before the name
// ever reaches the S3 object key. Pin BOTH halves of that contract: the
// route does not reject on shape grounds, and the raw adversarial name
// never survives into the key handed to the storage layer (asserted via
// generatePresignedUrl's actual call argument — the mocked response body's
// `key` is a fixed stub and proves nothing here).
// ─────────────────────────────────────────────
describe('handler — presign adversarial filename metadata', () => {
    it('accepts a 10,000-char filename (not rejected at validation) but never lets it reach the S3 key unsanitized', async () => {
        const handler = createUpupHandler(config)
        const hugeName = `${'x'.repeat(10_000)}.png`
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: hugeName,
                size: 100,
                type: 'image/png',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)

        const { generatePresignedUrl } = await import('../src/providers/aws')
        const lastCall = vi.mocked(generatePresignedUrl).mock.calls.at(-1)!
        const actualKey = lastCall[1] as string
        // sanitizeFilename bounds the filename segment to 128 chars — the
        // 10,000-char raw name must never reach the object key.
        expect(actualKey.length).toBeLessThan(200)
    })

    it('accepts a filename containing a null byte (not rejected at validation) but strips it before it reaches the S3 key', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'evil\0name.png',
                size: 100,
                type: 'image/png',
            }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)

        const { generatePresignedUrl } = await import('../src/providers/aws')
        const lastCall = vi.mocked(generatePresignedUrl).mock.calls.at(-1)!
        const actualKey = lastCall[1] as string
        expect(actualKey).not.toContain('\0')
    })
})

// ─────────────────────────────────────────────
// /health route wiring (P4/C4)
// ─────────────────────────────────────────────
describe('handler — GET /health', () => {
    it('is reachable WITHOUT auth even when config.auth is set', async () => {
        const authFn = vi.fn().mockResolvedValue(false)
        const handler = createUpupHandler({ ...config, auth: authFn })
        const res = await handler(
            new Request('http://localhost/health', { method: 'GET' }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(200)
        expect(body.status).toBeDefined()
        expect(authFn).not.toHaveBeenCalled()
    })

    it('reports config ok and storage ok for a complete, reachable config', async () => {
        const handler = createUpupHandler(config)
        const res = await handler(
            new Request('http://localhost/health', { method: 'GET' }),
        )
        const body = (await res.json()) as ResBody
        expect(body.checks.config).toBe('ok')
        expect(body.checks.storage).toBe('ok')
    })
})

// ─────────────────────────────────────────────
// Error channel — server observability (P4/C1)
// ─────────────────────────────────────────────
describe('handler — error channel: 500s carry a machine code + invoke onError', () => {
    it('a presign failure returns {code: PRESIGN_FAILED} and fires config.onError once', async () => {
        const { generatePresignedUrl } = await import('../src/providers/aws')
        vi.mocked(generatePresignedUrl).mockRejectedValueOnce(
            new Error('S3 down'),
        )

        const onError = vi.fn()
        const handler = createUpupHandler({ ...config, onError })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'test.jpg',
                size: 100,
                type: 'image/jpeg',
            }),
        })
        const res = await handler(req)
        const body = (await res.json()) as ResBody

        expect(res.status).toBe(500)
        expect(body.code).toBe('PRESIGN_FAILED')
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]![0]).toMatchObject({
            route: 'presign',
            status: 500,
            code: 'PRESIGN_FAILED',
        })
    })
})

// ─────────────────────────────────────────────
// Error channel — upload-token codes surfaced at the boundary (P4/C2)
// ─────────────────────────────────────────────
describe('handler — error channel: upload-token codes', () => {
    it('a forged token still 403s, and now carries {code: bad_signature} (well-shaped, wrong sig)', async () => {
        const handler = createUpupHandler(config)
        const res = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: 'forged.token', partNumber: 1 }),
            }),
        )
        const body = (await res.json()) as ResBody
        // Keep-green: status semantics are UNCHANGED — code is additive.
        // 'forged.token' has the body.sig SHAPE (one dot, two non-empty parts),
        // so verifyUploadToken reaches the signature check and fails there —
        // i.e. bad_signature, not malformed. A truly malformed (no-dot) token
        // is covered separately below.
        expect(res.status).toBe(403)
        expect(body.code).toBe('bad_signature')
    })

    it('a token with no separator at all → 403 {code: malformed}', async () => {
        const handler = createUpupHandler(config)
        const res = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: 'not-a-token-at-all',
                    partNumber: 1,
                }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('malformed')
    })

    it('a validly-shaped token signed with the WRONG secret → 403 {code: bad_signature}', async () => {
        const { signUploadToken } = await import('../src/uploadToken')
        const wrongSecretToken = await signUploadToken(
            'a-totally-different-secret-key-000',
            {
                k: 'some-key.jpg',
                u: 'mp-999',
                uid: null,
                smin: 0,
                smax: 100,
                exp: Math.floor(Date.now() / 1000) + 3600,
            },
        )
        const handler = createUpupHandler(config)
        const res = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: wrongSecretToken,
                    partNumber: 1,
                }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('bad_signature')
    })

    it('an expired token → 403 {code: expired}', async () => {
        const { signUploadToken } = await import('../src/uploadToken')
        const expiredToken = await signUploadToken(config.uploadTokenSecret, {
            k: 'some-key.jpg',
            u: 'mp-999',
            uid: null,
            smin: 0,
            smax: 100,
            exp: Math.floor(Date.now() / 1000) - 10, // already expired
        })
        const handler = createUpupHandler(config)
        const res = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: expiredToken, partNumber: 1 }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('expired')
    })
})

// ─────────────────────────────────────────────
// F-110: secure-by-default upload authorization
// ─────────────────────────────────────────────
describe('handler — anonymous upload gate (F-110)', () => {
    const anonConfig = {
        storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
        uploadTokenSecret: 'handler-ext-f110-secret-0123456789',
    }

    it('rejects anonymous /presign with 403 AUTH_REQUIRED when no auth/getUserId/allowAnonymousUploads', async () => {
        const handler = createUpupHandler(anonConfig)
        const res = await handler(
            new Request('http://localhost/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'photo.jpg',
                    size: 100,
                    type: 'image/jpeg',
                }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('AUTH_REQUIRED')
    })

    it('rejects anonymous /multipart/init with 403 AUTH_REQUIRED when no auth/getUserId/allowAnonymousUploads', async () => {
        const handler = createUpupHandler(anonConfig)
        const res = await handler(
            new Request('http://localhost/multipart/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'big.zip',
                    size: 10_000_000,
                    type: 'application/zip',
                }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('AUTH_REQUIRED')
    })

    it('allows /presign with allowAnonymousUploads:true', async () => {
        const handler = createUpupHandler({
            ...anonConfig,
            allowAnonymousUploads: true,
        })
        const res = await handler(
            new Request('http://localhost/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'photo.jpg',
                    size: 100,
                    type: 'image/jpeg',
                }),
            }),
        )
        expect(res.status).toBe(200)
    })

    it('allows /presign with config.auth set (seam intact)', async () => {
        const handler = createUpupHandler({
            ...anonConfig,
            auth: async () => true,
        })
        const res = await handler(
            new Request('http://localhost/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'photo.jpg',
                    size: 100,
                    type: 'image/jpeg',
                }),
            }),
        )
        expect(res.status).toBe(200)
    })

    it('allows /presign with config.getUserId set', async () => {
        const handler = createUpupHandler({
            ...anonConfig,
            getUserId: async () => 'u1',
        })
        const res = await handler(
            new Request('http://localhost/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'photo.jpg',
                    size: 100,
                    type: 'image/jpeg',
                }),
            }),
        )
        expect(res.status).toBe(200)
    })
})

// ─────────────────────────────────────────────
// F-106: enforce token uid on continuation routes where identity exists
// ─────────────────────────────────────────────
describe('handler — multipart uid binding (F-106)', () => {
    const identityConfig = {
        storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
        uploadTokenSecret: 'handler-ext-f106-secret-0123456789',
        getUserId: async (req: Request) => req.headers.get('x-uid'),
    }

    const initAs = async (uid: string) => {
        const handler = createUpupHandler(identityConfig)
        const res = await handler(
            new Request('http://localhost/multipart/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-uid': uid },
                body: JSON.stringify({
                    name: 'big.zip',
                    size: 50 * 1024 * 1024,
                    type: 'application/zip',
                }),
            }),
        )
        const body = (await res.json()) as ResBody
        return body.token as string
    }

    it('rejects sign-part when the resolved uid differs from the token owner', async () => {
        const token = await initAs('alice')
        const handler = createUpupHandler(identityConfig)
        const res = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-uid': 'bob' },
                body: JSON.stringify({ token, partNumber: 1 }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('AUTH_DENIED')
    })

    it('allows sign-part when the resolved uid matches the token owner', async () => {
        const token = await initAs('alice')
        const handler = createUpupHandler(identityConfig)
        const res = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-uid': 'alice',
                },
                body: JSON.stringify({ token, partNumber: 1 }),
            }),
        )
        expect(res.status).toBe(200)
    })

    it('rejects complete when the resolved uid differs from the token owner', async () => {
        const token = await initAs('alice')
        const handler = createUpupHandler(identityConfig)
        const res = await handler(
            new Request('http://localhost/multipart/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-uid': 'bob' },
                body: JSON.stringify({
                    token,
                    parts: [{ partNumber: 1, eTag: '"etag1"' }],
                }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('AUTH_DENIED')
    })

    it('preserves the token-possession model when no getUserId resolver exists', async () => {
        const anonConfig = {
            storage: {
                type: 'aws',
                bucket: 'test-bucket',
                region: 'us-east-1',
            },
            uploadTokenSecret: 'handler-ext-f106-anon-secret-0123456789',
            allowAnonymousUploads: true,
        }
        const handler = createUpupHandler(anonConfig)
        const init = (await (
            await handler(
                new Request('http://localhost/multipart/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'big.zip',
                        size: 50 * 1024 * 1024,
                        type: 'application/zip',
                    }),
                }),
            )
        ).json()) as ResBody

        const first = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: init.token, partNumber: 1 }),
            }),
        )
        const second = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: init.token, partNumber: 2 }),
            }),
        )
        expect(first.status).toBe(200)
        expect(second.status).toBe(200)
    })
})

// ─────────────────────────────────────────────
// multipart-abort trust boundary: the forged-token / uid-binding /
// token-possession guarantees already proven above for sign-part/complete
// (F-106) must also hold for /multipart/abort.
// ─────────────────────────────────────────────
describe('handler — multipart abort trust boundary', () => {
    const identityConfig = {
        storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
        uploadTokenSecret: 'handler-ext-abort-secret-0123456789',
        getUserId: async (req: Request) => req.headers.get('x-uid'),
    }

    const initAs = async (uid: string) => {
        const handler = createUpupHandler(identityConfig)
        const res = await handler(
            new Request('http://localhost/multipart/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-uid': uid },
                body: JSON.stringify({
                    name: 'big.zip',
                    size: 50 * 1024 * 1024,
                    type: 'application/zip',
                }),
            }),
        )
        return (await res.json()) as ResBody
    }

    it('a client with a forged upload token cannot abort a multipart upload, and receives 403 with the invalid-token code', async () => {
        const handler = createUpupHandler(config)
        const res = await handler(
            new Request('http://localhost/multipart/abort', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: 'forged.token' }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('bad_signature')
    })

    it("an authenticated user whose id differs from the token's bound uid cannot abort, and receives 403 AUTH_DENIED", async () => {
        const init = await initAs('alice')
        const handler = createUpupHandler(identityConfig)
        const res = await handler(
            new Request('http://localhost/multipart/abort', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-uid': 'bob',
                },
                body: JSON.stringify({ token: init.token }),
            }),
        )
        const body = (await res.json()) as ResBody
        expect(res.status).toBe(403)
        expect(body.code).toBe('AUTH_DENIED')
    })

    it("the token's owner can abort their own multipart upload, and receives 200 with abortMultipartUpload invoked on storage", async () => {
        const init = await initAs('alice')
        const { abortMultipartUpload } = await import('../src/providers/aws')
        const handler = createUpupHandler(identityConfig)
        const res = await handler(
            new Request('http://localhost/multipart/abort', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-uid': 'alice',
                },
                body: JSON.stringify({ token: init.token }),
            }),
        )
        expect(res.status).toBe(200)
        expect(abortMultipartUpload).toHaveBeenCalledWith(
            identityConfig.storage,
            init.key,
            init.uploadId,
        )
    })

    it('a caller can abort with bare token possession when no getUserId resolver is configured, and receives 200', async () => {
        const anonConfig = {
            storage: {
                type: 'aws',
                bucket: 'test-bucket',
                region: 'us-east-1',
            },
            uploadTokenSecret: 'handler-ext-abort-anon-secret-0123456789',
            allowAnonymousUploads: true,
        }
        const handler = createUpupHandler(anonConfig)
        const init = (await (
            await handler(
                new Request('http://localhost/multipart/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'big.zip',
                        size: 50 * 1024 * 1024,
                        type: 'application/zip',
                    }),
                }),
            )
        ).json()) as ResBody

        const res = await handler(
            new Request('http://localhost/multipart/abort', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: init.token }),
            }),
        )
        expect(res.status).toBe(200)
    })
})

// ─────────────────────────────────────────────
// F-107: pin + document the upload-token replay window
// ─────────────────────────────────────────────
describe('handler — upload-token replay (F-107)', () => {
    it('a valid token may be replayed to sign-part any number of times within its TTL', async () => {
        const replayConfig = {
            storage: {
                type: 'aws',
                bucket: 'test-bucket',
                region: 'us-east-1',
            },
            uploadTokenSecret: 'handler-ext-f107-secret-0123456789',
            allowAnonymousUploads: true,
        }
        const handler = createUpupHandler(replayConfig)
        const init = (await (
            await handler(
                new Request('http://localhost/multipart/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'big.zip',
                        size: 50 * 1024 * 1024,
                        type: 'application/zip',
                    }),
                }),
            )
        ).json()) as ResBody

        const first = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: init.token, partNumber: 1 }),
            }),
        )
        const second = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: init.token, partNumber: 1 }),
            }),
        )
        const third = await handler(
            new Request('http://localhost/multipart/sign-part', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: init.token, partNumber: 1 }),
            }),
        )
        expect(first.status).toBe(200)
        expect(second.status).toBe(200)
        expect(third.status).toBe(200)
    })
})

// ─────────────────────────────────────────────
// F-740: malformed JSON on the multipart continuation routes is a client
// error (400 BAD_REQUEST), never a 500 STORAGE_ERROR reported to onError.
// ─────────────────────────────────────────────
describe('handler — malformed JSON on continuation routes → 400 (F-740)', () => {
    for (const route of [
        'multipart/sign-part',
        'multipart/complete',
        'multipart/abort',
    ]) {
        it(`${route} rejects malformed JSON with 400 BAD_REQUEST (not 500), and does not fire onError`, async () => {
            const onError = vi.fn()
            const handler = createUpupHandler({ ...config, onError })
            const res = await handler(
                new Request(`http://localhost/${route}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{not valid json',
                }),
            )
            const body = (await res.json()) as ResBody
            expect(res.status).toBe(400)
            expect(body.code).toBe('BAD_REQUEST')
            // A client parse error must not pollute the operator's error sink.
            expect(onError).not.toHaveBeenCalled()
        })
    }
})

// ─────────────────────────────────────────────
// F-745: a throwing post-completion hook must NOT turn a durably-completed
// upload into a 500 — it is logged and the success response still returns.
// ─────────────────────────────────────────────
describe('handler — post-completion hook throw does not fail a completed upload (F-745)', () => {
    it('multipart/complete returns 200 (not 500) and logs when onFileUploaded throws', async () => {
        const onError = vi.fn()
        const handler = createUpupHandler({
            ...config,
            onError,
            hooks: {
                onFileUploaded: async () => {
                    throw new Error('integrator hook boom')
                },
            },
        })

        const init = (await (
            await handler(
                new Request('http://localhost/multipart/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'big.zip',
                        size: 50 * 1024 * 1024,
                        type: 'application/zip',
                    }),
                }),
            )
        ).json()) as ResBody

        const res = await handler(
            new Request('http://localhost/multipart/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: init.token,
                    parts: [{ partNumber: 1, eTag: '"etag1"' }],
                }),
            }),
        )

        // The object is durably in S3; a throwing hook must not re-code it as 500.
        expect(res.status).toBe(200)
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]![0]).toMatchObject({
            route: 'multipart/complete',
            status: 200,
        })
    })
})

// ─────────────────────────────────────────────
// F-852: construct-time config validation runs for every createUpupHandler
// caller (folded out of @upupjs/next's opt-in defineUpupConfig).
// ─────────────────────────────────────────────
describe('handler — construct-time config validation (F-852)', () => {
    const secret = 'construct-validation-secret-0123456789'

    it('throws listing empty bucket/region', () => {
        expect(() =>
            createUpupHandler({
                storage: { type: 'aws', bucket: '', region: '' },
                uploadTokenSecret: secret,
            }),
        ).toThrow(/storage\.bucket/)
    })

    it('throws on a half-set credential pair', () => {
        expect(() =>
            createUpupHandler({
                storage: {
                    type: 'aws',
                    bucket: 'b',
                    region: 'r',
                    accessKeyId: 'id',
                    secretAccessKey: '',
                },
                uploadTokenSecret: secret,
            }),
        ).toThrow(/storage\.secretAccessKey/)
    })

    it('throws on a configured provider missing creds (before the getUserId guard)', () => {
        expect(() =>
            createUpupHandler({
                storage: { type: 'aws', bucket: 'b', region: 'r' },
                uploadTokenSecret: secret,
                providers: {
                    googleDrive: { clientId: 'id', clientSecret: '' },
                },
            }),
        ).toThrow(/providers\.googleDrive\.clientSecret/)
    })

    it('accepts a complete config', () => {
        expect(() =>
            createUpupHandler({
                storage: { type: 'aws', bucket: 'b', region: 'r' },
                uploadTokenSecret: secret,
            }),
        ).not.toThrow()
    })
})
