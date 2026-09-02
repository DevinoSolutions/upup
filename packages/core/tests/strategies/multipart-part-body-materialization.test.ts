// Contract: a part PUT sends BYTES, never a lazy Blob reference.
//
// Firefox streams a Blob body lazily during XMLHttpRequest.send(). When the
// Blob is a slice of a File revived from IndexedDB after a page reload
// (crash-recovery's resume path), that lazy read can stall: the request
// headers go out but the body never follows, so the storage backend times the
// part out — observed live as a 503 storm on both single-node MinIO and real
// Backblaze B2, Firefox-only, reload-resume-only, while the very same revived
// blob read fine via arrayBuffer(). Materializing the slice BEFORE send()
// turns a broken source into a clean, retryable rejection instead of a
// hanging bodyless request. Materialization is capped: parts above
// MATERIALIZE_PART_MAX_BYTES (16 MiB — partSize scales with file size via the
// 10,000-part clamp) keep the streaming Blob path so huge files can't blow the
// heap. These tests pin the contract: the body shape on both sides of the
// ceiling, the retryable read rejection, the read stall cut off by its own
// partTimeoutMs deadline (a separate window from the PUT watchdog), and abort
// reaching an in-flight read.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultipartUpload } from '../../src/strategies/multipart-upload'
import type { CredentialStrategy } from '../../src/contracts-strategies'
import type { PresignedUrlResponse } from '@useupup/core'
import { installXhrPartMock, type PartRequest } from './xhr-part-mock'

const PART = 1024 // tiny parts keep fixtures cheap; sizing math is unchanged

// MultipartUpload never reads its `credentials` param (see the `_credentials`
// name in src/strategies/multipart-upload.ts) — a minimal, type-correct
// stand-in satisfies the UploadStrategy#upload signature.
const unusedCredentials: PresignedUrlResponse = {
    key: '',
    uploadUrl: '',
    expiresIn: 0,
}

function makeCredentials(partSize = PART): CredentialStrategy {
    return {
        getPresignedUrl: vi.fn(),
        initMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/big.zip',
            uploadId: 'upload-123',
            partSize,
            expiresIn: 3600,
            token: 'tok-abc',
        }),
        signPart: vi.fn().mockImplementation(async ({ partNumber }) => ({
            uploadUrl: `https://s3/part${partNumber}?signed`,
            expiresIn: 3600,
        })),
        completeMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/big.zip',
            etag: '"final"',
        }),
        abortMultipartUpload: vi.fn().mockResolvedValue(undefined),
    }
}

const { puts, respondOk } = installXhrPartMock()

function makeStrategy(overrides?: {
    retryDelays?: number[]
    partTimeoutMs?: number
}): MultipartUpload {
    return new MultipartUpload({
        credentials: makeCredentials(),
        chunkSizeBytes: PART,
        maxConcurrentParts: 1,
        retryDelays: overrides?.retryDelays ?? [0, 0],
        partTimeoutMs: overrides?.partTimeoutMs ?? 60_000,
    })
}

/** A File whose FIRST slice call yields a blob with the given arrayBuffer
 *  behavior; every later call delegates to the real slice. Models the
 *  reload-revived File whose first read misbehaves but whose source is
 *  still intact for the retry. */
function fileWithFirstSliceBroken(
    parts: number,
    brokenArrayBuffer: () => Promise<ArrayBuffer>,
): File {
    const file = new File([new ArrayBuffer(parts * PART)], 'big.zip', {
        type: 'application/zip',
    })
    const realSlice = file.slice.bind(file)
    let firstCall = true
    Object.defineProperty(file, 'slice', {
        value: (start?: number, end?: number): Blob => {
            const real = realSlice(start, end)
            if (!firstCall) return real
            firstCall = false
            // Delegate everything except arrayBuffer to the real slice.
            return new Proxy(real, {
                get(target, prop, receiver) {
                    if (prop === 'arrayBuffer') return brokenArrayBuffer
                    const value = Reflect.get(target, prop, receiver)
                    return typeof value === 'function'
                        ? value.bind(target)
                        : value
                },
            })
        },
    })
    return file
}

beforeEach(() => {
    puts.mockReset()
})

describe('part body materialization (Firefox revived-blob stall)', () => {
    it('every part PUT carries a materialized ArrayBuffer of exactly the slice bytes, never a lazy Blob', async () => {
        respondOk()
        const strategy = makeStrategy()
        const file = new File([new ArrayBuffer(2 * PART + 100)], 'big.zip')

        await strategy.upload(file, unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(puts).toHaveBeenCalledTimes(3)
        const bodies = puts.mock.calls.map(
            ([req]: [PartRequest, () => void]) => req.body,
        )
        for (const body of bodies) {
            expect(body).toBeInstanceOf(ArrayBuffer)
        }
        expect((bodies[0] as ArrayBuffer).byteLength).toBe(PART)
        expect((bodies[1] as ArrayBuffer).byteLength).toBe(PART)
        expect((bodies[2] as ArrayBuffer).byteLength).toBe(100)
    })

    it('a part larger than the materialization ceiling keeps the streaming Blob path (no huge-file heap blow-up)', async () => {
        respondOk()
        const BIG = 16 * 1024 * 1024 + 1 // one byte over MATERIALIZE_PART_MAX_BYTES
        const strategy = new MultipartUpload({
            credentials: makeCredentials(BIG),
            chunkSizeBytes: BIG,
            maxConcurrentParts: 1,
            retryDelays: [0],
            partTimeoutMs: 60_000,
        })
        const file = new File([new ArrayBuffer(BIG)], 'big.zip')

        await strategy.upload(file, unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(puts).toHaveBeenCalledTimes(1)
        const bodies = puts.mock.calls.map(
            ([req]: [PartRequest, () => void]) => req.body,
        )
        expect(bodies[0]).toBeInstanceOf(Blob)
        expect((bodies[0] as Blob).size).toBe(BIG)
    })

    it('a slice read that REJECTS (NotReadableError) burns one retry slot and the re-read completes the upload', async () => {
        respondOk()
        const strategy = makeStrategy({ retryDelays: [0] })
        const file = fileWithFirstSliceBroken(2, () =>
            Promise.reject(
                new DOMException(
                    'The file could not be read',
                    'NotReadableError',
                ),
            ),
        )

        await strategy.upload(file, unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        // Part 1's first attempt died at the read (no PUT hit the wire), the
        // retry re-sliced and uploaded it, then part 2 followed: 2 PUTs total.
        expect(puts).toHaveBeenCalledTimes(2)
    })

    it('a slice read that NEVER SETTLES trips the partTimeoutMs read deadline and the retry completes the upload', async () => {
        respondOk()
        const strategy = makeStrategy({
            retryDelays: [0],
            partTimeoutMs: 50,
        })
        const file = fileWithFirstSliceBroken(
            2,
            () => new Promise<ArrayBuffer>(() => {}),
        )

        await strategy.upload(file, unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(puts).toHaveBeenCalledTimes(2)
    })

    it('aborting mid-read cancels the hanging source read immediately instead of waiting out the read deadline', async () => {
        respondOk()
        const strategy = makeStrategy({
            retryDelays: [],
            partTimeoutMs: 60_000,
        })
        const controller = new AbortController()
        const file = fileWithFirstSliceBroken(
            1,
            () => new Promise<ArrayBuffer>(() => {}),
        )

        const settled = strategy
            .upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: controller.signal,
            })
            .then(
                () => null,
                (err: unknown) => err,
            )
        // Let the upload reach the hanging read, then abort. With a 60s read
        // deadline, only the abort arm of the race can settle this before the
        // suite's own timeout — a hang here means abort never reached the read.
        await new Promise(resolve => setTimeout(resolve, 25))
        controller.abort()

        const err = await settled
        expect(err).toBeInstanceOf(Error)
        expect((err as Error).message).toMatch(/abort/i)
        expect(puts).not.toHaveBeenCalled()
    })

    it('the read deadline and the PUT watchdog are separate windows — a slow read does not shrink the PUT budget', async () => {
        // partTimeoutMs=100; the read takes ~70ms and the PUT takes ~70ms.
        // Each phase is inside its own window but their sum exceeds one
        // window — success with a single PUT pins the "up to 3 ×, not 1 ×"
        // docstring claim (the read timer must not keep running into the PUT).
        puts.mockImplementation(async (req: PartRequest) => {
            await new Promise(resolve => setTimeout(resolve, 70))
            const partNumber = Number(/part(\d+)/.exec(req.url)?.[1] ?? '0')
            return { status: 200, headers: { ETag: `"etag-${partNumber}"` } }
        })
        const strategy = makeStrategy({ retryDelays: [], partTimeoutMs: 100 })
        const file = fileWithFirstSliceBroken(1, async () => {
            await new Promise(resolve => setTimeout(resolve, 70))
            return new ArrayBuffer(PART)
        })

        await strategy.upload(file, unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(puts).toHaveBeenCalledTimes(1)
    })

    it('a slice read rejection with an empty retry budget propagates as a retryable-classified failure, not a hang', async () => {
        respondOk()
        const strategy = makeStrategy({ retryDelays: [] })
        const file = fileWithFirstSliceBroken(1, () =>
            Promise.reject(
                new DOMException(
                    'The file could not be read',
                    'NotReadableError',
                ),
            ),
        )

        await expect(
            strategy.upload(file, unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            }),
        ).rejects.toThrow(/source read failed/)
        expect(puts).not.toHaveBeenCalled()
    })
})
