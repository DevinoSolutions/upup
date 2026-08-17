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

function okResponse(partNumber: number) {
    return {
        ok: true,
        status: 200,
        headers: new Headers({ ETag: `"etag-${partNumber}"` }),
    }
}

function errorResponse(status: number, body = '') {
    return {
        ok: false,
        status,
        statusText: `HTTP ${status}`,
        text: () => Promise.resolve(body),
        headers: new Headers(),
    }
}

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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
    mockFetch.mockReset()
})

describe('per-part retry on transient failures', () => {
    it('a 503 on one part is retried on the retryDelays schedule and the upload completes', async () => {
        const strategy = makeStrategy({ retryDelays: [0, 0] })
        let part2Attempts = 0
        mockFetch.mockImplementation(async (url: string) => {
            const part = Number(url.match(/part(\d)/)?.[1])
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
        expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('a network-level fetch rejection (TypeError) is retried, not fatal', async () => {
        const strategy = makeStrategy({ retryDelays: [0] })
        let first = true
        mockFetch.mockImplementation(async (url: string) => {
            if (first) {
                first = false
                throw new TypeError('Failed to fetch')
            }
            return okResponse(Number(url.match(/part(\d)/)?.[1]))
        })

        const result = await strategy.upload(makeFile(1), unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(result.key).toBe('uploads/big.zip')
        expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('a definitive 4xx (403) propagates on the FIRST attempt — no retry hides a verdict', async () => {
        const strategy = makeStrategy({ retryDelays: [0, 0, 0] })
        mockFetch.mockResolvedValue(
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
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('an exhausted retryDelays budget surfaces the last transient error', async () => {
        const strategy = makeStrategy({ retryDelays: [0] })
        mockFetch.mockResolvedValue(errorResponse(503))

        await expect(
            strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            }),
        ).rejects.toMatchObject({ status: 503 })
        // initial attempt + exactly one retry
        expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('retryDelays: [] restores single-attempt semantics for transient failures', async () => {
        const strategy = makeStrategy({ retryDelays: [] })
        mockFetch.mockResolvedValue(errorResponse(503))

        await expect(
            strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            }),
        ).rejects.toMatchObject({ status: 503 })
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })
})

describe('part stall watchdog', () => {
    it('a PUT that never settles is aborted at partTimeoutMs and the retry completes the upload', async () => {
        const strategy = makeStrategy({ retryDelays: [0], partTimeoutMs: 50 })
        let first = true
        mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
            if (first) {
                first = false
                // Settle ONLY on abort — the pre-watchdog forever-hang.
                return new Promise((_, reject) => {
                    init.signal?.addEventListener('abort', () =>
                        reject(new DOMException('Aborted', 'AbortError')),
                    )
                })
            }
            return okResponse(Number(url.match(/part(\d)/)?.[1]))
        })

        const result = await strategy.upload(makeFile(1), unusedCredentials, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(result.key).toBe('uploads/big.zip')
        expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('a stall that outlives the whole retry budget surfaces as a TIMEOUT error, never a hang', async () => {
        const strategy = makeStrategy({ retryDelays: [], partTimeoutMs: 50 })
        mockFetch.mockImplementation(
            (_url: string, init: RequestInit) =>
                new Promise((_, reject) => {
                    init.signal?.addEventListener('abort', () =>
                        reject(new DOMException('Aborted', 'AbortError')),
                    )
                }),
        )

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
        mockFetch.mockImplementation(async (url: string) =>
            okResponse(Number(url.match(/part(\d)/)?.[1])),
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
        mockFetch.mockImplementation(async () => {
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
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('an abort mid-attempt propagates as an abort, not as a retryable stall', async () => {
        const controller = new AbortController()
        const strategy = makeStrategy({
            retryDelays: [0, 0],
            partTimeoutMs: 60_000,
        })
        mockFetch.mockImplementation(
            (_url: string, init: RequestInit) =>
                new Promise((_, reject) => {
                    init.signal?.addEventListener('abort', () =>
                        reject(new DOMException('Aborted', 'AbortError')),
                    )
                    controller.abort()
                }),
        )

        await expect(
            strategy.upload(makeFile(1), unusedCredentials, {
                onProgress: vi.fn(),
                signal: controller.signal,
            }),
        ).rejects.toThrow()
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })
})
