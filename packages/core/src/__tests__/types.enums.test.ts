import { describe, it, expect } from 'vitest'
import { UploadStatus } from '../types/upload-status'
import { FileSource } from '../types/file-source'
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
    it('defines LOCAL', () => expect(FileSource.LOCAL).toBe('local'))
    it('defines GOOGLE_DRIVE', () => expect(FileSource.GOOGLE_DRIVE).toBe('googleDrive'))
    it('defines ONE_DRIVE', () => expect(FileSource.ONE_DRIVE).toBe('oneDrive'))
    it('defines DROPBOX', () => expect(FileSource.DROPBOX).toBe('dropbox'))
    it('defines BOX', () => expect(FileSource.BOX).toBe('box'))
    it('defines URL', () => expect(FileSource.URL).toBe('url'))
    it('defines CAMERA', () => expect(FileSource.CAMERA).toBe('camera'))
    it('defines MICROPHONE', () => expect(FileSource.MICROPHONE).toBe('microphone'))
    it('defines SCREEN', () => expect(FileSource.SCREEN).toBe('screen'))

    it('has 9 distinct values', () => {
        const vals = Object.values(FileSource)
        expect(new Set(vals).size).toBe(9)
    })

    it('all values are non-empty strings', () => {
        for (const v of Object.values(FileSource)) {
            expect(typeof v).toBe('string')
            expect(v.length).toBeGreaterThan(0)
        }
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
