import {
    createCanvas as createNapiCanvas,
    loadImage,
    type Canvas as NapiCanvas,
    type SKRSContext2D,
} from '@napi-rs/canvas'

// Bridges the browser canvas surface the production image pipeline expects
// (`OffscreenCanvas`, `createImageBitmap`) onto @napi-rs/canvas — real Skia
// rendering in Node, no jsdom, no browser. The SUT (image-utils.ts,
// heic-decode.ts) is exercised verbatim; only these two globals are installed.

type ConvertToBlobOptions = { type?: string; quality?: number }

// @napi-rs jpeg/webp quality is an int 0-100; the pipeline speaks the browser's
// 0-1 float. Convert + clamp.
function toQualityInt(quality: number | undefined): number {
    const q =
        typeof quality === 'number' && !Number.isNaN(quality) ? quality : 0.92
    return Math.max(0, Math.min(100, Math.round(q * 100)))
}

function toBytes(buffer: Buffer): Uint8Array {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

class NodeOffscreenCanvas {
    private readonly _canvas: NapiCanvas

    constructor(width: number, height: number) {
        this._canvas = createNapiCanvas(
            Math.max(1, Math.floor(width)),
            Math.max(1, Math.floor(height)),
        )
    }

    get width(): number {
        return this._canvas.width
    }
    set width(value: number) {
        this._canvas.width = value
    }
    get height(): number {
        return this._canvas.height
    }
    set height(value: number) {
        this._canvas.height = value
    }

    getContext(type: '2d'): SKRSContext2D {
        return this._canvas.getContext(type)
    }

    // The pipeline calls this with a `type` key; @napi-rs's own convertToBlob
    // reads `mime`, so the mapping to a real encoded blob happens here.
    async convertToBlob(options: ConvertToBlobOptions = {}): Promise<Blob> {
        const type = options.type ?? 'image/png'
        let bytes: Buffer
        if (type === 'image/png') {
            bytes = this._canvas.toBuffer('image/png')
        } else if (type === 'image/webp') {
            bytes = this._canvas.toBuffer(
                'image/webp',
                toQualityInt(options.quality),
            )
        } else {
            bytes = this._canvas.toBuffer(
                'image/jpeg',
                toQualityInt(options.quality),
            )
        }
        return new Blob([toBytes(bytes)], { type })
    }
}

async function nodeCreateImageBitmap(
    source: Blob | ArrayBuffer | ArrayBufferView,
): Promise<ImageBitmap> {
    let bytes: Buffer
    if (typeof Blob !== 'undefined' && source instanceof Blob) {
        bytes = Buffer.from(await source.arrayBuffer())
    } else if (source instanceof ArrayBuffer) {
        bytes = Buffer.from(new Uint8Array(source))
    } else if (ArrayBuffer.isView(source)) {
        bytes = Buffer.from(source.buffer, source.byteOffset, source.byteLength)
    } else {
        throw new TypeError('nodeCreateImageBitmap: unsupported source type')
    }
    const image = await loadImage(bytes)
    // decodeImage() invokes bitmap.close() in its cleanup path; the real napi
    // Image has no close(), so attach a no-op. drawImage() still receives the
    // genuine napi Image, so rendering is real.
    ;(image as unknown as { close: () => void }).close = () => {}
    return image as unknown as ImageBitmap
}

type MutableGlobal = {
    OffscreenCanvas?: unknown
    createImageBitmap?: unknown
}

let installed = false
let hadOffscreenCanvas = false
let hadCreateImageBitmap = false
let prevOffscreenCanvas: unknown
let prevCreateImageBitmap: unknown

export function installCanvasShim(): void {
    if (installed) return
    const g = globalThis as unknown as MutableGlobal
    hadOffscreenCanvas = 'OffscreenCanvas' in g
    hadCreateImageBitmap = 'createImageBitmap' in g
    prevOffscreenCanvas = g.OffscreenCanvas
    prevCreateImageBitmap = g.createImageBitmap
    g.OffscreenCanvas = NodeOffscreenCanvas
    g.createImageBitmap = nodeCreateImageBitmap
    installed = true
}

export function removeCanvasShim(): void {
    if (!installed) return
    const g = globalThis as unknown as MutableGlobal
    if (hadOffscreenCanvas) g.OffscreenCanvas = prevOffscreenCanvas
    else delete g.OffscreenCanvas
    if (hadCreateImageBitmap) g.createImageBitmap = prevCreateImageBitmap
    else delete g.createImageBitmap
    installed = false
}

export { NodeOffscreenCanvas }
