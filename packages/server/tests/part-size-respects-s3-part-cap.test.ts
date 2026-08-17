// Contract: no file size may ever produce more than S3's hard cap of 10,000
// parts. With the fixed 5 MiB default a >~48.8 GiB file would sail through
// init and then fail at part 10,001 — deep into a multi-hour upload.
// computePartSize is the one place that prevents that, by raising the part
// size to ceil(fileSize / 10,000) whenever the configured chunk size is too
// small for the file.

import { describe, it, expect } from 'vitest'
import { computePartSize, MIN_PART_SIZE } from '../src/providers/aws'

const MAX_PARTS = 10_000
const GiB = 1024 * 1024 * 1024

function partsFor(fileSize: number, chunkSizeBytes?: number): number {
    return Math.ceil(fileSize / computePartSize(fileSize, chunkSizeBytes))
}

describe('computePartSize vs the S3 10,000-part cap', () => {
    it('keeps the 5 MiB default for files it can cover within the cap', () => {
        expect(computePartSize(48 * GiB)).toBe(MIN_PART_SIZE)
        expect(partsFor(48 * GiB)).toBeLessThanOrEqual(MAX_PARTS)
    })

    it('raises the part size exactly at the boundary where 5 MiB parts would overflow the cap', () => {
        const boundary = MIN_PART_SIZE * MAX_PARTS // largest 5 MiB-part file
        expect(computePartSize(boundary)).toBe(MIN_PART_SIZE)
        expect(partsFor(boundary)).toBe(MAX_PARTS)

        const oneOver = boundary + 1
        expect(computePartSize(oneOver)).toBeGreaterThan(MIN_PART_SIZE)
        expect(partsFor(oneOver)).toBeLessThanOrEqual(MAX_PARTS)
    })

    it('a 100 GiB file fits in the cap instead of failing at part 10,001', () => {
        expect(partsFor(100 * GiB)).toBeLessThanOrEqual(MAX_PARTS)
    })

    it('a caller-chosen chunk size too small for the file is raised, not honoured into failure', () => {
        expect(partsFor(100 * GiB, MIN_PART_SIZE)).toBeLessThanOrEqual(
            MAX_PARTS,
        )
    })

    it('a chunk size below the S3 5 MiB floor is raised to the floor', () => {
        expect(computePartSize(10 * 1024 * 1024, 1024)).toBe(MIN_PART_SIZE)
    })
})
