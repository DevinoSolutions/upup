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
  uploadTokenSecret: 'handler-test-secret-0123456789',
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
  allowAnonymous: true,
  providers: {
    googleDrive: { clientId: 'gd-id', clientSecret: 'gd-secret' },
    oneDrive: { clientId: 'od-id', clientSecret: 'od-secret' },
    dropbox: { appKey: 'db-key', appSecret: 'db-secret' },
  },
}

// OAuth + file routes now enforce a real tokenStore contract and exchange
// codes for tokens at provider endpoints. Their coverage moved to
// tests/server-mode.test.ts. Keep only the "no providers configured" case
// and the validation surfaces here since they don't depend on tokenStore.
describe('OAuth routes — error surfaces', () => {
  it('returns 400 for unknown provider', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/auth/unknown-provider', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })
})

describe('File routes — error surfaces', () => {
  it('returns 400 for unknown provider on list', async () => {
    const handler = createHandler(configWithProviders)
    const req = new Request('http://localhost/files/badprovider', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })
})
