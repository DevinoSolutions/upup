import { describe, it, expect } from 'vitest'
import { compressStep } from '../../src/steps/compress'
import { exifStep } from '../../src/steps/exif'
import { heicStep } from '../../src/steps/heic'
import type { UploadFile } from '@upup/core'

// Minimal UploadFile stub
function makeFile(name: string, type: string): UploadFile {
    return { id: 'test-id', name, type, size: 100, status: 'idle' } as unknown as UploadFile
}

// Minimal PipelineContext stub
const ctx = {
    files: new Map(),
    options: {},
    emit: () => {},
    t: (k: string) => k,
} as any

// ─────────────────────────────────────────────
// compressStep
// ─────────────────────────────────────────────
describe('compressStep', () => {
    it('returns a step with name "compress"', () => {
        expect(compressStep().name).toBe('compress')
    })

    it('has a shouldProcess function', () => {
        expect(typeof compressStep().shouldProcess).toBe('function')
    })

    it('shouldProcess returns true for image/jpeg', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('photo.jpg', 'image/jpeg'))).toBe(true)
    })

    it('shouldProcess returns true for image/png', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('img.png', 'image/png'))).toBe(true)
    })

    it('shouldProcess returns true for any image/* MIME', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('img.webp', 'image/webp'))).toBe(true)
    })

    it('shouldProcess returns false for application/pdf', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('doc.pdf', 'application/pdf'))).toBe(false)
    })

    it('shouldProcess returns false for text/plain', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('readme.txt', 'text/plain'))).toBe(false)
    })

    it('process returns the file unchanged', async () => {
        const file = makeFile('photo.jpg', 'image/jpeg')
        const result = await compressStep().process(file, ctx)
        expect(result).toBe(file)
    })

    it('accepts optional compression options without throwing', () => {
        expect(() =>
            compressStep({ maxWidthOrHeight: 1920, maxSizeMB: 1, quality: 0.8 }),
        ).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// exifStep
// ─────────────────────────────────────────────
describe('exifStep', () => {
    it('returns a step with name "exif"', () => {
        expect(exifStep().name).toBe('exif')
    })

    it('has a shouldProcess function', () => {
        expect(typeof exifStep().shouldProcess).toBe('function')
    })

    it('shouldProcess returns true for image/jpeg', () => {
        const step = exifStep()
        expect(step.shouldProcess!(makeFile('photo.jpg', 'image/jpeg'))).toBe(true)
    })

    it('shouldProcess returns true for image/tiff', () => {
        const step = exifStep()
        expect(step.shouldProcess!(makeFile('photo.tiff', 'image/tiff'))).toBe(true)
    })

    it('shouldProcess returns false for video/mp4', () => {
        const step = exifStep()
        expect(step.shouldProcess!(makeFile('video.mp4', 'video/mp4'))).toBe(false)
    })

    it('shouldProcess returns false for application/pdf', () => {
        const step = exifStep()
        expect(step.shouldProcess!(makeFile('doc.pdf', 'application/pdf'))).toBe(false)
    })

    it('process returns the file unchanged', async () => {
        const file = makeFile('photo.jpg', 'image/jpeg')
        const result = await exifStep().process(file, ctx)
        expect(result).toBe(file)
    })
})

// ─────────────────────────────────────────────
// heicStep
// ─────────────────────────────────────────────
describe('heicStep', () => {
    it('returns a step with name "heic"', () => {
        expect(heicStep().name).toBe('heic')
    })

    it('has a shouldProcess function', () => {
        expect(typeof heicStep().shouldProcess).toBe('function')
    })

    it('shouldProcess returns true for image/heic MIME type', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('photo.heic', 'image/heic'))).toBe(true)
    })

    it('shouldProcess returns true for image/heif MIME type', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('photo.heif', 'image/heif'))).toBe(true)
    })

    it('shouldProcess returns true for .heic extension with unknown MIME', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('photo.heic', 'application/octet-stream'))).toBe(true)
    })

    it('shouldProcess returns true for uppercase .HEIC extension', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('PHOTO.HEIC', 'application/octet-stream'))).toBe(true)
    })

    it('shouldProcess returns false for image/jpeg', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('photo.jpg', 'image/jpeg'))).toBe(false)
    })

    it('shouldProcess returns false for image/png', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('photo.png', 'image/png'))).toBe(false)
    })

    it('shouldProcess returns false for application/pdf', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('doc.pdf', 'application/pdf'))).toBe(false)
    })

    it('process returns the file unchanged', async () => {
        const file = makeFile('photo.heic', 'image/heic')
        const result = await heicStep().process(file, ctx)
        expect(result).toBe(file)
    })
})
