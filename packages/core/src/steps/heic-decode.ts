import { createCanvas, canvasToBlob } from './image-utils'
import type { Libheif } from 'libheif-js/libheif-wasm/libheif-bundle.mjs'
import { UpupError, UpupErrorCode } from '../errors'

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

// Memoized per realm (one instance per worker, one on the main thread). Reusing the
// module across decodes is safe: the heic2any wall came from never freeing handles,
// not from the module itself. We free every handle below.
let libheifPromise: Promise<Libheif> | null = null

function loadLibheif(): Promise<Libheif> {
    if (!libheifPromise) {
        libheifPromise = (async () => {
            let mod: unknown
            try {
                mod = await import('libheif-js/libheif-wasm/libheif-bundle.mjs')
            } catch {
                libheifPromise = null // not installed — allow a retry after the user installs it
                throw new UpupError(
                    'HEIC support requires the optional dependency "libheif-js". Install it: npm i libheif-js',
                    UpupErrorCode.HEIC_CONVERSION_FAILED,
                )
            }
            const factory =
                (mod as { default?: () => Promise<Libheif> }).default ??
                (mod as unknown as () => Promise<Libheif>)
            return factory()
        })()
    }
    return libheifPromise
}

function canvasBackendAvailable(): boolean {
    return (
        typeof OffscreenCanvas !== 'undefined' ||
        (typeof document !== 'undefined' &&
            typeof document.createElement === 'function')
    )
}

export interface HeicDecodeOptions {
    quality?: number
}

/**
 * Decode a HEIC/HEIF blob to a JPEG blob using libheif, freeing all WASM handles
 * after every call. Returns null when no canvas backend exists (e.g. SSR/node) —
 * that is an environment signal, not a failure. Throws on a genuine decode error.
 */
export async function heicToJpegBlob(
    input: Blob,
    options: HeicDecodeOptions = {},
): Promise<Blob | null> {
    // No canvas backend (e.g. SSR/node) → no-op without loading the WASM or decoding.
    if (!canvasBackendAvailable()) return null
    const quality = typeof options.quality === 'number' ? options.quality : 0.92
    const libheif = await loadLibheif()
    const buffer = await input.arrayBuffer()

    const decoder = new libheif.HeifDecoder()
    let images: ReturnType<typeof decoder.decode> = []
    try {
        images = decoder.decode(new Uint8Array(buffer))
        const image = images?.[0]
        if (!image) throw new Error('HEIC: no image found in file')

        const width = image.get_width()
        const height = image.get_height()

        const canvas = createCanvas(width, height)
        const ctx = canvas?.getContext('2d') as Ctx2D | null
        if (!canvas || !ctx) return null // no rendering backend in this environment

        const imageData = ctx.createImageData(width, height)
        await new Promise<void>((resolve, reject) => {
            // libheif fills `imageData.data` in place, then calls back with it (truthy) or a falsy value on error.
            image.display(imageData, result =>
                result ? resolve() : reject(new Error('HEIC: display failed')),
            )
        })
        ctx.putImageData(imageData, 0, 0)

        return await canvasToBlob(canvas, 'image/jpeg', quality)
    } finally {
        for (const img of images) {
            try {
                img.free?.()
            } catch {
                /* already freed */
            }
        }
        try {
            libheif.heif_context_free?.(decoder.decoder)
        } catch {
            /* already freed */
        }
        decoder.decoder = null
    }
}
