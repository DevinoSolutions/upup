/**
 * Animation detection for the image pipeline.
 *
 * `compress` and `exif` both re-encode through a canvas, and canvas has no
 * animated encoder — `drawImage` paints one frame and `toBlob`/`convertToBlob`
 * writes a still. Running either step over an animated GIF, WebP or APNG
 * therefore destroys the animation silently: the upload succeeds and the user
 * gets a frozen first frame. These sniffers let those steps opt the file out
 * instead.
 *
 * Detection is byte-level rather than `ImageDecoder`-based so it behaves the
 * same in every browser and is deterministic under test. Reading the whole
 * blob is cheaper than what the step does next either way — the worker path
 * already calls `file.arrayBuffer()`, and the main-thread path hands the file
 * to `createImageBitmap`, which decodes it to raw RGBA.
 */

function ascii(bytes: Uint8Array, start: number, length: number): string {
    let out = ''
    for (let i = start; i < start + length; i += 1) {
        const byte = bytes[i]
        if (byte === undefined) return out
        out += String.fromCharCode(byte)
    }
    return out
}

function byteAt(bytes: Uint8Array, index: number): number {
    return bytes[index] ?? 0
}

/**
 * Walk GIF data sub-blocks (a length byte, that many bytes, repeated until a
 * zero-length terminator) and return the offset just past the terminator.
 */
function skipSubBlocks(bytes: Uint8Array, start: number): number {
    let offset = start
    while (offset < bytes.length) {
        const size = byteAt(bytes, offset)
        offset += 1
        if (size === 0) return offset
        offset += size
    }
    return bytes.length
}

/**
 * A GIF is animated when it carries more than one Image Descriptor. The
 * NETSCAPE2.0 / ANIMEXTS1.0 looping Application Extension is an earlier, and
 * for looping GIFs universal, tell — it lets an animated file be recognised
 * from its header instead of a full walk.
 */
function isAnimatedGif(bytes: Uint8Array): boolean {
    // 'GIF' + version (6) + logical screen descriptor (7)
    if (bytes.length < 13) return false
    if (ascii(bytes, 0, 3) !== 'GIF') return false

    const screenPacked = byteAt(bytes, 10)
    let offset = 13
    // Global colour table: 3 bytes per entry, 2^(N+1) entries.
    if ((screenPacked & 0x80) !== 0) {
        offset += 3 * (1 << ((screenPacked & 0x07) + 1))
    }

    let frames = 0
    while (offset < bytes.length) {
        const block = byteAt(bytes, offset)

        // Trailer — the stream ended with a single frame.
        if (block === 0x3b) return false

        if (block === 0x21) {
            const label = byteAt(bytes, offset + 1)
            offset += 2
            if (label === 0xff) {
                // Application Extension: an 11-byte identifier sub-block.
                const identifier = ascii(
                    bytes,
                    offset + 1,
                    byteAt(bytes, offset),
                )
                if (
                    identifier === 'NETSCAPE2.0' ||
                    identifier === 'ANIMEXTS1.0'
                ) {
                    return true
                }
            }
            offset = skipSubBlocks(bytes, offset)
            continue
        }

        if (block === 0x2c) {
            frames += 1
            if (frames > 1) return true
            // Image descriptor is 10 bytes; its packed field is the last one.
            const imagePacked = byteAt(bytes, offset + 9)
            offset += 10
            if ((imagePacked & 0x80) !== 0) {
                offset += 3 * (1 << ((imagePacked & 0x07) + 1))
            }
            offset += 1 // LZW minimum code size
            offset = skipSubBlocks(bytes, offset)
            continue
        }

        // Unrecognised block — stop rather than guess past it.
        return false
    }

    return false
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/**
 * An APNG is a PNG carrying an `acTL` (animation control) chunk, which the
 * spec requires to appear before the first `IDAT`.
 */
function isAnimatedPng(bytes: Uint8Array): boolean {
    if (bytes.length < PNG_SIGNATURE.length) return false
    for (const [index, expected] of PNG_SIGNATURE.entries()) {
        if (byteAt(bytes, index) !== expected) return false
    }

    let offset = PNG_SIGNATURE.length
    while (offset + 8 <= bytes.length) {
        const length =
            byteAt(bytes, offset) * 0x1000000 +
            byteAt(bytes, offset + 1) * 0x10000 +
            byteAt(bytes, offset + 2) * 0x100 +
            byteAt(bytes, offset + 3)
        const type = ascii(bytes, offset + 4, 4)
        if (type === 'acTL') return true
        if (type === 'IDAT') return false
        offset += 12 + length // length + type + data + CRC
    }

    return false
}

/**
 * An animated WebP declares the ANIMATION flag in its `VP8X` chunk and carries
 * `ANIM`/`ANMF` chunks for the frames.
 */
function isAnimatedWebp(bytes: Uint8Array): boolean {
    if (bytes.length < 16) return false
    if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
        return false
    }

    let offset = 12
    while (offset + 8 <= bytes.length) {
        const fourCC = ascii(bytes, offset, 4)
        const size =
            byteAt(bytes, offset + 4) +
            byteAt(bytes, offset + 5) * 0x100 +
            byteAt(bytes, offset + 6) * 0x10000 +
            byteAt(bytes, offset + 7) * 0x1000000
        if (fourCC === 'ANIM' || fourCC === 'ANMF') return true
        if (fourCC === 'VP8X' && (byteAt(bytes, offset + 8) & 0x02) !== 0) {
            return true
        }
        offset += 8 + size + (size % 2) // chunk payloads are padded to even
    }

    return false
}

const SNIFFERS: Record<string, (bytes: Uint8Array) => boolean> = {
    'image/gif': isAnimatedGif,
    'image/png': isAnimatedPng,
    'image/apng': isAnimatedPng,
    'image/webp': isAnimatedWebp,
}

/** Strip any `; parameters` and casing so `IMAGE/GIF; charset=…` still matches. */
function baseMimeType(type: string): string {
    return type.split(';')[0]?.trim().toLowerCase() ?? ''
}

/**
 * True when the blob is an animated image in one of the three formats a canvas
 * re-encode would flatten. Anything else — including formats with no animated
 * variant — is false, so callers process it as before.
 */
export async function isAnimatedImage(file: Blob): Promise<boolean> {
    const sniff = SNIFFERS[baseMimeType(file.type)]
    if (!sniff) return false
    try {
        return sniff(new Uint8Array(await file.arrayBuffer()))
    } catch {
        // upup-catch: unreadable blob — let the step's own decode surface it
        return false
    }
}
