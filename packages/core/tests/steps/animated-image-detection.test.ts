import { describe, it, expect } from 'vitest'
import { isAnimatedImage } from '../../src/steps/animated-image'
import {
    concatBytes,
    gifHeader,
    gifFrame,
    riffChunk,
    pngChunk,
    vp8xChunk,
    webpContainer,
    stillGifBytes,
    animatedGifBytes,
    stillPngBytes,
    apngBytes,
    stillWebpBytes,
    animatedWebpBytes,
    GIF_GRAPHIC_CONTROL,
    GIF_NETSCAPE_LOOP,
    GIF_TRAILER,
    PNG_SIGNATURE,
    VP8X_ALPHA_FLAG,
    type BytePart,
} from '../helpers/animated-image-fixtures'

function image(type: string, ...parts: BytePart[]): Blob {
    return new Blob([concatBytes(...parts)], { type })
}

/** A blob stand-in whose `type` and read behaviour are fully controlled. */
function fakeBlob(type: string, read: () => Promise<ArrayBuffer>): Blob {
    return { type, arrayBuffer: read } as unknown as Blob
}

describe('isAnimatedImage — GIF', () => {
    it('reports a single-frame GIF as still', async () => {
        await expect(
            isAnimatedImage(image('image/gif', stillGifBytes())),
        ).resolves.toBe(false)
    })

    it('reports a single-frame GIF with no global colour table as still', async () => {
        const file = image(
            'image/gif',
            gifHeader({ globalColourTable: false }),
            gifFrame(0),
            GIF_TRAILER,
        )
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })

    it('reports a single frame behind a graphic control extension as still', async () => {
        const file = image(
            'image/gif',
            gifHeader(),
            GIF_GRAPHIC_CONTROL,
            gifFrame(0),
            GIF_TRAILER,
        )
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })

    it('reports a GIF carrying the NETSCAPE looping extension as animated', async () => {
        await expect(
            isAnimatedImage(image('image/gif', animatedGifBytes())),
        ).resolves.toBe(true)
    })

    it('reports two image descriptors with no loop extension as animated', async () => {
        const file = image(
            'image/gif',
            gifHeader(),
            gifFrame(0),
            gifFrame(1),
            GIF_TRAILER,
        )
        await expect(isAnimatedImage(file)).resolves.toBe(true)
    })

    it('steps over the global colour table to reach the second frame', async () => {
        // gifHeader() emits a two-entry table; finding frame two proves the
        // walk used the packed field's size rather than a fixed offset.
        const file = image(
            'image/gif',
            gifHeader(),
            GIF_GRAPHIC_CONTROL,
            gifFrame(0),
            GIF_GRAPHIC_CONTROL,
            gifFrame(1),
            GIF_TRAILER,
        )
        await expect(isAnimatedImage(file)).resolves.toBe(true)
    })

    it('reports a truncated GIF as still instead of looping on it', async () => {
        const file = image('image/gif', gifHeader(), [0x2c, 0x00, 0x00])
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })

    it('reports bytes that are not a GIF at all as still', async () => {
        const file = image('image/gif', 'this is not a GIF, it is prose')
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })
})

describe('isAnimatedImage — PNG', () => {
    it('reports a still PNG as still', async () => {
        await expect(
            isAnimatedImage(image('image/png', stillPngBytes())),
        ).resolves.toBe(false)
    })

    it('reports a PNG carrying an acTL chunk as animated', async () => {
        await expect(
            isAnimatedImage(image('image/png', apngBytes())),
        ).resolves.toBe(true)
    })

    it('reports an APNG served as image/apng as animated', async () => {
        await expect(
            isAnimatedImage(image('image/apng', apngBytes())),
        ).resolves.toBe(true)
    })

    it('ignores an acTL chunk that follows the first IDAT', async () => {
        // The APNG spec requires acTL before IDAT; a later one does not
        // animate, so re-encoding such a file loses nothing.
        const file = image(
            'image/png',
            PNG_SIGNATURE,
            pngChunk('IHDR', 13),
            pngChunk('IDAT', 4),
            pngChunk('acTL', 8),
        )
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })
})

describe('isAnimatedImage — WebP', () => {
    it('reports a simple lossy WebP as still', async () => {
        await expect(
            isAnimatedImage(image('image/webp', stillWebpBytes())),
        ).resolves.toBe(false)
    })

    it('reports an extended WebP without the animation flag as still', async () => {
        const file = image(
            'image/webp',
            webpContainer(vp8xChunk(VP8X_ALPHA_FLAG)),
        )
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })

    it('reports the VP8X animation flag as animated', async () => {
        await expect(
            isAnimatedImage(image('image/webp', animatedWebpBytes())),
        ).resolves.toBe(true)
    })

    it('reports a bare ANIM chunk as animated', async () => {
        const file = image(
            'image/webp',
            webpContainer(
                riffChunk('ANIM', [0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            ),
        )
        await expect(isAnimatedImage(file)).resolves.toBe(true)
    })
})

describe('isAnimatedImage — everything else', () => {
    it('reports a JPEG as still without reading its bytes', async () => {
        const file = fakeBlob('image/jpeg', () =>
            Promise.reject(new Error('a JPEG must not be read')),
        )
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })

    it('reports a video as still', async () => {
        const file = image('video/mp4', [0x00, 0x00, 0x00, 0x18])
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })

    it('reports a blob with no type as still', async () => {
        const file = image('', stillGifBytes())
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })

    it('handles an uppercase MIME type carrying parameters', async () => {
        const bytes = concatBytes(
            gifHeader(),
            GIF_NETSCAPE_LOOP,
            gifFrame(0),
            GIF_TRAILER,
        )
        const file = fakeBlob('IMAGE/GIF; charset=binary', () =>
            Promise.resolve(bytes.buffer as ArrayBuffer),
        )
        await expect(isAnimatedImage(file)).resolves.toBe(true)
    })

    it('reports an unreadable blob as still rather than throwing', async () => {
        const file = fakeBlob('image/gif', () =>
            Promise.reject(new Error('stream errored')),
        )
        await expect(isAnimatedImage(file)).resolves.toBe(false)
    })
})
