// Hand-assembled image containers for the animation guard. These are real,
// spec-shaped bytes — a decoder can open them — but deliberately tiny (1x1,
// two-colour) so the interesting structure is the only thing in the file.
//
// Kept free of @napi-rs/canvas so the unit test tree can use them too;
// helpers/fixtures.ts is the Skia-rendered counterpart for real photos.

export type BytePart = number[] | string | Uint8Array

// Return annotations are deliberately inferred: an explicit `: Uint8Array`
// means `Uint8Array<ArrayBufferLike>` on TypeScript >= 5.7, which is not
// assignable to `BlobPart` (same float #368 fixed in the sibling helpers).
export function concatBytes(...parts: BytePart[]) {
    const out: number[] = []
    for (const part of parts) {
        if (typeof part === 'string') {
            for (const char of part) out.push(char.charCodeAt(0))
        } else {
            for (const byte of part) out.push(byte)
        }
    }
    return new Uint8Array(out)
}

// ── GIF ─────────────────────────────────────────────────────────
// 'GIF89a' + logical screen descriptor. `globalColourTable` sets the packed
// field's GCT flag and appends a two-entry (red/blue) table.
export function gifHeader({
    globalColourTable = true,
}: { globalColourTable?: boolean } = {}) {
    if (!globalColourTable) {
        return concatBytes('GIF89a', [0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00])
    }
    return concatBytes(
        'GIF89a',
        // width 1, height 1, packed 0x80 (GCT present, 2^(0+1) entries), bg, aspect
        [0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00],
        [0xff, 0x00, 0x00, 0x00, 0x00, 0xff],
    )
}

/**
 * One 1x1 image descriptor plus its LZW payload. The three data bytes are a
 * real minimal LZW stream: clear code, one pixel, end-of-information.
 */
export function gifFrame(colourIndex: 0 | 1 = 0): number[] {
    return [
        0x2c, // image descriptor
        0x00,
        0x00,
        0x00,
        0x00, // left, top
        0x01,
        0x00,
        0x01,
        0x00, // width, height
        0x00, // packed: no local colour table
        0x02, // LZW minimum code size
        0x02, // one 2-byte data sub-block
        colourIndex === 0 ? 0x44 : 0x4c,
        0x01,
        0x00, // sub-block terminator
    ]
}

/** The Application Extension every looping animated GIF carries. */
export const GIF_NETSCAPE_LOOP = concatBytes(
    [0x21, 0xff, 0x0b],
    'NETSCAPE2.0',
    [0x03, 0x01, 0x00, 0x00, 0x00],
)

/** Graphic Control Extension — legal on a single-frame GIF too. */
export const GIF_GRAPHIC_CONTROL = [
    0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00,
]

export const GIF_TRAILER = [0x3b]

export function stillGifBytes() {
    return concatBytes(gifHeader(), gifFrame(0), GIF_TRAILER)
}

export function animatedGifBytes() {
    return concatBytes(
        gifHeader(),
        GIF_NETSCAPE_LOOP,
        GIF_GRAPHIC_CONTROL,
        gifFrame(0),
        GIF_GRAPHIC_CONTROL,
        gifFrame(1),
        GIF_TRAILER,
    )
}

// ── PNG / APNG ──────────────────────────────────────────────────
export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** A length-prefixed, CRC-suffixed PNG chunk with zero-filled data. */
export function pngChunk(type: string, dataLength = 0) {
    return concatBytes(
        [
            (dataLength >>> 24) & 0xff,
            (dataLength >>> 16) & 0xff,
            (dataLength >>> 8) & 0xff,
            dataLength & 0xff,
        ],
        type,
        new Uint8Array(dataLength),
        [0x00, 0x00, 0x00, 0x00],
    )
}

export function stillPngBytes() {
    return concatBytes(
        PNG_SIGNATURE,
        pngChunk('IHDR', 13),
        pngChunk('IDAT', 4),
        pngChunk('IEND'),
    )
}

export function apngBytes() {
    return concatBytes(
        PNG_SIGNATURE,
        pngChunk('IHDR', 13),
        pngChunk('acTL', 8),
        pngChunk('IDAT', 4),
        pngChunk('IEND'),
    )
}

// ── WebP ────────────────────────────────────────────────────────
/** A RIFF chunk: FourCC, little-endian size, payload padded to an even length. */
export function riffChunk(fourCC: string, data: number[]) {
    const size = data.length
    return concatBytes(
        fourCC,
        [
            size & 0xff,
            (size >>> 8) & 0xff,
            (size >>> 16) & 0xff,
            (size >>> 24) & 0xff,
        ],
        data,
        size % 2 === 1 ? [0x00] : [],
    )
}

export function webpContainer(...chunks: BytePart[]) {
    return concatBytes('RIFF', [0x00, 0x00, 0x00, 0x00], 'WEBP', ...chunks)
}

/** VP8X payload: flags byte then a 9-byte canvas description. */
export function vp8xChunk(flags: number) {
    return riffChunk('VP8X', [
        flags,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
    ])
}

const VP8X_ANIMATION_FLAG = 0x02
export const VP8X_ALPHA_FLAG = 0x10

export function stillWebpBytes() {
    return webpContainer(riffChunk('VP8 ', [0x00, 0x00, 0x00, 0x00]))
}

export function animatedWebpBytes() {
    return webpContainer(
        vp8xChunk(VP8X_ANIMATION_FLAG),
        riffChunk('ANIM', [0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    )
}
