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
