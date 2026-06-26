import { describe, it, expect, vi } from 'vitest'
import { createHandler } from '../src/handler'

vi.mock('../src/providers/aws', () => ({
  generatePresignedUrl: vi.fn(),
  initiateMultipartUpload: vi.fn(),
  generatePresignedPartUrl: vi.fn(),
  completeMultipartUpload: vi.fn(),
  abortMultipartUpload: vi.fn(),
  listMultipartParts: vi.fn(),
}))

const baseConfig = {
  storage: {
    type: 'aws' as const,
    bucket: 'test-bucket',
    region: 'us-east-1',
  },
  uploadTokenSecret: 'cors-test-secret-0123456789abc',
}

function options(url: string, headers?: Record<string, string>) {
  return new Request(url, { method: 'OPTIONS', headers })
}

describe('CORS — wildcard allowedOrigins with Origin present (audit S3)', () => {
  it('reflects the concrete origin instead of emitting literal *', async () => {
    const handler = createHandler({
      ...baseConfig,
      cors: { allowedOrigins: ['*'] },
    })
    const res = await handler(options('http://localhost/presign', { Origin: 'https://app.example' }))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example')
  })

  it('includes Access-Control-Allow-Credentials: true when origin is reflected', async () => {
    const handler = createHandler({
      ...baseConfig,
      cors: { allowedOrigins: ['*'] },
    })
    const res = await handler(options('http://localhost/presign', { Origin: 'https://app.example' }))
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('includes Vary: Origin when origin is reflected', async () => {
    const handler = createHandler({
      ...baseConfig,
      cors: { allowedOrigins: ['*'] },
    })
    const res = await handler(options('http://localhost/presign', { Origin: 'https://app.example' }))
    expect(res.headers.get('Vary')).toBe('Origin')
  })
})

describe('CORS — wildcard allowedOrigins with NO Origin header', () => {
  it('emits literal * when no Origin header is present (non-browser/curl)', async () => {
    const handler = createHandler({
      ...baseConfig,
      cors: { allowedOrigins: ['*'] },
    })
    const res = await handler(options('http://localhost/presign'))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('does NOT include Access-Control-Allow-Credentials when emitting *', async () => {
    const handler = createHandler({
      ...baseConfig,
      cors: { allowedOrigins: ['*'] },
    })
    const res = await handler(options('http://localhost/presign'))
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })
})

describe('CORS — specific allowlist', () => {
  it('echoes origin and sets credentials when origin is in allowedOrigins', async () => {
    const handler = createHandler({
      ...baseConfig,
      cors: { allowedOrigins: ['https://app.example'] },
    })
    const res = await handler(options('http://localhost/presign', { Origin: 'https://app.example' }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('returns no CORS headers for a non-allowlisted origin', async () => {
    const handler = createHandler({
      ...baseConfig,
      cors: { allowedOrigins: ['https://app.example'] },
    })
    const res = await handler(options('http://localhost/presign', { Origin: 'https://evil.example' }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })
})
