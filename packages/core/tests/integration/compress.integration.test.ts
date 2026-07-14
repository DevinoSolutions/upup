import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { loadImage } from '@napi-rs/canvas'
import {
    installCanvasShim,
    removeCanvasShim,
} from '../helpers/node-canvas-shim'
import {
    asUploadFile,
    createJpegFixture,
    createPngFixture,
    createWebpFixture,
    createLargeJpegFixture,
} from '../helpers/fixtures'
import { encodeImageFile } from '../../src/steps/image-utils'
import { FileSource } from '../../src/types/file-source'
import { UploadStatus } from '../../src/types/upload-status'

async function decodedSize(
    file: Blob,
): Promise<{ width: number; height: number }> {
    const image = await loadImage(Buffer.from(await file.arrayBuffer()))
    return { width: image.width, height: image.height }
}

describe('encodeImageFile (real canvas encode/decode)', () => {
    beforeAll(() => {
        installCanvasShim()
    })
    afterAll(() => {
        removeCanvasShim()
    })

    it('re-encodes a real JPEG and returns a non-null UploadFile', async () => {
        const original = asUploadFile(createJpegFixture(64, 64))

        const result = await encodeImageFile(original, { quality: 0.8 })

        expect(result).not.toBeNull()
        expect(result!.type).toBe('image/jpeg')
        expect(result!.size).toBeGreaterThan(0)
        expect(result!).not.toBe(original)
        // dimensions unchanged when no maxWidthOrHeight is requested
        expect(result!.metadata.width).toBe(64)
        expect(result!.metadata.height).toBe(64)
        expect(await decodedSize(result!)).toEqual({ width: 64, height: 64 })
    })

    it('scales dimensions down when maxWidthOrHeight is set', async () => {
        const original = asUploadFile(createJpegFixture(200, 100))

        const result = await encodeImageFile(original, {
            maxWidthOrHeight: 100,
            quality: 0.8,
        })

        expect(result).not.toBeNull()
        // largest side 200 -> 100 (scale 0.5), so 100x50
        expect(result!.metadata.width).toBe(100)
        expect(result!.metadata.height).toBe(50)
        // verify the ACTUAL rendered pixels, not just the metadata
        expect(await decodedSize(result!)).toEqual({ width: 100, height: 50 })
    })

    it('produces fewer bytes at lower quality for a detailed image', async () => {
        const source = createLargeJpegFixture(400, 400)

        const high = await encodeImageFile(
            asUploadFile(createJpegFixture(400, 400)),
            {
                quality: 0.95,
            },
        )
        const low = await encodeImageFile(asUploadFile(source), {
            quality: 0.3,
        })

        expect(high).not.toBeNull()
        expect(low).not.toBeNull()
        expect(low!.size).toBeLessThan(high!.size)
    })

    it('converts PNG -> JPEG when an explicit type is requested', async () => {
        const original = asUploadFile(createPngFixture(48, 48))
        expect(original.type).toBe('image/png')

        const result = await encodeImageFile(original, {
            type: 'image/jpeg',
            quality: 0.8,
        })

        expect(result).not.toBeNull()
        expect(result!.type).toBe('image/jpeg')
        const bytes = new Uint8Array(await result!.arrayBuffer())
        expect(bytes[0]).toBe(0xff)
        expect(bytes[1]).toBe(0xd8)
    })

    it('decodes and re-encodes a real WebP fixture', async () => {
        const original = asUploadFile(createWebpFixture(64, 64))
        expect(original.type).toBe('image/webp')

        const result = await encodeImageFile(original, {
            type: 'image/jpeg',
            quality: 0.8,
        })

        expect(result).not.toBeNull()
        expect(result!.type).toBe('image/jpeg')
        expect(await decodedSize(result!)).toEqual({ width: 64, height: 64 })
    })

    it('preserves original identity + metadata in the clone', async () => {
        const original = asUploadFile(createJpegFixture(64, 64), {
            id: 'keep-me',
            source: FileSource.CAMERA,
            status: UploadStatus.READY,
            metadata: { originalContentHash: 'abc123' },
        })

        const result = await encodeImageFile(original, {
            quality: 0.8,
            metadata: { compressed: true },
        })

        expect(result).not.toBeNull()
        expect(result!.id).toBe('keep-me')
        expect(result!.source).toBe(FileSource.CAMERA)
        expect(result!.status).toBe(UploadStatus.READY)
        expect(result!.metadata).toMatchObject({
            originalContentHash: 'abc123',
            compressed: true,
            width: 64,
            height: 64,
        })
    })
})
