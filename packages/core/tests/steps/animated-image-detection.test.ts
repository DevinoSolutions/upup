import { describe, it, expect } from 'vitest'
import { isAnimatedImage } from '../../src/steps/animated-image'
import {
    concatBytes,
    gifHeader,
    gifFrame,
    gifComment,
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

/**
 * A blob stand-in whose `type` and read behaviour are fully controlled. Slices
 * inherit the read, so a rejecting stand-in rejects however it is read.
 */
function fakeBlob(
    type: string,
    read: () => Promise<ArrayBuffer>,
    size = 0,
): Blob {
    return {
        type,
        size,
        arrayBuffer: read,
        slice: (start = 0, end = size) =>
            fakeBlob(
                type,
                async () => (await read()).slice(start, end),
                Math.max(0, Math.min(end, size) - start),
            ),
    } as unknown as Blob
}

/**
 * A blob that records the size of every read made against it — the sniff's
 * verdict says what it decided, `reads` says how much of the file it had to
 * pull in to decide it.
 */
function countingBlob(
    type: string,
    bytes: Uint8Array,
): { file: Blob; reads: number[] } {
    const reads: number[] = []
    const make = (start: number, end: number): Blob =>
        ({
            type,
            size: end - start,
            slice: (from = 0, to = end - start) =>
                make(start + from, Math.min(start + to, end)),
            arrayBuffer: () => {
                reads.push(end - start)
                return Promise.resolve(
                    bytes.slice(start, end).buffer as ArrayBuffer,
                )
            },
        }) as unknown as Blob
    return { file: make(0, bytes.length), reads }
}

/** What `isAnimatedImage` sniffs before deciding whether to read on. */
const SNIFF_PREFIX_BYTES = 64 * 1024

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
        const file = fakeBlob(
            'IMAGE/GIF; charset=binary',
            () => Promise.resolve(bytes.buffer as ArrayBuffer),
            bytes.length,
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

// ─────────────────────────────────────────────
// How much of the file the sniff reads
//
// compress and exif call this before touching the file, so a still photo now
// pays for the sniff. Every format but GIF declares animation in its header,
// and so does a looping GIF — only the multi-descriptor walk needs the rest.
// ─────────────────────────────────────────────
describe('isAnimatedImage — bytes read', () => {
    it('decides a large still PNG from the prefix alone', async () => {
        const bytes = concatBytes(
            PNG_SIGNATURE,
            pngChunk('IHDR', 13),
            pngChunk('IDAT', 200_000),
            pngChunk('IEND'),
        )
        const { file, reads } = countingBlob('image/png', bytes)
        await expect(isAnimatedImage(file)).resolves.toBe(false)
        expect(reads).toEqual([SNIFF_PREFIX_BYTES])
    })

    it('decides a large animated WebP from the prefix alone', async () => {
        const bytes = concatBytes(
            animatedWebpBytes(),
            riffChunk(
                'VP8 ',
                Array.from({ length: 80_000 }, () => 0),
            ),
        )
        const { file, reads } = countingBlob('image/webp', bytes)
        await expect(isAnimatedImage(file)).resolves.toBe(true)
        expect(reads).toEqual([SNIFF_PREFIX_BYTES])
    })

    it('short-circuits a large looping GIF from its header', async () => {
        const bytes = concatBytes(
            gifHeader(),
            GIF_NETSCAPE_LOOP,
            gifFrame(0),
            gifComment(80 * 1024),
            gifFrame(1),
            GIF_TRAILER,
        )
        const { file, reads } = countingBlob('image/gif', bytes)
        await expect(isAnimatedImage(file)).resolves.toBe(true)
        expect(reads).toEqual([SNIFF_PREFIX_BYTES])
    })

    it('reads the whole GIF when its second frame sits past the prefix', async () => {
        // No looping extension: the second Image Descriptor is the only tell,
        // and it can sit anywhere in the stream.
        const bytes = concatBytes(
            gifHeader(),
            gifFrame(0),
            gifComment(80 * 1024),
            gifFrame(1),
            GIF_TRAILER,
        )
        const { file, reads } = countingBlob('image/gif', bytes)
        await expect(isAnimatedImage(file)).resolves.toBe(true)
        expect(reads).toEqual([SNIFF_PREFIX_BYTES, bytes.length])
    })

    it('does not read a GIF that fits inside the prefix twice', async () => {
        const bytes = stillGifBytes()
        const { file, reads } = countingBlob('image/gif', bytes)
        await expect(isAnimatedImage(file)).resolves.toBe(false)
        expect(reads).toEqual([bytes.length])
    })
})
