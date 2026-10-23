import { describe, it, expect, vi } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    getTokens,
    setTokens,
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

const config = (
    tokenStore: InMemoryTokenStore,
    extra: Partial<UpupServerConfig> = {},
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'drive-logout-secret-0123456789',
    tokenStore,
    allowAnonymous: true,
    providers: { googleDrive: { clientId: 'gid', clientSecret: 'gsec' } },
    ...extra,
})

const logout = (provider: string, headers: Record<string, string> = {}) =>
    new Request(`http://localhost/files/${provider}/logout`, {
        method: 'POST',
        headers,
    })

describe('POST /files/:provider/logout', () => {
    it('drops the caller grant for that provider only, then the list demands reauth', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'g-token',
        })
        await setTokens(store, DEFAULT_USER_ID, 'dropbox', {
            accessToken: 'd-token',
        })
        const handler = createUpupHandler(config(store))

        const res = await handler(logout('google-drive'))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({
            provider: 'google-drive',
            ok: true,
        })
        expect(
            await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
        ).toBeNull()
        expect(await getTokens(store, DEFAULT_USER_ID, 'dropbox')).toEqual({
            accessToken: 'd-token',
        })

        const list = await handler(
            new Request('http://localhost/files/google-drive'),
        )
        expect(list.status).toBe(401)
        expect(((await list.json()) as { reauth?: boolean }).reauth).toBe(true)
    })

    it("never touches another user's grant", async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, 'alice', 'google-drive', { accessToken: 'a' })
        await setTokens(store, 'bob', 'google-drive', { accessToken: 'b' })
        const handler = createUpupHandler(
            config(store, {
                allowAnonymous: false,
                getUserId: async req => req.headers.get('x-user') ?? null,
            }),
        )

        const res = await handler(logout('google-drive', { 'x-user': 'alice' }))
        expect(res.status).toBe(200)
        expect(await getTokens(store, 'alice', 'google-drive')).toBeNull()
        expect(await getTokens(store, 'bob', 'google-drive')).toEqual({
            accessToken: 'b',
        })
    })

    it('401s an unidentified caller and keeps the grant', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, 'alice', 'google-drive', { accessToken: 'a' })
        const handler = createUpupHandler(
            config(store, {
                allowAnonymous: false,
                getUserId: async req => req.headers.get('x-user') ?? null,
            }),
        )

        const res = await handler(logout('google-drive'))
        expect(res.status).toBe(401)
        expect(await getTokens(store, 'alice', 'google-drive')).toEqual({
            accessToken: 'a',
        })
    })

    it('is blocked by config.auth like every other route', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'g',
        })
        const handler = createUpupHandler(
            config(store, { auth: async () => false }),
        )
        const res = await handler(logout('google-drive'))
        expect(res.status).toBe(401)
        expect(
            await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
        ).not.toBeNull()
    })

    it('is idempotent and rejects unknown providers', async () => {
        const handler = createUpupHandler(config(new InMemoryTokenStore()))
        expect((await handler(logout('google-drive'))).status).toBe(200)
        expect((await handler(logout('nope'))).status).toBe(400)
    })

    it('is POST-only: GET /files/:provider/logout is 404 and keeps the grant', async () => {
        const store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'g',
        })
        const handler = createUpupHandler(config(store))
        const res = await handler(
            new Request('http://localhost/files/google-drive/logout'),
        )
        expect(res.status).toBe(404)
        expect(
            await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
        ).not.toBeNull()
    })

    it('carries the request-id header (single Responder contract)', async () => {
        const handler = createUpupHandler(config(new InMemoryTokenStore()))
        const res = await handler(logout('google-drive'))
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
    })
})
