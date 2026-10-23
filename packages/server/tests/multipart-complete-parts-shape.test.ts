// T-6186: /multipart/complete trusted `body.parts` to be an array of
// { partNumber, eTag }. A signed-token request whose `parts` was missing or the
// wrong shape got past the token checks and surfaced as a 500 from the S3 call;
// it is a client error and must answer 400 WITHOUT touching storage. A forged
// token must still answer 403 first (the shape check never runs ahead of the
// trust checks).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import { signUploadToken } from '../src/uploadToken'
import * as aws from '../src/providers/aws'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn(),
    initiateMultipartUpload: vi.fn(),
    generatePresignedPartUrl: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
    listMultipartParts: vi.fn(),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
    checkStorageReachable: vi.fn().mockResolvedValue({ ok: true }),
}))

const SECRET = 'parts-shape-secret-0123456789abc'

const handler = createUpupHandler({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: SECRET,
    allowAnonymousUploads: true,
    allowAnonymous: true,
})

async function validToken(): Promise<string> {
    return signUploadToken(SECRET, {
        k: 'uploads/a.bin',
        u: 'upload-id',
        uid: null,
        smin: 0,
        smax: 10,
        exp: Math.floor(Date.now() / 1000) + 600,
    })
}

const complete = (body: unknown) =>
    handler(
        new Request('http://localhost/multipart/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }),
    )

describe('multipart/complete validates the parts list (T-6186)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const malformed: Array<[string, Record<string, unknown>]> = [
        ['parts missing', {}],
        ['parts null', { parts: null }],
        ['parts a string', { parts: 'nope' }],
        ['parts an object', { parts: { partNumber: 1, eTag: 'e' } }],
        ['a part that is not an object', { parts: [1] }],
        ['a part with no partNumber', { parts: [{ eTag: 'e' }] }],
        [
            'a part with a non-integer partNumber',
            { parts: [{ partNumber: 1.5, eTag: 'e' }] },
        ],
        [
            'a part with a non-string eTag',
            { parts: [{ partNumber: 1, eTag: 7 }] },
        ],
    ]

    for (const [label, extra] of malformed) {
        it(`answers 400, not 500, for ${label}`, async () => {
            const res = await complete({ token: await validToken(), ...extra })
            expect(res.status).toBe(400)
            expect(aws.completeMultipartUpload).not.toHaveBeenCalled()
            expect(aws.abortMultipartUpload).not.toHaveBeenCalled()
        })
    }

    it('still answers 403 for a forged token with a malformed parts list (trust checks run first)', async () => {
        const res = await complete({ token: 'forged.token', parts: 'nope' })
        expect(res.status).toBe(403)
    })

    it('a well-formed parts list still reaches storage', async () => {
        vi.mocked(aws.completeMultipartUpload).mockResolvedValue({
            key: 'uploads/a.bin',
            downloadUrl: 'https://signed',
        } as never)
        const res = await complete({
            token: await validToken(),
            parts: [{ partNumber: 1, eTag: '"e1"' }],
        })
        expect(res.status).toBe(200)
        expect(aws.completeMultipartUpload).toHaveBeenCalledOnce()
    })
})
