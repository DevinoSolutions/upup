import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleTask } from '../../src/worker/handle-task'

const refHash = async (buf: ArrayBuffer) => {
    const d = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(d))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

describe('handleTask', () => {
    beforeEach(() => vi.resetModules())

    it('hashes data with SHA-256 (real, runs in node)', async () => {
        const data = new TextEncoder().encode('hello world').buffer
        const res = await handleTask({ id: 7, type: 'hash', data })
        expect(res.id).toBe(7)
        expect(res.ok).toBe(true)
        if (res.ok && res.result.kind === 'hash') {
            expect(res.result.checksum).toBe(await refHash(data))
            expect(res.result.checksum.length).toBe(64)
        } else throw new Error('expected hash result')
    })

    it('returns ok:false for image tasks when no canvas is available (node)', async () => {
        const data = new Uint8Array([0xff, 0xd8, 0xff]).buffer
        for (const type of ['exif', 'compress', 'thumbnail'] as const) {
            const res = await handleTask({
                id: 1,
                type,
                data,
                params: { mime: 'image/jpeg', name: 'a.jpg' },
            })
            expect(res.ok).toBe(false)
        }
    })

    it('converts heic via libheif (mocked) into an image result', async () => {
        vi.doMock('libheif-js/libheif-wasm/libheif-bundle.mjs', () => ({
            default: () =>
                Promise.resolve({
                    HeifDecoder: class {
                        decoder = { ptr: 1 }
                        decode() {
                            return [
                                {
                                    get_width: () => 2,
                                    get_height: () => 2,
                                    display: (
                                        t: { data: Uint8ClampedArray },
                                        cb: (r: unknown) => void,
                                    ) => cb(t),
                                    free: vi.fn(),
                                },
                            ]
                        }
                    },
                    heif_context_free: vi.fn(),
                }),
        }))
        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                width = 0
                height = 0
                constructor(w: number, h: number) {
                    this.width = w
                    this.height = h
                }
                getContext() {
                    return {
                        createImageData: (w: number, h: number) => ({
                            data: new Uint8ClampedArray(w * h * 4),
                            width: w,
                            height: h,
                        }),
                        putImageData: vi.fn(),
                    }
                }
                async convertToBlob(opts: { type?: string }) {
                    return new Blob([new Uint8Array([1, 2, 3, 4])], {
                        type: opts.type || 'image/jpeg',
                    })
                }
            },
        )
        const { handleTask: ht } = await import('../../src/worker/handle-task')
        const res = await ht({
            id: 5,
            type: 'heic',
            data: new ArrayBuffer(8),
            params: { mime: 'image/heic', name: 'p.heic' },
        })
        expect(res.ok).toBe(true)
        if (res.ok && res.result.kind === 'image') {
            expect(res.result.type).toBe('image/jpeg')
            expect(res.result.name).toBe('p.jpg')
            expect(res.result.bytes.byteLength).toBe(4)
            expect(res.result.metadata).toMatchObject({ heicConverted: true })
        } else throw new Error('expected image result')
        vi.unstubAllGlobals()
    })

    it('returns ok:false when libheif decode throws', async () => {
        vi.doMock('libheif-js/libheif-wasm/libheif-bundle.mjs', () => ({
            default: () =>
                Promise.resolve({
                    HeifDecoder: class {
                        decoder = { ptr: 1 }
                        decode() {
                            throw new Error('no codec')
                        }
                    },
                    heif_context_free: vi.fn(),
                }),
        }))
        // Stub a canvas so the helper's backend guard passes and decode() actually runs (and throws).
        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                getContext() {
                    return {
                        createImageData: () => ({
                            data: new Uint8ClampedArray(4),
                        }),
                        putImageData: vi.fn(),
                    }
                }
                async convertToBlob() {
                    return new Blob([])
                }
            },
        )
        const { handleTask: ht } = await import('../../src/worker/handle-task')
        const res = await ht({
            id: 6,
            type: 'heic',
            data: new ArrayBuffer(8),
            params: { mime: 'image/heic', name: 'p.heic' },
        })
        expect(res.ok).toBe(false)
        vi.unstubAllGlobals()
    })

    it('never throws on unknown task type', async () => {
        const res = await handleTask({
            id: 9,
            // @ts-expect-error: intentional bad type — 'nope' is not a valid task type
            type: 'nope',
            data: new ArrayBuffer(2),
        })
        expect(res.ok).toBe(false)
    })
})
