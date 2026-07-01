import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHandler } from '../src/handler'
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

const baseConfig = (tokenStore = new InMemoryTokenStore()): UpupServerConfig => ({
  storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
  uploadTokenSecret: 'token-refresh-secret-0123456789',
  tokenStore,
  allowAnonymous: true,
  providers: {
    googleDrive: { clientId: 'gid', clientSecret: 'gsec' },
    oneDrive: { clientId: 'mid', clientSecret: 'msec' },
    dropbox: { appKey: 'dkey', appSecret: 'dsec' },
    box: { clientId: 'bid', clientSecret: 'bsec' },
  },
})

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_DRIVE_API_PREFIX = 'https://www.googleapis.com/drive/v3/files'

// ─────────────────────────────────────────────────────────────
// GET /files/:provider — proactive token refresh
// ─────────────────────────────────────────────────────────────
describe('token refresh — proactive refresh on expiry (handleListFiles)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    fetchSpy?.mockRestore()
  })

  it('refresh success: calls token endpoint, Drive API uses new token, tokens persisted', async () => {
    const store = new InMemoryTokenStore()
    await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
      accessToken: 'old',
      refreshToken: 'r',
      expiresAt: Date.now() - 1000, // already expired
    })

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url) === GOOGLE_TOKEN_URL) {
        return new Response(
          JSON.stringify({ access_token: 'new', expires_in: 3600, refresh_token: 'r2' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      // Drive list API
      return new Response(
        JSON.stringify({ files: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const handler = createHandler(baseConfig(store))
    const res = await handler(
      new Request('http://localhost/files/google-drive', { method: 'GET' }),
    )
    expect(res.status).toBe(200)

    // Token endpoint called with correct grant_type and refresh_token
    const calls = fetchSpy.mock.calls
    const tokenCallIdx = calls.findIndex(([url]) => String(url) === GOOGLE_TOKEN_URL)
    expect(tokenCallIdx).toBeGreaterThanOrEqual(0)
    const tokenBody = calls[tokenCallIdx][1]!.body as URLSearchParams
    expect(tokenBody.get('grant_type')).toBe('refresh_token')
    expect(tokenBody.get('refresh_token')).toBe('r')

    // Drive API called with the NEW access token
    const driveCallIdx = calls.findIndex(([url]) =>
      String(url).startsWith(GOOGLE_DRIVE_API_PREFIX),
    )
    expect(driveCallIdx).toBeGreaterThanOrEqual(0)
    const driveHeaders = calls[driveCallIdx][1]!.headers as Record<string, string>
    expect(driveHeaders['Authorization']).toBe('Bearer new')

    // Persisted tokens updated
    const persisted = await getTokens(store, DEFAULT_USER_ID, 'google-drive')
    expect(persisted?.accessToken).toBe('new')
    expect(persisted?.refreshToken).toBe('r2')
  })

  it('refresh failure: responds 401 reauth and deletes stored tokens', async () => {
    const store = new InMemoryTokenStore()
    await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
      accessToken: 'old',
      refreshToken: 'bad',
      expiresAt: Date.now() - 1000,
    })

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    )

    const handler = createHandler(baseConfig(store))
    const res = await handler(
      new Request('http://localhost/files/google-drive', { method: 'GET' }),
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.reauth).toBe(true)
    expect(await getTokens(store, DEFAULT_USER_ID, 'google-drive')).toBeNull()
  })

  it('no refresh when token is still fresh: token endpoint not called, Drive API uses original token', async () => {
    const store = new InMemoryTokenStore()
    await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
      accessToken: 'good',
      refreshToken: 'r',
      expiresAt: Date.now() + 3_600_000,
    })

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ files: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const handler = createHandler(baseConfig(store))
    const res = await handler(
      new Request('http://localhost/files/google-drive', { method: 'GET' }),
    )
    expect(res.status).toBe(200)

    // Token endpoint NOT called
    expect(
      fetchSpy.mock.calls.some(([url]) => String(url) === GOOGLE_TOKEN_URL),
    ).toBe(false)

    // Drive API used the original (good) token
    const driveCallIdx = fetchSpy.mock.calls.findIndex(([url]) =>
      String(url).startsWith(GOOGLE_DRIVE_API_PREFIX),
    )
    expect(driveCallIdx).toBeGreaterThanOrEqual(0)
    const driveHeaders = fetchSpy.mock.calls[driveCallIdx][1]!
      .headers as Record<string, string>
    expect(driveHeaders['Authorization']).toBe('Bearer good')
  })

  it('keeps original refresh_token when provider omits it in the refresh response', async () => {
    const store = new InMemoryTokenStore()
    await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
      accessToken: 'old',
      refreshToken: 'original-rt',
      expiresAt: Date.now() - 1000,
    })

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url) === GOOGLE_TOKEN_URL) {
        // provider omits refresh_token on this cycle
        return new Response(
          JSON.stringify({ access_token: 'new2', expires_in: 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({ files: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const handler = createHandler(baseConfig(store))
    await handler(
      new Request('http://localhost/files/google-drive', { method: 'GET' }),
    )

    const persisted = await getTokens(store, DEFAULT_USER_ID, 'google-drive')
    expect(persisted?.accessToken).toBe('new2')
    // original refresh_token must be preserved
    expect(persisted?.refreshToken).toBe('original-rt')
  })
})

// ─────────────────────────────────────────────────────────────
// POST /files/:provider/transfer — proactive token refresh
// ─────────────────────────────────────────────────────────────
describe('token refresh — proactive refresh on expiry (handleFileTransfer)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    fetchSpy?.mockRestore()
  })

  it('refresh success: token endpoint called with correct params, new tokens persisted', async () => {
    const store = new InMemoryTokenStore()
    await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
      accessToken: 'old',
      refreshToken: 'rt',
      expiresAt: Date.now() - 1000,
    })

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url) === GOOGLE_TOKEN_URL) {
        return new Response(
          JSON.stringify({ access_token: 'new', expires_in: 3600, refresh_token: 'rt2' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      // Any googleapis.com call — return minimal metadata so execution progresses past refresh
      return new Response(
        JSON.stringify({ name: 'file.txt', mimeType: 'text/plain', size: '5' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const handler = createHandler(baseConfig(store))
    await handler(
      new Request('http://localhost/files/google-drive/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: 'f1', size: 100, mimeType: 'text/plain' }),
      }),
    )

    // Token endpoint called with correct refresh params
    const calls = fetchSpy.mock.calls
    const tokenCallIdx = calls.findIndex(([url]) => String(url) === GOOGLE_TOKEN_URL)
    expect(tokenCallIdx).toBeGreaterThanOrEqual(0)
    const tokenBody = calls[tokenCallIdx][1]!.body as URLSearchParams
    expect(tokenBody.get('grant_type')).toBe('refresh_token')
    expect(tokenBody.get('refresh_token')).toBe('rt')

    // Persisted tokens updated
    const persisted = await getTokens(store, DEFAULT_USER_ID, 'google-drive')
    expect(persisted?.accessToken).toBe('new')
    expect(persisted?.refreshToken).toBe('rt2')
  })

  it('refresh failure in transfer: responds 401 reauth and deletes tokens', async () => {
    const store = new InMemoryTokenStore()
    await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
      accessToken: 'old',
      refreshToken: 'bad',
      expiresAt: Date.now() - 1000,
    })

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    )

    const handler = createHandler(baseConfig(store))
    const res = await handler(
      new Request('http://localhost/files/google-drive/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: 'f1', size: 100, mimeType: 'text/plain' }),
      }),
    )
    expect(res.status).toBe(401)
    expect((await res.json()).reauth).toBe(true)
    expect(await getTokens(store, DEFAULT_USER_ID, 'google-drive')).toBeNull()
  })
})
