import { describe, it, expect } from 'vitest'
import {
    sizeToBytes,
    bytesToSize,
    checkFileSize,
    PREVIEW_MAX_TEXT_SIZE,
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
    fileCanPreviewText,
    fileGetExtension,
    fileIs3D,
    searchDriveFiles,
} from '../src/file-utils'

describe('sizeToBytes', () => {
    it('converts MB to bytes', () => expect(sizeToBytes(1, 'MB')).toBe(1_048_576))
    it('converts GB to bytes', () => expect(sizeToBytes(1, 'GB')).toBe(1_073_741_824))
    it('returns bytes as-is', () => expect(sizeToBytes(512, 'B')).toBe(512))
})

describe('bytesToSize', () => {
    it('formats bytes', () => expect(bytesToSize(1024)).toBe('1 KB'))
    it('handles zero', () => expect(bytesToSize(0)).toBe('0 Byte'))
})

describe('checkFileSize', () => {
    it('passes when file is under max', () => {
        const file = new File(['x'.repeat(100)], 'test.txt')
        expect(checkFileSize(file, { size: 1, unit: 'MB' })).toBe(true)
    })
    it('fails when file exceeds max', () => {
        const file = new File(['x'.repeat(2_000_000)], 'big.bin')
        expect(checkFileSize(file, { size: 1, unit: 'MB' })).toBe(false)
    })
    it('checks min mode', () => {
        const file = new File(['x'.repeat(2_000_000)], 'big.bin')
        expect(checkFileSize(file, { size: 1, unit: 'MB' }, 'min')).toBe(true)
    })
})

describe('PREVIEW_MAX_TEXT_SIZE', () => {
    it('is 512 KB', () => expect(PREVIEW_MAX_TEXT_SIZE).toBe(512 * 1024))
})

describe('fileGetIsImage', () => {
    it('detects image/png', () => expect(fileGetIsImage('image/png')).toBe(true))
    it('rejects text/plain', () => expect(fileGetIsImage('text/plain')).toBe(false))
    it('returns false for undefined', () => expect(fileGetIsImage(undefined)).toBe(false))
})

describe('fileGetIsPdf', () => {
    it('detects by mime', () => expect(fileGetIsPdf('application/pdf')).toBe(true))
    it('detects by extension', () => expect(fileGetIsPdf(undefined, 'doc.pdf')).toBe(true))
    it('rejects non-pdf', () => expect(fileGetIsPdf('text/plain', 'doc.txt')).toBe(false))
})

describe('fileGetIsText', () => {
    it('detects text/* mime', () => expect(fileGetIsText('text/plain')).toBe(true))
    it('returns false with no fileType', () => expect(fileGetIsText(undefined, 'data.json')).toBe(false))
    it('detects .json with text mime', () => expect(fileGetIsText('text/json', 'data.json')).toBe(true))
})

describe('fileCanPreviewText', () => {
    it('allows small text file', () => expect(fileCanPreviewText('text/plain', 'a.txt', 1000)).toBe(true))
    it('rejects large text file', () => expect(fileCanPreviewText('text/plain', 'a.txt', 600_000)).toBe(false))
    it('allows unknown size', () => expect(fileCanPreviewText('text/plain', 'a.txt', undefined)).toBe(true))
})

describe('fileGetExtension', () => {
    it('extracts from mime', () => expect(fileGetExtension('image/png')).toBe('png'))
    it('falls back to filename', () => expect(fileGetExtension(undefined, 'photo.jpg')).toBe('jpg'))
    it('handles complex mime with dot', () => expect(fileGetExtension('application/vnd.ms-excel', 'file.xls')).toBe('xls'))
})

describe('fileIs3D', () => {
    it('detects .glb', () => expect(fileIs3D('glb')).toBe(true))
    it('rejects .png', () => expect(fileIs3D('png')).toBe(false))
    it('is case-insensitive', () => expect(fileIs3D('GLB')).toBe(true))
})

describe('searchDriveFiles', () => {
    const files = [{ name: 'Report.pdf' }, { name: 'notes.txt' }, { name: 'Report-final.pdf' }]
    it('filters by search term', () => expect(searchDriveFiles(files, 'report')).toHaveLength(2))
    it('returns all with empty search', () => expect(searchDriveFiles(files, '')).toHaveLength(3))
    it('respects case sensitivity', () => expect(searchDriveFiles(files, 'Report', { caseSensitive: true })).toHaveLength(2))
    it('supports exact match', () => expect(searchDriveFiles(files, 'notes.txt', { exactMatch: true })).toHaveLength(1))
})
