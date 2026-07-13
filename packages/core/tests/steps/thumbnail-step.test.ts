import { describe, it, expect } from 'vitest'
import { thumbnailStep } from '../../src/steps/thumbnail'
import type { UploadFile, PipelineContext } from '@upupjs/core'

function makeFile(name: string, type: string): UploadFile {
    return {
        id: 'f1',
        name,
        type,
        size: 512,
        status: 'idle',
    } as unknown as UploadFile
}

const ctx: PipelineContext = {
    files: new Map(),
    options: {},
    emit: () => {},
    t: (k: string) => k,
}

// ─────────────────────────────────────────────
// thumbnailStep
// ─────────────────────────────────────────────
describe('thumbnailStep', () => {
    it('returns a step with name "thumbnail"', () => {
        expect(thumbnailStep().name).toBe('thumbnail')
    })

    it('has a shouldProcess function', () => {
        expect(typeof thumbnailStep().shouldProcess).toBe('function')
    })

    it('has a process function', () => {
        expect(typeof thumbnailStep().process).toBe('function')
    })

    // shouldProcess — image types
    it('shouldProcess returns true for image/jpeg', () => {
        expect(
            thumbnailStep().shouldProcess!(makeFile('a.jpg', 'image/jpeg')),
        ).toBe(true)
    })

    it('shouldProcess returns true for image/png', () => {
        expect(
            thumbnailStep().shouldProcess!(makeFile('a.png', 'image/png')),
        ).toBe(true)
    })

    it('shouldProcess returns true for image/webp', () => {
        expect(
            thumbnailStep().shouldProcess!(makeFile('a.webp', 'image/webp')),
        ).toBe(true)
    })

    it('shouldProcess returns true for image/gif', () => {
        expect(
            thumbnailStep().shouldProcess!(makeFile('a.gif', 'image/gif')),
        ).toBe(true)
    })

    // shouldProcess — video types
    it('shouldProcess returns false for video/mp4', () => {
        expect(
            thumbnailStep().shouldProcess!(makeFile('v.mp4', 'video/mp4')),
        ).toBe(false)
    })

    it('shouldProcess returns false for video/webm', () => {
        expect(
            thumbnailStep().shouldProcess!(makeFile('v.webm', 'video/webm')),
        ).toBe(false)
    })

    it('shouldProcess returns false for video/quicktime', () => {
        expect(
            thumbnailStep().shouldProcess!(
                makeFile('v.mov', 'video/quicktime'),
            ),
        ).toBe(false)
    })

    // shouldProcess — rejected types
    it('shouldProcess returns false for application/pdf', () => {
        expect(
            thumbnailStep().shouldProcess!(
                makeFile('doc.pdf', 'application/pdf'),
            ),
        ).toBe(false)
    })

    it('shouldProcess returns false for text/plain', () => {
        expect(
            thumbnailStep().shouldProcess!(
                makeFile('readme.txt', 'text/plain'),
            ),
        ).toBe(false)
    })

    it('shouldProcess returns false for audio/mp3', () => {
        expect(
            thumbnailStep().shouldProcess!(makeFile('track.mp3', 'audio/mp3')),
        ).toBe(false)
    })

    it('shouldProcess returns false for application/zip', () => {
        expect(
            thumbnailStep().shouldProcess!(
                makeFile('archive.zip', 'application/zip'),
            ),
        ).toBe(false)
    })

    // process — pass-through
    it('process returns the same file reference for an image', async () => {
        const file = makeFile('photo.jpg', 'image/jpeg')
        expect(await thumbnailStep().process(file, ctx)).toBe(file)
    })

    it('process returns the same file reference for a video', async () => {
        const file = makeFile('clip.mp4', 'video/mp4')
        expect(await thumbnailStep().process(file, ctx)).toBe(file)
    })

    it('process returns the same file reference for a pdf', async () => {
        const file = makeFile('doc.pdf', 'application/pdf')
        expect(await thumbnailStep().process(file, ctx)).toBe(file)
    })

    // options
    it('accepts optional thumbnail options without throwing', () => {
        expect(() =>
            thumbnailStep({ width: 200, height: 200, quality: 0.9 }),
        ).not.toThrow()
    })

    it('accepts partial options without throwing', () => {
        expect(() => thumbnailStep({ width: 300 })).not.toThrow()
    })

    it('accepts no options without throwing', () => {
        expect(() => thumbnailStep()).not.toThrow()
    })

    // factory produces independent step instances
    it('each call produces a distinct step instance', () => {
        const a = thumbnailStep()
        const b = thumbnailStep()
        expect(a).not.toBe(b)
    })
})
