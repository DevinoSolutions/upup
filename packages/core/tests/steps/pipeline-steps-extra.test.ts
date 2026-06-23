import { describe, it, expect } from 'vitest'
import { compressStep } from '../../src/steps/compress'
import { exifStep } from '../../src/steps/exif'
import { heicStep } from '../../src/steps/heic'
import type { UploadFile, PipelineContext } from '@upup/core'

function makeFile(name: string, type: string): UploadFile {
    const f = new File(['x'], name, { type })
    return Object.assign(f, {
        id: name,
        url: null,
        relativePath: null,
        key: null,
        fileHash: null,
        checksumSHA256: null,
        etag: null,
        thumbnail: null,
    }) as unknown as UploadFile
}

const ctx: PipelineContext = {
    files: new Map(),
    options: {} as any,
    emit: () => {},
    t: ((k: string) => k) as any,
}

// ─────────────────────────────────────────────
// compressStep
// ─────────────────────────────────────────────
describe('compressStep', () => {
    it('has name "compress"', () => {
        expect(compressStep().name).toBe('compress')
    })

    it('shouldProcess returns true for image/png', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('photo.png', 'image/png'))).toBe(true)
    })

    it('shouldProcess returns true for image/jpeg', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('photo.jpg', 'image/jpeg'))).toBe(true)
    })

    it('shouldProcess returns false for application/pdf', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('doc.pdf', 'application/pdf'))).toBe(false)
    })

    it('shouldProcess returns false for text/plain', () => {
        const step = compressStep()
        expect(step.shouldProcess!(makeFile('notes.txt', 'text/plain'))).toBe(false)
    })

    it('process returns the same file reference', async () => {
        const step = compressStep()
        const file = makeFile('img.png', 'image/png')
        const result = await step.process(file, ctx)
        expect(result).toBe(file)
    })
})

// ─────────────────────────────────────────────
// exifStep
// ─────────────────────────────────────────────
describe('exifStep', () => {
    it('has name "exif"', () => {
        expect(exifStep().name).toBe('exif')
    })

    it('shouldProcess returns true for image/jpeg', () => {
        const step = exifStep()
        expect(step.shouldProcess!(makeFile('photo.jpg', 'image/jpeg'))).toBe(true)
    })

    it('shouldProcess returns false for video/mp4', () => {
        const step = exifStep()
        expect(step.shouldProcess!(makeFile('clip.mp4', 'video/mp4'))).toBe(false)
    })

    it('process returns the same file reference', async () => {
        const step = exifStep()
        const file = makeFile('img.jpg', 'image/jpeg')
        const result = await step.process(file, ctx)
        expect(result).toBe(file)
    })
})

// ─────────────────────────────────────────────
// heicStep
// ─────────────────────────────────────────────
describe('heicStep', () => {
    it('has name "heic"', () => {
        expect(heicStep().name).toBe('heic')
    })

    it('shouldProcess returns true for image/heic type', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('photo.heic', 'image/heic'))).toBe(true)
    })

    it('shouldProcess returns true for image/heif type', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('photo.heif', 'image/heif'))).toBe(true)
    })

    it('shouldProcess returns true for .heic extension regardless of type', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('IMG_1234.HEIC', 'application/octet-stream'))).toBe(true)
    })

    it('shouldProcess returns false for image/jpeg', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('photo.jpg', 'image/jpeg'))).toBe(false)
    })

    it('shouldProcess returns false for non-heic without extension', () => {
        const step = heicStep()
        expect(step.shouldProcess!(makeFile('file.png', 'image/png'))).toBe(false)
    })

    it('process returns the same file reference', async () => {
        const step = heicStep()
        const file = makeFile('photo.heic', 'image/heic')
        expect(await step.process(file, ctx)).toBe(file)
    })
})
