import { computePartSize } from '../../backend/lib/aws/s3/s3-initiate-multipart-upload'

const MiB = 1024 * 1024

describe('computePartSize', () => {
    it('returns 5 MiB as the minimum part size', () => {
        expect(computePartSize(10 * MiB)).toBe(5 * MiB)
    })

    it('uses user-specified chunk size when it is >= 5 MiB', () => {
        expect(computePartSize(100 * MiB, 10 * MiB)).toBe(10 * MiB)
    })

    it('clamps user-specified chunk size up to 5 MiB minimum', () => {
        expect(computePartSize(100 * MiB, 1 * MiB)).toBe(5 * MiB)
    })

    it('increases part size when file requires more than 10,000 parts', () => {
        // 100 GiB with 5 MiB parts would require ~20,480 parts
        const fileSize = 100 * 1024 * MiB
        const result = computePartSize(fileSize)
        expect(result).toBeGreaterThanOrEqual(Math.ceil(fileSize / 10_000))
        expect(Math.ceil(fileSize / result)).toBeLessThanOrEqual(10_000)
    })

    it('handles very large files correctly', () => {
        // 5 TB file
        const fileSize = 5 * 1024 * 1024 * MiB
        const result = computePartSize(fileSize)
        expect(Math.ceil(fileSize / result)).toBeLessThanOrEqual(10_000)
    })

    it('handles very small files correctly', () => {
        // 1 byte file
        const result = computePartSize(1)
        expect(result).toBe(5 * MiB)
    })

    it('returns correct size when user chunk size exceeds minimum for file', () => {
        const fileSize = 50 * 1024 * MiB // 50 GiB
        const userChunk = 10 * MiB
        const result = computePartSize(fileSize, userChunk)
        // min for file = ceil(50 GiB / 10000) = ~5.24 MiB, user wants 10 MiB
        expect(result).toBe(10 * MiB)
    })
})
