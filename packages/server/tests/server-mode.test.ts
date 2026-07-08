import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    getTokens,
    setTokens,
    deleteTokens,
    saveOAuthState,
    consumeOAuthState,
    generateOAuthState,
    resolveUserId,
    DEFAULT_USER_ID,
} from '../src/tokenStore'
import type { UpupServerConfig } from '../src/config'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn(),
    initiateMultipartUpload: vi.fn(),
    generatePresignedPartUrl: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
    listMultipartParts: vi.fn(),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
}))

const baseConfig = (
    tokenStore = new InMemoryTokenStore(),
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'server-mode-secret-0123456789',
    tokenStore,
    allowAnonymous: true,
    providers: {
        googleDrive: { clientId: 'gid', clientSecret: 'gsec' },
        oneDrive: { clientId: 'mid', clientSecret: 'msec' },
        dropbox: { appKey: 'dkey', appSecret: 'dsec' },
        box: { clientId: 'bid', clientSecret: 'bsec' },
    },
})

// Shared shape for the JSON bodies read back from createUpupHandler's OAuth
// and files routes in this file -- most fields are optional since no single
// route response carries all of them, but `files` is required so indexing
// into it below doesn't need a redundant possibly-undefined check.
type ResBody = {
    error?: string
    reauth?: boolean
    provider?: string
    files: Array<{
        id?: string
        name?: string
        size?: number
        isFolder?: boolean
    }>
}

// ─────────────────────────────────────────────────────────────
// InMemoryTokenStore
// ─────────────────────────────────────────────────────────────
describe('InMemoryTokenStore', () => {
    it('stores and retrieves string values', async () => {
        const store = new InMemoryTokenStore()
        await store.set('k', 'v')
        expect(await store.get('k')).toBe('v')
    })

    it('returns null for missing keys', async () => {
        const store = new InMemoryTokenStore()
        expect(await store.get('missing')).toBeNull()
    })

    it('delete removes the entry', async () => {
        const store = new InMemoryTokenStore()
        await store.set('k', 'v')
        await store.delete('k')
        expect(await store.get('k')).toBeNull()
    })

    it('respects TTL', async () => {
        const store = new InMemoryTokenStore()
        vi.useFakeTimers()
        await store.set('k', 'v', 1) // 1s TTL
        expect(await store.get('k')).toBe('v')
        vi.advanceTimersByTime(1100)
        expect(await store.get('k')).toBeNull()
        vi.useRealTimers()
    })
})

// ─────────────────────────────────────────────────────────────
// Typed helpers
// ─────────────────────────────────────────────────────────────
describe('token helpers', () => {
    it('setTokens/getTokens round-trips DriveTokens', async () => {
        const store = new InMemoryTokenStore()
        const tokens = {
            accessToken: 'at',
            refreshToken: 'rt',
            expiresAt: Date.now() + 3600_000,
            scope: 'drive.readonly',
            tokenType: 'Bearer',
        }
        await setTokens(store, 'user1', 'google-drive', tokens)
        const got = await getTokens(store, 'user1', 'google-drive')
        expect(got).toEqual(tokens)
    })

    it('deleteTokens removes persisted tokens', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, 'u', 'dropbox', { accessToken: 'x' })
        await deleteTokens(store, 'u', 'dropbox')
        expect(await getTokens(store, 'u', 'dropbox')).toBeNull()
    })

    it('returns null on malformed persisted JSON', async () => {
        const store = new InMemoryTokenStore()
        await store.set('upup:tokens:u:onedrive', 'not-json', undefined)
        expect(await getTokens(store, 'u', 'onedrive')).toBeNull()
    })

    it('scopes by userId and provider independently', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, 'u1', 'google-drive', { accessToken: 'a1' })
        await setTokens(store, 'u2', 'google-drive', { accessToken: 'a2' })
        await setTokens(store, 'u1', 'dropbox', { accessToken: 'd1' })
        expect(
            (await getTokens(store, 'u1', 'google-drive'))?.accessToken,
        ).toBe('a1')
        expect(
            (await getTokens(store, 'u2', 'google-drive'))?.accessToken,
        ).toBe('a2')
        expect((await getTokens(store, 'u1', 'dropbox'))?.accessToken).toBe(
            'd1',
        )
    })
})

// ─────────────────────────────────────────────────────────────
// OAuth state
// ─────────────────────────────────────────────────────────────
describe('OAuth state', () => {
    it('generates unique hex-ish state values', () => {
        const a = generateOAuthState()
        const b = generateOAuthState()
        expect(a).not.toBe(b)
        expect(a).toMatch(/^[0-9a-f]{64}$/)
    })

    it('consumeOAuthState deletes the entry after reading', async () => {
        const store = new InMemoryTokenStore()
        await saveOAuthState(store, 'abc', {
            userId: 'u',
            provider: 'google-drive',
        })
        const first = await consumeOAuthState(store, 'abc')
        expect(first).toEqual({ userId: 'u', provider: 'google-drive' })
        const second = await consumeOAuthState(store, 'abc')
        expect(second).toBeNull()
    })

    it('returns null when state never existed', async () => {
        const store = new InMemoryTokenStore()
        expect(await consumeOAuthState(store, 'nope')).toBeNull()
    })
})

// ─────────────────────────────────────────────────────────────
// resolveUserId
// ─────────────────────────────────────────────────────────────
describe('resolveUserId', () => {
    it('falls back to DEFAULT_USER_ID when no hook configured', async () => {
        const req = new Request('http://localhost/')
        expect(await resolveUserId(baseConfig(), req)).toBe(DEFAULT_USER_ID)
    })

    it('honours config.getUserId when provided', async () => {
        const req = new Request('http://localhost/')
        const result = await resolveUserId(
            { ...baseConfig(), getUserId: async () => 'alice' },
            req,
        )
        expect(result).toBe('alice')
    })

    it('returns null when hook denies', async () => {
        const req = new Request('http://localhost/')
        const result = await resolveUserId(
            { ...baseConfig(), getUserId: async () => null },
            req,
        )
        expect(result).toBeNull()
    })
})

// ─────────────────────────────────────────────────────────────
// OAuth redirect route
// ─────────────────────────────────────────────────────────────
describe('GET /auth/:provider redirect', () => {
    it('redirects to Google with state param and saves state', async () => {
        const store = new InMemoryTokenStore()
        const storeSpy = vi.spyOn(store, 'set')
        const handler = createUpupHandler(baseConfig(store))
        const res = await handler(
            new Request('http://localhost/auth/google-drive', {
                method: 'GET',
            }),
        )
        expect(res.status).toBe(302)
        const location = res.headers.get('Location')!
        expect(location).toContain('accounts.google.com/o/oauth2/v2/auth')
        expect(location).toContain('client_id=gid')
        expect(location).toMatch(/state=[0-9a-f]{64}/)
        expect(location).toContain('access_type=offline')
        expect(storeSpy).toHaveBeenCalledWith(
            expect.stringMatching(/^upup:oauth-state:/),
            expect.any(String),
            expect.any(Number),
        )
    })

    it('redirects to Microsoft with tenant path', async () => {
        const handler = createUpupHandler(baseConfig())
        const res = await handler(
            new Request('http://localhost/auth/onedrive', { method: 'GET' }),
        )
        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain(
            'login.microsoftonline.com/common/oauth2/v2.0/authorize',
        )
    })

    it('redirects to Dropbox auth URL', async () => {
        const handler = createUpupHandler(baseConfig())
        const res = await handler(
            new Request('http://localhost/auth/dropbox', { method: 'GET' }),
        )
        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain(
            'www.dropbox.com/oauth2/authorize',
        )
        expect(res.headers.get('Location')).toContain('client_id=dkey')
    })

    it('redirects to Box auth URL', async () => {
        const handler = createUpupHandler(baseConfig())
        const res = await handler(
            new Request('http://localhost/auth/box', { method: 'GET' }),
        )
        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain(
            'account.box.com/api/oauth2/authorize',
        )
    })

    it('rejects unknown provider', async () => {
        const handler = createUpupHandler(baseConfig())
        const res = await handler(
            new Request('http://localhost/auth/mega', { method: 'GET' }),
        )
        expect(res.status).toBe(400)
    })

    it('500s when tokenStore missing', async () => {
        // exactOptionalPropertyTypes forbids an explicit `tokenStore: undefined`
        // -- destructure it away instead so the key is genuinely absent, which is
        // what "missing" means for an optional property.
        const { tokenStore: _omit, ...configWithoutTokenStore } = baseConfig()
        const handler = createUpupHandler(configWithoutTokenStore)
        const res = await handler(
            new Request('http://localhost/auth/google-drive', {
                method: 'GET',
            }),
        )
        expect(res.status).toBe(500)
    })

    it('401s when getUserId returns null', async () => {
        const handler = createUpupHandler({
            ...baseConfig(),
            getUserId: async () => null,
        })
        const res = await handler(
            new Request('http://localhost/auth/google-drive', {
                method: 'GET',
            }),
        )
        expect(res.status).toBe(401)
    })
})

// ─────────────────────────────────────────────────────────────
// OAuth callback route
// ─────────────────────────────────────────────────────────────
describe('GET /auth/:provider/cb', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    access_token: 'AT123',
                    expires_in: 3600,
                    refresh_token: 'RT123',
                    scope: 'drive.readonly',
                    token_type: 'Bearer',
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        )
    })

    afterEach(() => {
        fetchSpy.mockRestore()
    })

    it('exchanges code + state for tokens and persists them', async () => {
        const store = new InMemoryTokenStore()
        await saveOAuthState(store, 'valid-state', {
            userId: 'u',
            provider: 'google-drive',
        })
        const handler = createUpupHandler(baseConfig(store))
        const res = await handler(
            new Request(
                'http://localhost/auth/google-drive/cb?code=xyz&state=valid-state',
                { method: 'GET' },
            ),
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toContain('text/html')
        const persisted = await getTokens(store, 'u', 'google-drive')
        expect(persisted?.accessToken).toBe('AT123')
        expect(persisted?.refreshToken).toBe('RT123')
        expect(fetchSpy).toHaveBeenCalledWith(
            'https://oauth2.googleapis.com/token',
            expect.objectContaining({ method: 'POST' }),
        )
    })

    it('rejects invalid state', async () => {
        const handler = createUpupHandler(baseConfig())
        const res = await handler(
            new Request(
                'http://localhost/auth/google-drive/cb?code=xyz&state=never-saved',
                { method: 'GET' },
            ),
        )
        expect(res.status).toBe(400)
    })

    it('rejects missing code', async () => {
        const store = new InMemoryTokenStore()
        await saveOAuthState(store, 's', {
            userId: 'u',
            provider: 'google-drive',
        })
        const handler = createUpupHandler(baseConfig(store))
        const res = await handler(
            new Request('http://localhost/auth/google-drive/cb?state=s', {
                method: 'GET',
            }),
        )
        expect(res.status).toBe(400)
    })

    it('propagates provider errors', async () => {
        const handler = createUpupHandler(baseConfig())
        const res = await handler(
            new Request(
                'http://localhost/auth/google-drive/cb?error=access_denied',
                {
                    method: 'GET',
                },
            ),
        )
        expect(res.status).toBe(400)
        const body = (await res.json()) as ResBody
        expect(body.error).toContain('access_denied')
    })

    it('502s on provider token-exchange failure', async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response('bad', { status: 400, statusText: 'Bad Request' }),
        )
        const store = new InMemoryTokenStore()
        await saveOAuthState(store, 's', { userId: 'u', provider: 'dropbox' })
        const handler = createUpupHandler(baseConfig(store))
        const res = await handler(
            new Request('http://localhost/auth/dropbox/cb?code=x&state=s', {
                method: 'GET',
            }),
        )
        expect(res.status).toBe(502)
    })
})

// ─────────────────────────────────────────────────────────────
// GET /files/:provider
// ─────────────────────────────────────────────────────────────
describe('GET /files/:provider', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    afterEach(() => {
        fetchSpy?.mockRestore()
    })

    it('401s with reauth flag when no token persisted', async () => {
        const handler = createUpupHandler(baseConfig())
        const res = await handler(
            new Request('http://localhost/files/google-drive', {
                method: 'GET',
            }),
        )
        expect(res.status).toBe(401)
        const body = (await res.json()) as ResBody
        expect(body.reauth).toBe(true)
        expect(body.provider).toBe('google-drive')
    })

    it('returns normalised files from Google Drive', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    files: [
                        {
                            id: 'f1',
                            name: 'doc.txt',
                            mimeType: 'text/plain',
                            size: '100',
                        },
                        {
                            id: 'folder1',
                            name: 'Photos',
                            mimeType: 'application/vnd.google-apps.folder',
                        },
                    ],
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        )
        const handler = createUpupHandler(baseConfig(store))
        const res = await handler(
            new Request('http://localhost/files/google-drive', {
                method: 'GET',
            }),
        )
        expect(res.status).toBe(200)
        const body = (await res.json()) as ResBody
        expect(body.files).toHaveLength(2)
        expect(body.files[0]).toMatchObject({
            id: 'f1',
            name: 'doc.txt',
            size: 100,
            isFolder: false,
        })
        expect(body.files[1]!.isFolder).toBe(true)
    })

    it('drops stale token and returns reauth on upstream 401', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'dropbox', {
            accessToken: 'stale',
        })
        fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response('', { status: 401 }))
        const handler = createUpupHandler(baseConfig(store))
        const res = await handler(
            new Request('http://localhost/files/dropbox', { method: 'GET' }),
        )
        expect(res.status).toBe(401)
        expect(((await res.json()) as ResBody).reauth).toBe(true)
        expect(await getTokens(store, DEFAULT_USER_ID, 'dropbox')).toBeNull()
    })
})

// ─────────────────────────────────────────────────────────────
// POST /files/:provider/transfer (validation layer only)
// ─────────────────────────────────────────────────────────────
describe('POST /files/:provider/transfer', () => {
    it('401s with reauth when no token persisted', async () => {
        const handler = createUpupHandler(baseConfig())
        const res = await handler(
            new Request('http://localhost/files/google-drive/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId: 'f1',
                    size: 100,
                    mimeType: 'text/plain',
                }),
            }),
        )
        expect(res.status).toBe(401)
        expect(((await res.json()) as ResBody).reauth).toBe(true)
    })

    it('rejects missing fileId', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
        const handler = createUpupHandler(baseConfig(store))
        const res = await handler(
            new Request('http://localhost/files/google-drive/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ size: 100 }),
            }),
        )
        expect(res.status).toBe(400)
    })

    it('enforces maxFileSize', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
        const handler = createUpupHandler({
            ...baseConfig(store),
            maxFileSize: 500,
        })
        const res = await handler(
            new Request('http://localhost/files/google-drive/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: 'f1', size: 1000 }),
            }),
        )
        expect(res.status).toBe(413)
    })

    it('enforces allowedTypes', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
        const handler = createUpupHandler({
            ...baseConfig(store),
            allowedTypes: ['image/png'],
        })
        const res = await handler(
            new Request('http://localhost/files/google-drive/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId: 'f1',
                    size: 10,
                    mimeType: 'video/mp4',
                }),
            }),
        )
        expect(res.status).toBe(415)
    })

    it('rejects a transfer whose mimeType is ABSENT when allowedTypes is set (aligns with the upload path, F-743)', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
        const handler = createUpupHandler({
            ...baseConfig(store),
            allowedTypes: ['image/*'],
        })
        const res = await handler(
            new Request('http://localhost/files/google-drive/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: 'f1', size: 10 }),
            }),
        )
        // Previously an absent mimeType short-circuited the `body.mimeType &&`
        // guard and bypassed the allowlist entirely; now it is a non-match.
        expect(res.status).toBe(415)
    })

    it('accepts a wildcard-matching mimeType (image/* accepts image/png) and reaches the drive call (F-743)', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
        // Upstream 401 → the type gate must already have PASSED (image/png
        // matches image/*, which the old exact Array.includes rejected), so we
        // reach the drive fetch and get the reauth path — never a 415.
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response('', { status: 401 }))
        try {
            const handler = createUpupHandler({
                ...baseConfig(store),
                allowedTypes: ['image/*'],
            })
            const res = await handler(
                new Request('http://localhost/files/google-drive/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileId: 'f1',
                        size: 10,
                        mimeType: 'image/png',
                    }),
                }),
            )
            expect(res.status).not.toBe(415)
            expect(res.status).toBe(401)
            expect(((await res.json()) as ResBody).reauth).toBe(true)
        } finally {
            fetchSpy.mockRestore()
        }
    })
})
