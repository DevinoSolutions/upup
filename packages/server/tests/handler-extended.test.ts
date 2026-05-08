import { describe, it, expect, vi } from 'vitest'
import { createHandler } from '../src/handler'

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
}))

const config = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
}

// ─────────────────────────────────────────────
// allowedTypes enforcement
// ─────────────────────────────────────────────
describe('handler — allowedTypes', () => {
    it('rejects disallowed file type', async () => {
        const handler = createHandler({ ...config, allowedTypes: ['image/*'] })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'doc.pdf', size: 100, type: 'application/pdf' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(415)
    })

    it('accepts allowed file type (exact match)', async () => {
        const handler = createHandler({ ...config, allowedTypes: ['image/jpeg'] })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'photo.jpg', size: 100, type: 'image/jpeg' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })

    it('accepts any type when allowedTypes not configured', async () => {
        const handler = createHandler(config)
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
        const handler = createHandler({
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
        const handler = createHandler({
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
        const handler = createHandler({ ...config, hooks: { onBeforeUpload: hook } })
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
        const handler = createHandler({ ...config, allowedTypes: ['image/*'] })
        const req = new Request('http://localhost/multipart/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'big.zip', size: 50 * 1024 * 1024, type: 'application/zip' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(415)
    })

    it('initiates multipart upload', async () => {
        const handler = createHandler(config)
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
    })

    it('signs a part', async () => {
        const handler = createHandler(config)
        const req = new Request('http://localhost/multipart/sign-part', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'uuid-big.zip', uploadId: 'mp-123', partNumber: 1 }),
        })
        const res = await handler(req)
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.uploadUrl).toBeDefined()
    })

    it('completes multipart upload', async () => {
        const handler = createHandler(config)
        const req = new Request('http://localhost/multipart/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: 'uuid-big.zip',
                uploadId: 'mp-123',
                parts: [{ partNumber: 1, eTag: '"etag1"' }],
            }),
        })
        const res = await handler(req)
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.key).toBeDefined()
    })
})

describe('handler — CORS', () => {
    it('responds to OPTIONS with configured CORS headers', async () => {
        const handler = createHandler({
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
        const handler = createHandler({
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
})

// ─────────────────────────────────────────────
// Presign edge cases
// ─────────────────────────────────────────────
describe('handler — presign edge cases', () => {
    it('rejects GET on presign endpoint', async () => {
        const handler = createHandler(config)
        const req = new Request('http://localhost/presign', { method: 'GET' })
        const res = await handler(req)
        expect([404, 405]).toContain(res.status)
    })

    it('presign with empty body still processes (no field validation)', async () => {
        const handler = createHandler(config)
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
        const handler = createHandler({ ...config, auth: async () => true })
        const req = new Request('http://localhost/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'test.jpg', size: 100, type: 'image/jpeg' }),
        })
        const res = await handler(req)
        expect(res.status).toBe(200)
    })
})
