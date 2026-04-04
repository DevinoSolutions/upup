import { describe, it, expect, vi } from 'vitest'
import { createHandler } from '../src/handler'

vi.mock('../src/providers/aws', () => ({
  generatePresignedUrl: vi.fn().mockResolvedValue({
    key: 'uuid-test.jpg',
    publicUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/uuid-test.jpg',
    uploadUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/uuid-test.jpg?presigned',
    expiresIn: 3600,
  }),
  initiateMultipartUpload: vi.fn(),
  generatePresignedPartUrl: vi.fn(),
  completeMultipartUpload: vi.fn(),
  abortMultipartUpload: vi.fn(),
  listMultipartParts: vi.fn(),
}))

const config = {
  storage: {
    type: 'aws',
    bucket: 'test-bucket',
    region: 'us-east-1',
  },
}

describe('createHandler', () => {
  it('returns 404 for unknown routes', async () => {
    const handler = createHandler(config)
    const req = new Request('http://localhost/unknown', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(404)
  })

  it('handles presign POST', async () => {
    const handler = createHandler(config)
    const req = new Request('http://localhost/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test.jpg', size: 1024, type: 'image/jpeg' }),
    })
    const res = await handler(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.uploadUrl).toBeDefined()
    expect(body.key).toBe('uuid-test.jpg')
  })

  it('rejects oversized files', async () => {
    const handler = createHandler({ ...config, maxFileSize: 500 })
    const req = new Request('http://localhost/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'big.jpg', size: 1024, type: 'image/jpeg' }),
    })
    const res = await handler(req)
    expect(res.status).toBe(413)
  })

  it('checks auth when configured', async () => {
    const handler = createHandler({
      ...config,
      auth: async () => false,
    })
    const req = new Request('http://localhost/presign', {
      method: 'POST',
      body: JSON.stringify({ name: 'test.jpg', size: 1024, type: 'image/jpeg' }),
    })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })
})

const configWithProviders = {
  ...config,
  providers: {
    googleDrive: { clientId: 'gd-id', clientSecret: 'gd-secret' },
    oneDrive: { clientId: 'od-id', clientSecret: 'od-secret' },
    dropbox: { appKey: 'db-key', appSecret: 'db-secret' },
  },
}

describe('OAuth routes', () => {
  it('redirects to Google OAuth URL', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/auth/google-drive', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')!
    expect(location).toContain('accounts.google.com')
    expect(location).toContain('client_id=gd-id')
  })

  it('redirects to OneDrive OAuth URL', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/auth/onedrive', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')!
    expect(location).toContain('login.microsoftonline.com')
    expect(location).toContain('client_id=od-id')
  })

  it('redirects to Dropbox OAuth URL', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/auth/dropbox', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')!
    expect(location).toContain('dropbox.com')
    expect(location).toContain('client_id=db-key')
  })

  it('returns 400 for unknown provider', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/auth/unknown-provider', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  it('handles OAuth callback with code', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/auth/google-drive/cb?code=abc123', { method: 'GET' })
    const res = await handler(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.provider).toBe('google-drive')
    expect(body.status).toBe('callback_received')
  })

  it('returns 400 for callback without code', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/auth/google-drive/cb', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 when no providers configured', async () => {
    const handler = createHandler(config)
    const req = new Request('http://localhost/auth/google-drive', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(500)
  })
})

describe('File routes', () => {
  it('lists files for a valid provider', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/files/google-drive', { method: 'GET' })
    const res = await handler(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.provider).toBe('google-drive')
    expect(body.files).toEqual([])
  })

  it('returns 400 for unknown provider on list', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/files/badprovider', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  it('handles file transfer POST', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/files/google-drive/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: 'file-123' }),
    })
    const res = await handler(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.fileId).toBe('file-123')
    expect(body.status).toBe('pending')
  })

  it('returns 400 for transfer without fileId', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/files/google-drive/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })
})
