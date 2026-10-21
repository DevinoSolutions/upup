// packages/server/tests/part-presign-length.test.ts
//
// T-5492: a multipart PART url must carry the expected body length in its
// signature, exactly like the single-PUT presign does. Without it S3 accepts any
// body size per part, so the size envelope was only ever enforced at complete
// (and an upload that never completes escapes it entirely). Uses the REAL
// aws.ts presigner (no mock) with static dummy credentials; nothing is sent.
import { describe, it, expect } from 'vitest'
import { generatePresignedPartUrl } from '../src/providers/aws'

const storage = {
    type: 'aws' as const,
    bucket: 'b',
    region: 'us-east-1',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'secret',
}

const signedHeaders = (url: string): string[] =>
    (new URL(url).searchParams.get('X-Amz-SignedHeaders') ?? '').split(';')

describe('generatePresignedPartUrl: signed per-part length (T-5492)', () => {
    it('binds content-length into the signature when a length is given', async () => {
        const { uploadUrl } = await generatePresignedPartUrl(
            storage,
            'k.bin',
            'upload-1',
            1,
            undefined,
            5_242_880,
        )
        expect(signedHeaders(uploadUrl)).toContain('content-length')
    })

    it('a different length yields a different signature (the length is what is signed)', async () => {
        const sign = async (len: number) =>
            new URL(
                (
                    await generatePresignedPartUrl(
                        storage,
                        'k.bin',
                        'upload-1',
                        1,
                        undefined,
                        len,
                    )
                ).uploadUrl,
            ).searchParams.get('X-Amz-Signature')
        const [a, b] = await Promise.all([sign(5_242_880), sign(5_242_881)])
        expect(a).toBeTruthy()
        expect(a).not.toBe(b)
    })

    it('without a length the url is unchanged (legacy tokens keep working)', async () => {
        const { uploadUrl } = await generatePresignedPartUrl(
            storage,
            'k.bin',
            'upload-1',
            1,
        )
        expect(signedHeaders(uploadUrl)).not.toContain('content-length')
    })
})
