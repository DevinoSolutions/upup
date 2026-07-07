import { describe, it, expect } from 'vitest'
import { bytesToSize, sizeToBytes, checkFileSize } from '../src/lib/file'

// ─────────────────────────────────────────────
// bytesToSize
// ─────────────────────────────────────────────
describe('bytesToSize', () => {
    it('returns "0 Byte" for 0 bytes', () => {
        expect(bytesToSize(0)).toBe('0 Byte')
    })

    it('formats bytes less than 1 KB as "Bytes"', () => {
        expect(bytesToSize(500)).toBe('500 Bytes')
    })

    it('formats exactly 1 KB', () => {
        expect(bytesToSize(1024)).toBe('1 KB')
    })

    it('formats exactly 1 MB', () => {
        expect(bytesToSize(1024 * 1024)).toBe('1 MB')
    })

    it('formats exactly 1 GB', () => {
        expect(bytesToSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('formats exactly 1 TB', () => {
        expect(bytesToSize(1024 ** 4)).toBe('1 TB')
    })

    it('rounds to the nearest whole number', () => {
        // 1.5 KB = 1536 bytes → rounds to 2 KB
        expect(bytesToSize(1536)).toBe('2 KB')
    })

    it('returns a string', () => {
        expect(typeof bytesToSize(1024)).toBe('string')
    })
})

// ─────────────────────────────────────────────
// sizeToBytes
// ─────────────────────────────────────────────
describe('sizeToBytes', () => {
    it('converts B to bytes (1 × 1024^0)', () => {
        expect(sizeToBytes(1, 'B')).toBe(1)
    })

    it('converts KB to bytes (1 × 1024^1)', () => {
        expect(sizeToBytes(1, 'KB')).toBe(1024)
    })

    it('converts MB to bytes (1 × 1024^2)', () => {
        expect(sizeToBytes(1, 'MB')).toBe(1024 * 1024)
    })

    it('converts GB to bytes (1 × 1024^3)', () => {
        expect(sizeToBytes(1, 'GB')).toBe(1024 ** 3)
    })

    it('converts TB to bytes (1 × 1024^4)', () => {
        expect(sizeToBytes(1, 'TB')).toBe(1024 ** 4)
    })

    it('scales linearly with the size value', () => {
        expect(sizeToBytes(5, 'MB')).toBe(5 * 1024 * 1024)
    })

    it('defaults to B when no unit provided', () => {
        expect(sizeToBytes(100)).toBe(100)
    })

    it('converts 512 MB correctly', () => {
        expect(sizeToBytes(512, 'MB')).toBe(512 * 1024 * 1024)
    })

    it('returns a number', () => {
        expect(typeof sizeToBytes(1, 'KB')).toBe('number')
    })
})

// ─────────────────────────────────────────────
// checkFileSize
// ─────────────────────────────────────────────
describe('checkFileSize', () => {
    function makeFile(sizeBytes: number): File {
        const file = new File([], 'test.bin')
        // File.size is a read-only getter — override with defineProperty
        Object.defineProperty(file, 'size', {
            value: sizeBytes,
            configurable: true,
        })
        return file
    }

    const limit = { size: 1, unit: 'MB' as const }

    // max mode (default)
    it('returns true when file is exactly the max limit', () => {
        const file = makeFile(1024 * 1024)
        expect(checkFileSize(file, limit)).toBe(true)
    })

    it('returns true when file is under the max limit', () => {
        const file = makeFile(500 * 1024)
        expect(checkFileSize(file, limit)).toBe(true)
    })

    it('returns false when file exceeds the max limit', () => {
        const file = makeFile(2 * 1024 * 1024)
        expect(checkFileSize(file, limit)).toBe(false)
    })

    it('defaults to max mode when mode is omitted', () => {
        const file = makeFile(500 * 1024)
        expect(checkFileSize(file, limit)).toBe(true)
    })

    // min mode
    it('returns true when file meets the min limit', () => {
        const file = makeFile(1024 * 1024)
        expect(checkFileSize(file, limit, 'min')).toBe(true)
    })

    it('returns true when file exceeds the min limit', () => {
        const file = makeFile(2 * 1024 * 1024)
        expect(checkFileSize(file, limit, 'min')).toBe(true)
    })

    it('returns false when file is under the min limit', () => {
        const file = makeFile(100 * 1024)
        expect(checkFileSize(file, limit, 'min')).toBe(false)
    })

    it('works with KB limits', () => {
        const kbLimit = { size: 500, unit: 'KB' as const }
        expect(checkFileSize(makeFile(400 * 1024), kbLimit)).toBe(true)
        expect(checkFileSize(makeFile(600 * 1024), kbLimit)).toBe(false)
    })
})
