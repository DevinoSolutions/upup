import { describe, it, expect } from 'vitest'
import { UploadStatus } from '../types/upload-status'
import { FileSource, UploadAdapter } from '../types/file-source'
import { StorageProvider } from '../types/storage-provider'

// ─────────────────────────────────────────────
// UploadStatus
// ─────────────────────────────────────────────
describe('UploadStatus', () => {
    it('defines IDLE', () => expect(UploadStatus.IDLE).toBe('IDLE'))
    it('defines PROCESSING', () => expect(UploadStatus.PROCESSING).toBe('PROCESSING'))
    it('defines READY', () => expect(UploadStatus.READY).toBe('READY'))
    it('defines UPLOADING', () => expect(UploadStatus.UPLOADING).toBe('UPLOADING'))
    it('defines PAUSED', () => expect(UploadStatus.PAUSED).toBe('PAUSED'))
    it('defines SUCCESSFUL', () => expect(UploadStatus.SUCCESSFUL).toBe('SUCCESSFUL'))
    it('defines FAILED', () => expect(UploadStatus.FAILED).toBe('FAILED'))

    it('has 7 distinct values', () => {
        const vals = Object.values(UploadStatus)
        expect(new Set(vals).size).toBe(7)
    })

    it('all values are non-empty strings', () => {
        for (const v of Object.values(UploadStatus)) {
            expect(typeof v).toBe('string')
            expect(v.length).toBeGreaterThan(0)
        }
    })
})

// ─────────────────────────────────────────────
// FileSource
// ─────────────────────────────────────────────
describe('FileSource', () => {
    it('defines LOCAL', () => expect(FileSource.LOCAL).toBe('LOCAL'))
    it('defines GOOGLE_DRIVE', () => expect(FileSource.GOOGLE_DRIVE).toBe('GOOGLE_DRIVE'))
    it('defines ONE_DRIVE', () => expect(FileSource.ONE_DRIVE).toBe('ONE_DRIVE'))
    it('defines DROPBOX', () => expect(FileSource.DROPBOX).toBe('DROPBOX'))
    it('defines URL', () => expect(FileSource.URL).toBe('URL'))
    it('defines CAMERA', () => expect(FileSource.CAMERA).toBe('CAMERA'))
    it('defines MICROPHONE', () => expect(FileSource.MICROPHONE).toBe('MICROPHONE'))
    it('defines SCREEN', () => expect(FileSource.SCREEN).toBe('SCREEN'))

    it('has 8 distinct values', () => {
        const vals = Object.values(FileSource)
        expect(new Set(vals).size).toBe(8)
    })

    it('all values are non-empty strings', () => {
        for (const v of Object.values(FileSource)) {
            expect(typeof v).toBe('string')
            expect(v.length).toBeGreaterThan(0)
        }
    })
})

// ─────────────────────────────────────────────
// UploadAdapter (deprecated alias — maps to FileSource values)
// ─────────────────────────────────────────────
describe('UploadAdapter (deprecated)', () => {
    it('INTERNAL maps to FileSource.LOCAL', () => {
        expect(UploadAdapter.INTERNAL).toBe(FileSource.LOCAL)
    })

    it('GOOGLE_DRIVE maps to FileSource.GOOGLE_DRIVE', () => {
        expect(UploadAdapter.GOOGLE_DRIVE).toBe(FileSource.GOOGLE_DRIVE)
    })

    it('ONE_DRIVE maps to FileSource.ONE_DRIVE', () => {
        expect(UploadAdapter.ONE_DRIVE).toBe(FileSource.ONE_DRIVE)
    })

    it('DROPBOX maps to FileSource.DROPBOX', () => {
        expect(UploadAdapter.DROPBOX).toBe(FileSource.DROPBOX)
    })

    it('LINK maps to FileSource.URL', () => {
        expect(UploadAdapter.LINK).toBe(FileSource.URL)
    })

    it('CAMERA maps to FileSource.CAMERA', () => {
        expect(UploadAdapter.CAMERA).toBe(FileSource.CAMERA)
    })
})

// ─────────────────────────────────────────────
// StorageProvider
// ─────────────────────────────────────────────
describe('StorageProvider', () => {
    it('defines AWS with value "aws"', () => expect(StorageProvider.AWS).toBe('aws'))
    it('defines Azure with value "azure"', () => expect(StorageProvider.Azure).toBe('azure'))
    it('defines BackBlaze with value "backblaze"', () => expect(StorageProvider.BackBlaze).toBe('backblaze'))
    it('defines DigitalOcean with value "digitalocean"', () => expect(StorageProvider.DigitalOcean).toBe('digitalocean'))

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
