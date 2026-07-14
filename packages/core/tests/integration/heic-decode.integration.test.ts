import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { loadImage } from '@napi-rs/canvas'
import {
    installCanvasShim,
    removeCanvasShim,
} from '../helpers/node-canvas-shim'
import { buildHeicFile } from '../helpers/fixtures'
import { heicToJpegBlob } from '../../src/steps/heic-decode'

// libheif-js is an optionalDependency; skip cleanly if the WASM bundle is absent.
let libheifAvailable: boolean
try {
    await import('libheif-js/libheif-wasm/libheif-bundle.mjs')
    libheifAvailable = true
} catch {
    // upup-catch: libheif-js is an optionalDependency — absence is this
    // suite's expected skipIf condition, not an error to report
    libheifAvailable = false
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
    return new Uint8Array(await blob.arrayBuffer())
}

describe.skipIf(!libheifAvailable)(
    'heicToJpegBlob (real libheif + canvas)',
    () => {
        beforeAll(() => {
            installCanvasShim()
        })
        afterAll(() => {
            removeCanvasShim()
        })

        it('decodes a real HEIC file to a non-empty JPEG blob', async () => {
            const blob = await heicToJpegBlob(buildHeicFile(), { quality: 0.9 })

            expect(blob).not.toBeNull()
            expect(blob).toBeInstanceOf(Blob)
            expect(blob!.type).toBe('image/jpeg')
            expect(blob!.size).toBeGreaterThan(0)
        })

        it('emits real JPEG bytes (SOI magic 0xFF 0xD8)', async () => {
            const blob = await heicToJpegBlob(buildHeicFile(), { quality: 0.9 })
            const bytes = await blobBytes(blob!)

            expect(bytes[0]).toBe(0xff)
            expect(bytes[1]).toBe(0xd8)
            // ...and the EOI marker at the tail.
            expect(bytes[bytes.length - 2]).toBe(0xff)
            expect(bytes[bytes.length - 1]).toBe(0xd9)
        })

        it('preserves the source HEIC pixel dimensions (64x64) in the JPEG', async () => {
            const blob = await heicToJpegBlob(buildHeicFile(), {
                quality: 0.92,
            })
            const decoded = await loadImage(
                Buffer.from(await blob!.arrayBuffer()),
            )

            expect(decoded.width).toBe(64)
            expect(decoded.height).toBe(64)
        })

        it('can be called repeatedly without leaking WASM handles (module is memoized)', async () => {
            const first = await heicToJpegBlob(buildHeicFile(), {
                quality: 0.9,
            })
            const second = await heicToJpegBlob(buildHeicFile(), {
                quality: 0.9,
            })
            const third = await heicToJpegBlob(buildHeicFile(), {
                quality: 0.9,
            })

            for (const blob of [first, second, third]) {
                expect(blob!.type).toBe('image/jpeg')
                expect(blob!.size).toBeGreaterThan(0)
            }
        })

        it('returns null (not an error) when no canvas backend is present', async () => {
            removeCanvasShim()
            try {
                const blob = await heicToJpegBlob(buildHeicFile(), {
                    quality: 0.9,
                })
                expect(blob).toBeNull()
            } finally {
                installCanvasShim()
            }
        })
    },
)
