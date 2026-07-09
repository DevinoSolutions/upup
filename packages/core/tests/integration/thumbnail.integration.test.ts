import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { loadImage } from '@napi-rs/canvas'
import {
    installCanvasShim,
    removeCanvasShim,
} from '../helpers/node-canvas-shim'
import { asUploadFile, createJpegFixture } from '../helpers/fixtures'
import { createThumbnail } from '../../src/steps/image-utils'

describe('createThumbnail (real canvas scaling)', () => {
    beforeAll(() => {
        installCanvasShim()
    })
    afterAll(() => {
        removeCanvasShim()
    })

    it('scales down to the requested bounds preserving aspect ratio', async () => {
        const original = asUploadFile(createJpegFixture(200, 100))

        const thumb = await createThumbnail(original, { width: 50 })

        expect(thumb).not.toBeNull()
        // scale = min(1, 50/200, 50/100) = 0.25 -> 50x25
        expect(thumb!.width).toBe(50)
        expect(thumb!.height).toBe(25)
        // the rendered thumbnail really is 50x25 pixels
        const decoded = await loadImage(
            Buffer.from(await thumb!.file.arrayBuffer()),
        )
        expect(decoded.width).toBe(50)
        expect(decoded.height).toBe(25)
    })

    it('names the file *.thumbnail.jpg and emits a JPEG File', async () => {
        const original = asUploadFile(createJpegFixture(120, 120))

        const thumb = await createThumbnail(original, { width: 40 })

        expect(thumb!.file).toBeInstanceOf(File)
        expect(thumb!.file.name).toBe('fixture.jpg.thumbnail.jpg')
        expect(thumb!.file.type).toBe('image/jpeg')
    })

    it('returns a valid data:image/jpeg;base64 URL', async () => {
        const original = asUploadFile(createJpegFixture(120, 120))

        const thumb = await createThumbnail(original, { width: 40 })

        expect(thumb!.dataUrl).toMatch(/^data:image\/jpeg;base64,/)
        // the base64 payload decodes back to a real 40x40 JPEG
        const b64 = thumb!.dataUrl.split(',', 2)[1] ?? ''
        const decoded = await loadImage(Buffer.from(b64, 'base64'))
        expect(decoded.width).toBe(40)
        expect(decoded.height).toBe(40)
    })

    it('produces a thumbnail smaller than the original image', async () => {
        const original = asUploadFile(createJpegFixture(400, 400))

        const thumb = await createThumbnail(original, { width: 64 })

        expect(thumb!.file.size).toBeGreaterThan(0)
        expect(thumb!.file.size).toBeLessThan(original.size)
    })

    it('never upscales — a small source stays at its own size', async () => {
        const original = asUploadFile(createJpegFixture(32, 32))

        const thumb = await createThumbnail(original, { width: 320 })

        // scale is clamped at 1, so 32x32 stays 32x32
        expect(thumb!.width).toBe(32)
        expect(thumb!.height).toBe(32)
    })
})
