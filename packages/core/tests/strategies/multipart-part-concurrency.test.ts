// Contract: `maxConcurrentParts` is the number of parts of ONE file the
// strategy keeps in flight, and it is honoured exactly — 3 unless configured.
// Raising it trades memory and sockets for throughput on a fast link; lowering
// it to 1 serializes the parts. The value is clamped to a whole number >= 1,
// so a caller who passes 0 (or 2.9) still gets a working upload with a sane
// in-flight count rather than whatever the loop's own bookkeeping implies.
//
// Every mocked PUT parks until this file releases it, so "in flight" is a
// counted fact, not a timing guess: each release wave IS the set of parts the
// upload loop had running when it stalled on its concurrency gate.

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

function makeFile(parts: number): File {
    return new File([new ArrayBuffer(parts * PART)], 'big.zip', {
        type: 'application/zip',
    })
}

function makeStrategy(maxConcurrentParts?: number): MultipartUpload {
    return new MultipartUpload({
        credentials: makeCredentials(),
        chunkSizeBytes: PART,
        ...(maxConcurrentParts !== undefined ? { maxConcurrentParts } : {}),
        retryDelays: [],
        partTimeoutMs: 60_000,
    })
}

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

type ConcurrencyProbe = {
    /** Highest number of PUTs simultaneously unresolved. */
    peakInFlight: number
    /** Part numbers in the order their PUT was issued. */
    issuedParts: number[]
    /** Size of each release wave — the loop's in-flight count at that moment. */
    waves: number[]
}

/**
 * Installs a fetch mock whose PUTs park until released, and returns the probe
 * it fills in. Nothing settles on its own, so the counters below describe the
 * loop's real concurrency instead of racing it.
 */
function probeInFlightPuts(): ConcurrencyProbe & { parked: Array<() => void> } {
    const parked: Array<() => void> = []
    const probe = {
        peakInFlight: 0,
        issuedParts: [] as number[],
        waves: [] as number[],
        parked,
    }
    let inFlight = 0

    mockFetch.mockImplementation(async (url: string) => {
        const partNumber = Number(url.match(/part(\d+)/)?.[1])
        probe.issuedParts.push(partNumber)
        inFlight++
        probe.peakInFlight = Math.max(probe.peakInFlight, inFlight)
        await new Promise<void>(resolve => {
            parked.push(resolve)
        })
        inFlight--
        return {
            ok: true,
            status: 200,
            headers: new Headers({ ETag: `"etag-${partNumber}"` }),
        }
    })

    return probe
}

/** Yields to the event loop so every part the upload can start has started. */
function flushTasks(): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(resolve, 0)
    })
}

/**
 * Drives a parked upload to completion: repeatedly lets the loop fill up to
 * its concurrency gate, then releases exactly the PUTs it had running. The
 * iteration bound turns a would-be hang into a named failure.
 */
async function releaseWavesUntilSettled(
    upload: Promise<unknown>,
    probe: ReturnType<typeof probeInFlightPuts>,
): Promise<void> {
    let settled = false
    const markSettled = () => {
        settled = true
    }
    void upload.then(markSettled, markSettled)

    for (let wave = 0; !settled; wave++) {
        if (wave > 200) {
            throw new Error('upload never settled — parts stopped progressing')
        }
        await flushTasks()
        if (probe.parked.length === 0) continue
        probe.waves.push(probe.parked.length)
        for (const release of probe.parked.splice(0)) release()
    }
}

async function uploadWithProbe(
    strategy: MultipartUpload,
    parts: number,
): Promise<ConcurrencyProbe & { key: string }> {
    const probe = probeInFlightPuts()
    const upload = strategy.upload(makeFile(parts), unusedCredentials, {
        onProgress: vi.fn(),
        signal: new AbortController().signal,
    })
    await releaseWavesUntilSettled(upload, probe)
    const result = await upload
    return { ...probe, key: result.key }
}

beforeEach(() => {
    mockFetch.mockReset()
})

describe('multipart part concurrency', () => {
    it('keeps three parts of one file in flight by default', async () => {
        const probe = await uploadWithProbe(makeStrategy(), 6)

        expect(probe.key).toBe('uploads/big.zip')
        expect(probe.peakInFlight).toBe(3)
        expect(probe.waves).toEqual([3, 3])
        expect(probe.issuedParts).toHaveLength(6)
    })

    it('maxConcurrentParts: 1 serializes the parts in ascending order', async () => {
        const probe = await uploadWithProbe(makeStrategy(1), 4)

        expect(probe.peakInFlight).toBe(1)
        expect(probe.issuedParts).toEqual([1, 2, 3, 4])
    })

    it('maxConcurrentParts: 8 pushes more than the default three parts at once', async () => {
        const probe = await uploadWithProbe(makeStrategy(8), 12)

        expect(probe.peakInFlight).toBe(8)
        expect(probe.issuedParts).toHaveLength(12)
    })

    it('maxConcurrentParts: 0 uploads one part at a time instead of stalling forever', async () => {
        const probe = await uploadWithProbe(makeStrategy(0), 3)

        expect(probe.key).toBe('uploads/big.zip')
        expect(probe.peakInFlight).toBe(1)
        expect(probe.issuedParts).toEqual([1, 2, 3])
    })

    it('a fractional maxConcurrentParts is floored to a whole number of parts', async () => {
        const probe = await uploadWithProbe(makeStrategy(2.9), 4)

        expect(probe.peakInFlight).toBe(2)
        expect(probe.waves).toEqual([2, 2])
    })
})
