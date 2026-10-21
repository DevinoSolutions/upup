// packages/server/tests/multipart-part-length.test.ts
//
// T-5492: /multipart/sign-part derives the EXACT length of the requested part
// from the signed token (part size + total size, both bound at init) and has
// the part URL sign it, so S3 itself refuses a body of any other size. A part
// number outside the file's part range is refused outright. The complete-time
// envelope check is kept (defence in depth; also the only guard for tokens
// minted before part sizes were bound).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    PART_LENGTH_BINDING_CUTOFF_SECONDS,
    signUploadToken,
    verifyUploadToken,
    type UploadTokenPayload,
} from '../src/uploadToken'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn(),
    // Real part-size maths, so a hostile chunkSizeBytes reaches the handler
    // exactly as it would reach S3 (T-5492 review: it used to slip past `ps`).
    initiateMultipartUpload: vi.fn(
        async (
            _storage: unknown,
            _key: string,
            _type: string,
            size: number,
            _expires?: number,
            chunk?: number,
        ) => {
            const { computePartSize } = await vi.importActual<
                typeof import('../src/providers/aws')
            >('../src/providers/aws')
            return {
                key: 'uuid-big.zip',
                uploadId: 'mp-123',
                partSize: computePartSize(size, chunk),
                expiresIn: 3600,
            }
        },
    ),
    generatePresignedPartUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://bucket.s3.amazonaws.com/part?presigned',
        expiresIn: 3600,
    }),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn().mockResolvedValue({ ok: true }),
    listMultipartParts: vi.fn(),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
}))

import { generatePresignedPartUrl } from '../src/providers/aws'

const partUrl = vi.mocked(generatePresignedPartUrl)
const SECRET = 'part-length-test-secret-0123456789'
const MiB = 1024 * 1024

const config = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: SECRET,
    allowAnonymousUploads: true,
} as const

const post = (
    handler: (r: Request) => Promise<Response>,
    path: string,
    body: unknown,
) =>
    handler(
        new Request(`http://localhost${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }),
    )

async function initUpload(
    handler: (r: Request) => Promise<Response>,
    size: number,
) {
    const res = await post(handler, '/multipart/init', {
        name: 'big.zip',
        size,
        type: 'application/zip',
    })
    expect(res.status).toBe(200)
    return (await res.json()) as { token: string }
}

/** The length argument the handler passed to the part presigner (6th arg). */
const signedLength = () =>
    partUrl.mock.calls[partUrl.mock.calls.length - 1]?.[5]

describe('POST /multipart/sign-part: signed part length (T-5492)', () => {
    beforeEach(() => {
        partUrl.mockClear()
    })

    it('binds the part size into the signed token at init', async () => {
        const handler = createUpupHandler(config)
        const { token } = await initUpload(handler, 12 * MiB)
        const payload = await verifyUploadToken(SECRET, token, Date.now())
        expect(payload.ps).toBe(5 * MiB)
        expect(payload.smax).toBe(12 * MiB)
    })

    it('signs a full part length for every non-final part', async () => {
        const handler = createUpupHandler(config)
        const { token } = await initUpload(handler, 12 * MiB)
        for (const partNumber of [1, 2]) {
            const res = await post(handler, '/multipart/sign-part', {
                token,
                partNumber,
            })
            expect(res.status).toBe(200)
            expect(signedLength()).toBe(5 * MiB)
        }
    })

    it('signs the exact remainder for the final part', async () => {
        const handler = createUpupHandler(config)
        const { token } = await initUpload(handler, 12 * MiB)
        const res = await post(handler, '/multipart/sign-part', {
            token,
            partNumber: 3,
        })
        expect(res.status).toBe(200)
        expect(signedLength()).toBe(2 * MiB)
    })

    it('signs the whole size for a file that fits in one part', async () => {
        const handler = createUpupHandler(config)
        const { token } = await initUpload(handler, 1024)
        const res = await post(handler, '/multipart/sign-part', {
            token,
            partNumber: 1,
        })
        expect(res.status).toBe(200)
        expect(signedLength()).toBe(1024)
    })

    it.each([0, 4, -1, 1.5, 'x', null])(
        "refuses part number %s outside the file's part range without signing",
        async partNumber => {
            const handler = createUpupHandler(config)
            const { token } = await initUpload(handler, 12 * MiB)
            const res = await post(handler, '/multipart/sign-part', {
                token,
                partNumber,
            })
            expect(res.status).toBe(400)
            expect(partUrl).not.toHaveBeenCalled()
        },
    )

    it('keeps the part size across /multipart/resume re-issues', async () => {
        const handler = createUpupHandler(config)
        const { token } = await initUpload(handler, 12 * MiB)
        const { listMultipartParts } = await import('../src/providers/aws')
        vi.mocked(listMultipartParts).mockResolvedValue({ parts: [] })
        const res = await post(handler, '/multipart/resume', { token })
        expect(res.status).toBe(200)
        const fresh = ((await res.json()) as { token: string }).token
        const payload = await verifyUploadToken(SECRET, fresh, Date.now())
        expect(payload.ps).toBe(5 * MiB)
    })

    const legacyToken = (iat: number) => {
        const legacy: UploadTokenPayload = {
            k: 'uuid-big.zip',
            u: 'mp-123',
            uid: null,
            smin: 0,
            smax: 12 * MiB,
            exp: Math.floor(Date.now() / 1000) + 600,
            iat,
        }
        return signUploadToken(SECRET, legacy)
    }

    it('a token minted BEFORE the cutoff without a part size still signs (no length; complete-time check still applies)', async () => {
        const handler = createUpupHandler(config)
        const token = await legacyToken(PART_LENGTH_BINDING_CUTOFF_SECONDS - 1)
        const res = await post(handler, '/multipart/sign-part', {
            token,
            partNumber: 2,
        })
        expect(res.status).toBe(200)
        expect(signedLength()).toBeUndefined()
    })

    it('a token minted AFTER the cutoff without a part size is refused, nothing signed', async () => {
        const handler = createUpupHandler(config)
        const token = await legacyToken(PART_LENGTH_BINDING_CUTOFF_SECONDS + 1)
        const res = await post(handler, '/multipart/sign-part', {
            token,
            partNumber: 2,
        })
        expect(res.status).toBe(403)
        expect(partUrl).not.toHaveBeenCalled()
    })
})

// The review finding: `chunkSizeBytes` is client input. A value that made
// computePartSize return a non-integer used to mint a token with NO `ps`, and
// sign-part then signed part URLs with no length at all.
describe('POST /multipart/init: hostile chunkSizeBytes cannot switch off length signing (T-5492)', () => {
    beforeEach(() => {
        partUrl.mockClear()
    })

    const initWith = (
        handler: (r: Request) => Promise<Response>,
        chunkSizeBytes: unknown,
    ) =>
        post(handler, '/multipart/init', {
            name: 'big.zip',
            size: 12 * MiB,
            type: 'application/zip',
            chunkSizeBytes,
        })

    it.each([
        5242880.5,
        '9e9',
        '5242880',
        -5 * MiB,
        0,
        Number.MAX_SAFE_INTEGER,
        6 * 1024 * MiB,
        true,
        {},
    ])('rejects chunkSizeBytes=%j with 400 and mints nothing', async value => {
        const handler = createUpupHandler(config)
        const res = await initWith(handler, value)
        expect(res.status).toBe(400)
        expect(((await res.json()) as { token?: string }).token).toBeUndefined()
    })

    it('treats null / absent chunkSizeBytes as "use the server default" (and still binds ps)', async () => {
        const handler = createUpupHandler(config)
        for (const value of [undefined, null]) {
            const res = await initWith(handler, value)
            expect(res.status).toBe(200)
            const { token } = (await res.json()) as { token: string }
            const payload = await verifyUploadToken(SECRET, token, Date.now())
            expect(payload.ps).toBe(5 * MiB)
        }
    })

    it('a valid integer chunk size is honoured, bound into the token and length-signed', async () => {
        const handler = createUpupHandler(config)
        const res = await initWith(handler, 8 * MiB)
        expect(res.status).toBe(200)
        const { token } = (await res.json()) as { token: string }
        const payload = await verifyUploadToken(SECRET, token, Date.now())
        expect(payload.ps).toBe(8 * MiB)
        await post(handler, '/multipart/sign-part', { token, partNumber: 2 })
        expect(signedLength()).toBe(4 * MiB)
    })

    it('an integer chunk below the 5 MiB floor is floored (documented), never left unbound', async () => {
        const handler = createUpupHandler(config)
        const res = await initWith(handler, 1024)
        expect(res.status).toBe(200)
        const { token } = (await res.json()) as { token: string }
        const payload = await verifyUploadToken(SECRET, token, Date.now())
        expect(payload.ps).toBe(5 * MiB)
    })
})
