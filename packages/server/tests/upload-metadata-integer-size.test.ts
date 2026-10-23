// T-6186: validateUploadMetadata accepted any finite non-negative number as
// `size`, so 1.5 or 0.1 became a signed length / size envelope. A byte count is
// an integer: anything else is a 400 on both session-creating routes.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import * as aws from '../src/providers/aws'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://signed/put',
        key: 'k',
        publicUrl: 'https://signed/get',
    }),
    initiateMultipartUpload: vi.fn(),
    generatePresignedPartUrl: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
    listMultipartParts: vi.fn(),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
    checkStorageReachable: vi.fn().mockResolvedValue({ ok: true }),
}))

const handler = createUpupHandler({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'integer-size-secret-0123456789ab',
    allowAnonymousUploads: true,
    allowAnonymous: true,
})

const post = (path: string, size: unknown) =>
    handler(
        new Request(`http://localhost${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'a.bin', type: 'text/plain', size }),
        }),
    )

describe('upload metadata size must be an integer (T-6186)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    for (const route of ['/presign', '/multipart/init']) {
        for (const size of [1.5, 0.1, 1e-7]) {
            it(`${route} answers 400 for size ${size}`, async () => {
                const res = await post(route, size)
                expect(res.status).toBe(400)
                expect(aws.generatePresignedUrl).not.toHaveBeenCalled()
                expect(aws.initiateMultipartUpload).not.toHaveBeenCalled()
            })
        }
    }

    it('/presign still admits an integer size', async () => {
        const res = await post('/presign', 12)
        expect(res.status).toBe(200)
    })

    it('/presign still admits a zero-byte file', async () => {
        const res = await post('/presign', 0)
        expect(res.status).toBe(200)
    })
})
