// Contract: one bad part must never sink — or hang — a multipart upload.
//
// A part attempt that fails TRANSIENTLY (network death, 429, 5xx) or STALLS
// (no response inside `partTimeoutMs`) is retried on the `retryDelays`
// schedule and the upload still completes. A DEFINITIVE rejection (any other
// 4xx) is a verdict: it propagates on the first attempt, exactly as before
// retries existed. The user's abort wins over everything, including a backoff
// wait in progress. Before the watchdog existed, a PUT that neither succeeded
// nor failed hung `Promise.all(activeParts)` forever with no error and no
// retry — reproduced against LocalStack (part 4 of 4 issued, never settled).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultipartUpload } from '../../src/strategies/multipart-upload'
import type { CredentialStrategy } from '../../src/contracts-strategies'
import type { PresignedUrlResponse } from '@upupjs/core'
import {
    installXhrPartMock,
    type PartRequest,
    type PartResponse,
} from './xhr-part-mock'

const PART = 1024 // tiny parts keep fixtures cheap; sizing math is unchanged

// MultipartUpload never reads its `credentials` param (see the `_credentials`
// name in src/strategies/multipart-upload.ts) — a minimal, type-correct
// stand-in satisfies the UploadStrategy#upload signature.
const unusedCredentials: PresignedUrlResponse = {
    key: '',
    uploadUrl: '',
    expiresIn: 0,
}

function makeCredentials(): CredentialStrategy {
    return {
        getPresignedUrl: vi.fn(),
        initMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/big.zip',
            uploadId: 'upload-123',
            partSize: PART,
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

function makeFile(parts = 2): File {
    return new File([new ArrayBuffer(parts * PART)], 'big.zip', {
        type: 'application/zip',
    })
}

function okResponse(partNumber: number): PartResponse {
    return { status: 200, headers: { ETag: `"etag-${partNumber}"` } }
}

function errorResponse(status: number, body = ''): PartResponse {
    return { status, statusText: `HTTP ${status}`, responseText: body }
}

/** A PUT that neither reports progress nor settles — the pre-watchdog
 *  forever-hang. Only the strategy's inactivity watchdog (or the caller's
 *  signal) ends it, which is exactly the path these tests exercise. */
function neverSettles(): Promise<PartResponse> {
    return new Promise<PartResponse>(() => {})
}

const { puts } = installXhrPartMock()

function makeStrategy(overrides: {
    retryDelays?: number[]
    partTimeoutMs?: number
    maxConcurrentParts?: number
}): MultipartUpload {
    return new MultipartUpload({
        credentials: makeCredentials(),
        chunkSizeBytes: PART,
        maxConcurrentParts: overrides.maxConcurrentParts ?? 1,
        retryDelays: overrides.retryDelays ?? [0, 0],
        partTimeoutMs: overrides.partTimeoutMs ?? 60_000,
    })
}

beforeEach(() => {
    puts.mockReset()
})

describe('per-part retry on transient failures', () => {
    it('a 503 on one part is retried on the retryDelays schedule and the upload completes', async () => {
        const strategy = makeStrategy({ retryDelays: [0, 0] })
        let part2Attempts = 0
        puts.mockImplementation(async (req: PartRequest) => {
            const part = Number(req.url.match(/part(\d)/)?.[1])
            if (part === 2 && part2Attempts++ === 0) {
                return errorResponse(
                    503,
                    '<Error><Code>RequestTimeout</Code></Error>',
                )
            }
            return okResponse(part)
        })

        const result = await strategy.upload(makeFile(2), unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(result.key).toBe('uploads/big.zip')
        expect(part2Attempts).toBe(2)
        // 2 parts + 1 retry of part 2
        expect(puts).toHaveBeenCalledTimes(3)
    })

    it('a network-level PUT rejection (TypeError) is retried, not fatal', async () => {
        const strategy = makeStrategy({ retryDelays: [0] })
        let first = true
        puts.mockImplementation(async (req: PartRequest) => {
            if (first) {
                first = false
                throw new TypeError('Failed to fetch')
            }
            return okResponse(Number(req.url.match(/part(\d)/)?.[1]))
        })

        const result = await strategy.upload(makeFile(1), unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(result.key).toBe('uploads/big.zip')
        expect(puts).toHaveBeenCalledTimes(2)
    })

    it('a definitive 4xx (403) propagates on the FIRST attempt — no retry hides a verdict', async () => {
        const strategy = makeStrategy({ retryDelays: [0, 0, 0] })
        puts.mockResolvedValue(
            errorResponse(
                403,
                '<Error><Code>SignatureDoesNotMatch</Code><Message>bad sig</Message></Error>',
            ),
        )

        const err = await strategy
            .upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })
            .catch((e: unknown) => e as Error & { code?: string })

        expect((err as { code?: string }).code).toBe('SignatureDoesNotMatch')
        expect(puts).toHaveBeenCalledTimes(1)
    })

    it('an exhausted retryDelays budget surfaces the last transient error', async () => {
        const strategy = makeStrategy({ retryDelays: [0] })
        puts.mockResolvedValue(errorResponse(503))

        await expect(
            strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            }),
        ).rejects.toMatchObject({ status: 503 })
        // initial attempt + exactly one retry
        expect(puts).toHaveBeenCalledTimes(2)
    })

    it('retryDelays: [] restores single-attempt semantics for transient failures', async () => {
        const strategy = makeStrategy({ retryDelays: [] })
        puts.mockResolvedValue(errorResponse(503))

        await expect(
            strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            }),
        ).rejects.toMatchObject({ status: 503 })
        expect(puts).toHaveBeenCalledTimes(1)
    })
})

describe('part stall watchdog', () => {
    // The watchdog is now an INACTIVITY timer, not a flat ceiling on total
    // part-upload time: it fires only after `partTimeoutMs` with NO upload
    // progress. These tests drive a PUT that reports no progress at all, which
    // is the genuine-stall case the watchdog exists to kill.
    it('a PUT that reports no progress at all is aborted after partTimeoutMs of inactivity, and the retry completes the upload', async () => {
        const strategy = makeStrategy({ retryDelays: [0], partTimeoutMs: 50 })
        let first = true
        puts.mockImplementation((req: PartRequest) => {
            if (first) {
                first = false
                return neverSettles()
            }
            return Promise.resolve(
                okResponse(Number(req.url.match(/part(\d)/)?.[1])),
            )
        })

        const result = await strategy.upload(makeFile(1), unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(result.key).toBe('uploads/big.zip')
        expect(puts).toHaveBeenCalledTimes(2)
    })

    // The regression Surface1 fixes: a large part on a slow-but-healthy link
    // uploads fine on master (no timeout ever existed) but a flat 180s ceiling
    // would abort it, retry identically, and deterministically fail. With the
    // inactivity watchdog, steady progress keeps the part alive however long the
    // whole transfer takes. Fake timers let the part run PAST the ceiling a flat
    // timeout would have enforced, deterministically.
    it('a PUT that keeps reporting progress past the old flat deadline is never aborted — steady bytes are not a stall', async () => {
        vi.useFakeTimers()
        try {
            const strategy = makeStrategy({
                retryDelays: [],
                partTimeoutMs: 100,
            })
            puts.mockImplementation(
                (_req: PartRequest, progress: () => void) =>
                    new Promise<PartResponse>(resolve => {
                        // A progress tick every 60ms — each one resets the 100ms
                        // inactivity window. Four ticks span 240ms, well past the
                        // ceiling a flat timeout would have enforced at 100ms.
                        let ticks = 0
                        const iv = setInterval(() => {
                            ticks++
                            progress()
                            if (ticks === 4) {
                                clearInterval(iv)
                                resolve(okResponse(1))
                            }
                        }, 60)
                    }),
            )

            const upload = strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            })
            await vi.advanceTimersByTimeAsync(400)
            const result = await upload

            expect(result.key).toBe('uploads/big.zip')
            expect(puts).toHaveBeenCalledTimes(1)
        } finally {
            vi.useRealTimers()
        }
    })

    it('a stall that outlives the whole retry budget surfaces as a TIMEOUT error, never a hang', async () => {
        const strategy = makeStrategy({ retryDelays: [], partTimeoutMs: 50 })
        puts.mockImplementation(() => neverSettles())

        await expect(
            strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            }),
        ).rejects.toMatchObject({ code: 'TIMEOUT' })
    })

    it('a hung sign-part call is also cut off by the watchdog instead of hanging the part', async () => {
        const credentials = makeCredentials()
        vi.mocked(credentials.signPart!)
            .mockImplementationOnce(() => new Promise(() => {})) // never settles
            .mockImplementation(async ({ partNumber }) => ({
                uploadUrl: `https://s3/part${partNumber}?signed`,
                expiresIn: 3600,
            }))
        const strategy = new MultipartUpload({
            credentials,
            chunkSizeBytes: PART,
            maxConcurrentParts: 1,
            retryDelays: [0],
            partTimeoutMs: 50,
        })
        puts.mockImplementation(async (req: PartRequest) =>
            okResponse(Number(req.url.match(/part(\d)/)?.[1])),
        )

        const result = await strategy.upload(makeFile(1), unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(result.key).toBe('uploads/big.zip')
        expect(credentials.signPart).toHaveBeenCalledTimes(2)
    })
})

describe('abort beats retry', () => {
    it('an abort during the backoff wait stops the part immediately — no further attempts', async () => {
        const controller = new AbortController()
        const strategy = makeStrategy({ retryDelays: [60_000] })
        puts.mockImplementation(async () => {
            // Fail transiently, then abort while the 60s backoff is pending.
            setTimeout(() => controller.abort(), 10)
            return errorResponse(503)
        })

        const started = Date.now()
        await expect(
            strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: controller.signal,
            }),
        ).rejects.toThrow()
        // Well under the 60s delay: the abort woke the backoff sleep.
        expect(Date.now() - started).toBeLessThan(5_000)
        expect(puts).toHaveBeenCalledTimes(1)
    })

    it('an abort mid-attempt propagates as an abort, not as a retryable stall', async () => {
        const controller = new AbortController()
        const strategy = makeStrategy({
            retryDelays: [0, 0],
            partTimeoutMs: 60_000,
        })
        puts.mockImplementation((_req: PartRequest) => {
            // Cancel the whole upload mid-PUT: the strategy must read this as
            // the user's abort, not the watchdog's retryable stall.
            controller.abort()
            return neverSettles()
        })

        await expect(
            strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: controller.signal,
            }),
        ).rejects.toThrow()
        expect(puts).toHaveBeenCalledTimes(1)
    })
})
