import { describe, it, expect, vi } from 'vitest'
import { createUpupHandler } from '../src/handler'
import { InMemoryTokenStore, setTokens, DEFAULT_USER_ID } from '../src/tokenStore'

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
        etag: '"final"',
    }),
    abortMultipartUpload: vi.fn().mockResolvedValue(undefined),
    listMultipartParts: vi.fn().mockResolvedValue({ parts: [] }),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
}))

const config = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'handler-ext-secret-0123456789',
}

// ─────────────────────────────────────────────
// allowedTypes enforcement
// ─────────────────────────────────────────────
describe('handler — allowedTypes', () => {
    it('rejects disallowed file type', async () => {
        const handler = createUpupHandler({ ...config, allowedTypes: ['image/*'] })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'doc.pdf', size: 100, type: 'application/pdf' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(415)
    })

    it('accepts allowed file type (exact match)', async () => {
        const handler = createUpupHandler({ ...config, allowedTypes: ['image/jpeg'] })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'photo.jpg', size: 100, type: 'image/jpeg' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })

    it('accepts any type when allowedTypes not configured', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'anything.xyz', size: 100, type: 'application/octet-stream' }),
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
            body: JSON.stringify({ name: 'blocked.jpg', size: 100, type: 'image/jpeg' }),
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
            body: JSON.stringify({ name: 'ok.jpg', size: 100, type: 'image/jpeg' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })

    it('hook receives file metadata', async () => {
        const hook = vi.fn().mockResolvedValue(true)
        const handler = createUpupHandler({ ...config, hooks: { onBeforeUpload: hook } })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'check.jpg', size: 512, type: 'image/jpeg' }),
        })
        await handler(req)
        expect(hook).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'check.jpg', size: 512, type: 'image/jpeg' }),
            expect.anything(),
        )
    })
})

// ─────────────────────────────────────────────
// Multipart endpoints
// ─────────────────────────────────────────────
describe('handler — multipart', () => {
    it('applies allowedTypes wildcard validation to multipart init', async () => {
        const handler = createUpupHandler({ ...config, allowedTypes: ['image/*'] })
        const req = new Request('http://localhost/multipart/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'big.zip', size: 50 * 1024 * 1024, type: 'application/zip' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(415)
    })

    it('initiates multipart upload and returns a token', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/multipart/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'big.zip', size: 50 * 1024 * 1024, type: 'application/zip' }),
        })
        const res = await handler(req)
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.uploadId).toBeDefined()
        expect(body.key).toBeDefined()
        expect(typeof body.token).toBe('string')
    })

    it('signs a part using the issued token', async () => {
        const handler = createUpupHandler(config)
        const init = await (await handler(new Request('http://localhost/multipart/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'big.zip', size: 50 * 1024 * 1024, type: 'application/zip' }),
        }))).json()

        const res = await handler(new Request('http://localhost/multipart/sign-part', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: init.token, partNumber: 1 }),
        }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.uploadUrl).toBeDefined()
    })

    it('rejects sign-part with a forged token (403)', async () => {
        const handler = createUpupHandler(config)
        const res = await handler(new Request('http://localhost/multipart/sign-part', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'forged.token', partNumber: 1 }),
        }))
        expect(res.status).toBe(403)
    })

    it('completes multipart upload using the issued token', async () => {
        const handler = createUpupHandler(config)
        const init = await (await handler(new Request('http://localhost/multipart/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'big.zip', size: 50 * 1024 * 1024, type: 'application/zip' }),
        }))).json()

        const res = await handler(new Request('http://localhost/multipart/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: init.token, parts: [{ partNumber: 1, eTag: '"etag1"' }] }),
        }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.key).toBeDefined()
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
        expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
        expect(res.headers.get('access-control-allow-headers')).toContain('X-Test')
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
    // must re-auth). Caught by live stealth-chrome verification of @upup/next.
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
        expect((await res.json()).reauth).toBe(true)
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

    it('presign with empty body still processes (no field validation)', async () => {
        const handler = createUpupHandler(config)
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })
        const res = await handler(req)
        // Server does not validate required fields — delegates to storage provider
        expect(res.status).toBe(200)
    })

    it('auth success allows presign', async () => {
        const handler = createUpupHandler({ ...config, auth: async () => true })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'test.jpg', size: 100, type: 'image/jpeg' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })
})
