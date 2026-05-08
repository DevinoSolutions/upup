import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    compressFile,
    PREVIEW_MAX_TEXT_SIZE,
    PREVIEW_TEXT_TRUNCATE_LENGTH,
} from '../src/lib/file'
import { FacingMode } from '../src/hooks/useCameraUploader'
import { FileSource, StorageProvider, UploadStatus, type UploadFile } from '@upup/core'

// ─────────────────────────────────────────────
// Preview size constants
// ─────────────────────────────────────────────
describe('PREVIEW_MAX_TEXT_SIZE', () => {
    it('equals 512 KB (524288 bytes)', () => {
        expect(PREVIEW_MAX_TEXT_SIZE).toBe(512 * 1024)
    })

    it('is a number', () => {
        expect(typeof PREVIEW_MAX_TEXT_SIZE).toBe('number')
    })

    it('is positive', () => {
        expect(PREVIEW_MAX_TEXT_SIZE).toBeGreaterThan(0)
    })
})

describe('PREVIEW_TEXT_TRUNCATE_LENGTH', () => {
    it('equals 100 000 characters', () => {
        expect(PREVIEW_TEXT_TRUNCATE_LENGTH).toBe(100_000)
    })

    it('is a number', () => {
        expect(typeof PREVIEW_TEXT_TRUNCATE_LENGTH).toBe('number')
    })

    it('is less than PREVIEW_MAX_TEXT_SIZE (bytes > chars after encoding)', () => {
        // Sanity: truncation char limit is meaningful relative to byte limit
        expect(PREVIEW_TEXT_TRUNCATE_LENGTH).toBeLessThan(PREVIEW_MAX_TEXT_SIZE)
    })
})

// ─────────────────────────────────────────────
// compressFile
// ─────────────────────────────────────────────
describe('compressFile', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    function makeUploadFile(content: string, name = 'test.txt'): UploadFile {
        const encoded = new TextEncoder().encode(content)
        const file = new File([encoded], name, { type: 'text/plain' })
        vi.spyOn(URL, 'createObjectURL').mockReturnValue(`blob:${name}`)
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        // Polyfill arrayBuffer for jsdom environments that may not support it on File
        const withMethods = Object.assign(file, {
            id: 'original-id',
            url: `blob:original-${name}`,
            source: FileSource.LOCAL,
            status: UploadStatus.READY,
            metadata: {},
            thumbnail: undefined,
            fileHash: 'abc',
            key: 'uploads/test.txt',
            arrayBuffer: async () => encoded.buffer as ArrayBuffer,
        })
        return withMethods as unknown as UploadFile
    }

    it('returns an UploadFile', async () => {
        const file = makeUploadFile('hello world')
        const result = await compressFile(file)
        expect(result).toBeDefined()
        expect(typeof result.id).toBe('string')
    })

    it('produces a .gz file name', async () => {
        const file = makeUploadFile('hello world', 'data.txt')
        const result = await compressFile(file)
        expect(result.name).toBe('data.txt.gz')
    })

    it('sets MIME type to application/octet-stream', async () => {
        const file = makeUploadFile('hello world')
        const result = await compressFile(file)
        expect(result.type).toBe('application/octet-stream')
    })

    it('preserves the original file id', async () => {
        const file = makeUploadFile('content')
        const result = await compressFile(file)
        expect(result.id).toBe('original-id')
    })

    it('preserves the original fileHash', async () => {
        const file = makeUploadFile('content')
        const result = await compressFile(file)
        expect(result.fileHash).toBe('abc')
    })

    it('preserves the original key', async () => {
        const file = makeUploadFile('content')
        const result = await compressFile(file)
        expect(result.key).toBe('uploads/test.txt')
    })

    it('produces a smaller or equal file for typical text content', async () => {
        // gzip typically reduces repetitive text
        const content = 'aaaa'.repeat(500)
        const file = makeUploadFile(content)
        const result = await compressFile(file)
        expect(result.size).toBeLessThan(file.size)
    })

    it('produces a file with size > 0', async () => {
        const file = makeUploadFile('some content')
        const result = await compressFile(file)
        expect(result.size).toBeGreaterThan(0)
    })
})

// ─────────────────────────────────────────────
// FacingMode enum
// ─────────────────────────────────────────────
describe('FacingMode', () => {
    it('defines Environment = "environment"', () => {
        expect(FacingMode.Environment).toBe('environment')
    })

    it('defines User = "user"', () => {
        expect(FacingMode.User).toBe('user')
    })

    it('has 2 distinct values', () => {
        const vals = Object.values(FacingMode)
        expect(new Set(vals).size).toBe(2)
    })

    it('all values are lowercase strings', () => {
        for (const v of Object.values(FacingMode)) {
            expect(v).toBe(v.toLowerCase())
        }
    })
})

// ─────────────────────────────────────────────
// StorageProvider enum
// ─────────────────────────────────────────────
describe('StorageProvider', () => {
    it('defines AWS = "aws"', () => {
        expect(StorageProvider.AWS).toBe('aws')
    })

    it('defines Azure = "azure"', () => {
        expect(StorageProvider.Azure).toBe('azure')
    })

    it('defines BackBlaze = "backblaze"', () => {
        expect(StorageProvider.BackBlaze).toBe('backblaze')
    })

    it('defines DigitalOcean = "digitalocean"', () => {
        expect(StorageProvider.DigitalOcean).toBe('digitalocean')
    })

    it('defines CloudflareR2 = "r2"', () => {
        expect(StorageProvider.CloudflareR2).toBe('r2')
    })

    it('defines Wasabi = "wasabi"', () => {
        expect(StorageProvider.Wasabi).toBe('wasabi')
    })

    it('defines MinIO = "minio"', () => {
        expect(StorageProvider.MinIO).toBe('minio')
    })

    it('defines GCS = "gcs"', () => {
        expect(StorageProvider.GCS).toBe('gcs')
    })

    it('has 21 distinct values', () => {
        const vals = Object.values(StorageProvider)
        expect(new Set(vals).size).toBe(21)
    })

    it('all values are lowercase strings', () => {
        for (const v of Object.values(StorageProvider)) {
            expect(v).toBe(v.toLowerCase())
        }
    })
})
