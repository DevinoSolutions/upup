import { afterEach, describe, expect, it, vi } from 'vitest'
import { compressStep } from '../../src/steps/compress'
import { exifStep } from '../../src/steps/exif'
import { heicStep } from '../../src/steps/heic'
import { thumbnailStep } from '../../src/steps/thumbnail'
import {
    FileSource,
    UploadStatus,
    type PipelineContext,
    type UploadFile,
} from '@useupup/core'

vi.mock('libheif-js/libheif-wasm/libheif-bundle.mjs', () => ({
    default: () =>
        Promise.resolve({
            HeifDecoder: class {
                decoder = { ptr: 1 }
                decode() {
                    return [
                        {
                            get_width: () => 4,
                            get_height: () => 4,
                            display: (
                                t: { data: Uint8ClampedArray },
                                cb: (r: unknown) => void,
                            ) => cb(t),
                            free: () => {},
                        },
                    ]
                }
            },
            heif_context_free: () => {},
        }),
}))

const ctx: PipelineContext = {
    files: new Map(),
    options: {},
    emit: () => {},
    t: ((key: string) => key) as PipelineContext['t'],
}

function makeUploadFile(
    name = 'photo.jpg',
    type = 'image/jpeg',
    content = 'original image payload',
): UploadFile {
    const file = new File([content], name, { type, lastModified: 123 })
    return Object.assign(file, {
        id: 'file-1',
        source: FileSource.LOCAL,
        status: UploadStatus.IDLE,
        metadata: {},
        url: 'blob:original',
    }) as UploadFile
}

function installImageRuntime(blobContent = 'processed-image'): void {
    vi.stubGlobal(
        'createImageBitmap',
        vi.fn(async () => ({
            width: 4000,
            height: 2000,
            close: vi.fn(),
        })),
    )

    vi.stubGlobal(
        'OffscreenCanvas',
        class FakeOffscreenCanvas {
            width: number
            height: number

            constructor(width: number, height: number) {
                this.width = width
                this.height = height
            }

            getContext() {
                return {
                    drawImage: vi.fn(),
                    createImageData: (w: number, h: number) => ({
                        data: new Uint8ClampedArray(w * h * 4),
                        width: w,
                        height: h,
                    }),
                    putImageData: vi.fn(),
                }
            }

            async convertToBlob(options: { type?: string }) {
                return new Blob([blobContent], {
                    type: options.type || 'image/jpeg',
                })
            }
        },
    )
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('browser image processing steps', () => {
    it('compresses images through canvas and preserves UploadFile identity fields', async () => {
        installImageRuntime('compressed')
        const original = makeUploadFile()

        const result = await compressStep({
            maxWidthOrHeight: 1000,
            quality: 0.7,
        }).process(original, ctx)

        expect(result).not.toBe(original)
        expect(result.id).toBe(original.id)
        expect(result.url).toBe(original.url)
        expect(result.name).toBe(original.name)
        expect(result.type).toBe('image/jpeg')
        expect(result.metadata).toMatchObject({
            width: 1000,
            height: 500,
            originalSize: original.size,
            processedSize: result.size,
            compressed: true,
        })
    })

    it('strips EXIF data by re-encoding image files through canvas', async () => {
        installImageRuntime('reencoded')
        const original = makeUploadFile()

        const result = await exifStep().process(original, ctx)

        expect(result).not.toBe(original)
        expect(result.metadata).toMatchObject({
            exifStripped: true,
            originalSize: original.size,
            processedSize: result.size,
        })
    })

    it('generates thumbnail metadata for image files', async () => {
        installImageRuntime('thumb')
        const original = makeUploadFile()

        const result = await thumbnailStep({
            width: 200,
            height: 120,
            quality: 0.6,
        }).process(original, ctx)

        expect(result).toBe(original)
        expect(result.metadata.thumbnailUrl).toMatch(
            /^data:image\/jpeg;base64,/,
        )
        expect(result.thumbnail?.file).toBeInstanceOf(File)
        expect(result.thumbnail?.file.name).toContain('.thumbnail.jpg')
    })

    it('converts HEIC files to JPEG via libheif through canvas', async () => {
        installImageRuntime('heic-jpeg')
        const original = makeUploadFile(
            'IMG_1000.HEIC',
            'image/heic',
            'heic payload',
        )

        const result = await heicStep().process(original, ctx)

        expect(result).not.toBe(original)
        expect(result.name).toBe('IMG_1000.jpg')
        expect(result.type).toBe('image/jpeg')
        expect(result.metadata).toMatchObject({
            heicConverted: true,
            originalSize: original.size,
            processedSize: result.size,
        })
    })
})
