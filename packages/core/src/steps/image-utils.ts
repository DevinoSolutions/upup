import type { UploadFile, UploadFileMetadata } from '../contracts'

type DecodedImage = {
    source: CanvasImageSource
    width: number
    height: number
    close?: () => void
}

type CanvasLike = HTMLCanvasElement | OffscreenCanvas

// With the WebWorker lib enabled, `getContext('2d')` on a `HTMLCanvasElement | OffscreenCanvas`
// union widens to include `ImageBitmapRenderingContext` (which lacks `drawImage`). We only ever
// request the '2d' context, so the runtime value is always a 2D context — narrow to it.
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export type EncodeImageOptions = {
    maxWidthOrHeight?: number
    quality?: number
    type?: string
    metadata?: Partial<UploadFileMetadata>
}

function hasDocument(): boolean {
    return (
        typeof document !== 'undefined' &&
        typeof document.createElement === 'function'
    )
}

function clampQuality(value: unknown, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback
    return Math.min(1, Math.max(0.05, value))
}

function scaleDimensions(
    width: number,
    height: number,
    maxWidthOrHeight?: number,
): { width: number; height: number } {
    if (!maxWidthOrHeight || maxWidthOrHeight <= 0) return { width, height }
    const largest = Math.max(width, height)
    if (largest <= maxWidthOrHeight) return { width, height }
    const scale = maxWidthOrHeight / largest
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    }
}

function outputTypeFor(file: UploadFile, requestedType?: string): string {
    if (requestedType) return requestedType
    if (file.type === 'image/png' || file.type === 'image/webp')
        return file.type
    return 'image/jpeg'
}

export function createCanvas(width: number, height: number): CanvasLike | null {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height)
    }
    if (!hasDocument()) return null
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
}

export async function canvasToBlob(
    canvas: CanvasLike,
    type: string,
    quality: number,
): Promise<Blob | null> {
    if (
        'convertToBlob' in canvas &&
        typeof canvas.convertToBlob === 'function'
    ) {
        return canvas.convertToBlob({ type, quality })
    }
    return new Promise(resolve => {
        ;(canvas as HTMLCanvasElement).toBlob(
            blob => resolve(blob),
            type,
            quality,
        )
    })
}

async function decodeImage(file: UploadFile): Promise<DecodedImage | null> {
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file)
            return {
                source: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                close: () => bitmap.close(),
            }
        } catch {
            // Fall through to the HTMLImageElement path when this browser cannot
            // decode a specific image blob via createImageBitmap.
        }
    }

    if (!hasDocument()) return null

    return new Promise(resolve => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        const cleanup = () => URL.revokeObjectURL(url)
        img.onload = () => {
            cleanup()
            resolve({
                source: img,
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
            })
        }
        img.onerror = () => {
            cleanup()
            resolve(null)
        }
        img.src = url
    })
}

export async function encodeImageFile(
    file: UploadFile,
    options: EncodeImageOptions = {},
): Promise<UploadFile | null> {
    const decoded = await decodeImage(file).catch(() => null)
    if (!decoded) return null

    try {
        const dimensions = scaleDimensions(
            decoded.width,
            decoded.height,
            options.maxWidthOrHeight,
        )
        const canvas = createCanvas(dimensions.width, dimensions.height)
        const ctx = canvas?.getContext('2d') as Ctx2D | null
        if (!canvas || !ctx) return null

        ctx.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height)

        const type = outputTypeFor(file, options.type)
        const quality = clampQuality(options.quality, 0.82)
        const blob = await canvasToBlob(canvas, type, quality)
        if (!blob) return null

        const nextFile = new File([blob], file.name, {
            type: blob.type || type || file.type,
            lastModified: file.lastModified,
        })

        return cloneUploadFile(file, nextFile, {
            width: dimensions.width,
            height: dimensions.height,
            ...options.metadata,
        })
    } finally {
        decoded.close?.()
    }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
    if (typeof FileReader !== 'undefined') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () =>
                reject(reader.error ?? new Error('Failed to read blob'))
            reader.readAsDataURL(blob)
        })
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    const encode =
        typeof btoa === 'function'
            ? btoa
            : (
                    globalThis as unknown as {
                        Buffer?: {
                            from(
                                input: string,
                                encoding: string,
                            ): { toString(encoding: string): string }
                        }
                    }
                ).Buffer
              ? (input: string) =>
                    (
                        globalThis as unknown as {
                            Buffer: {
                                from(
                                    input: string,
                                    encoding: string,
                                ): { toString(encoding: string): string }
                            }
                        }
                    ).Buffer.from(input, 'binary').toString('base64')
              : null
    if (!encode) throw new Error('No base64 encoder available')
    return `data:${blob.type || 'application/octet-stream'};base64,${encode(binary)}`
}

export async function createThumbnail(
    file: UploadFile,
    options: {
        width?: number
        height?: number
        quality?: number
        type?: string
    } = {},
): Promise<{
    file: File
    dataUrl: string
    width: number
    height: number
} | null> {
    const decoded = await decodeImage(file).catch(() => null)
    if (!decoded) return null

    try {
        const maxWidth = options.width ?? 320
        const maxHeight = options.height ?? maxWidth
        const scale = Math.min(
            1,
            maxWidth / decoded.width,
            maxHeight / decoded.height,
        )
        const width = Math.max(1, Math.round(decoded.width * scale))
        const height = Math.max(1, Math.round(decoded.height * scale))
        const canvas = createCanvas(width, height)
        const ctx = canvas?.getContext('2d') as Ctx2D | null
        if (!canvas || !ctx) return null

        ctx.drawImage(decoded.source, 0, 0, width, height)

        const type = options.type ?? 'image/jpeg'
        const quality = clampQuality(options.quality, 0.75)
        const blob = await canvasToBlob(canvas, type, quality)
        if (!blob) return null

        const ext =
            type === 'image/png'
                ? 'png'
                : type === 'image/webp'
                  ? 'webp'
                  : 'jpg'
        const thumbnailFile = new File(
            [blob],
            `${file.name}.thumbnail.${ext}`,
            {
                type: blob.type || type,
                lastModified: file.lastModified,
            },
        )
        return {
            file: thumbnailFile,
            dataUrl: await blobToDataUrl(blob),
            width,
            height,
        }
    } finally {
        decoded.close?.()
    }
}

export function cloneUploadFile(
    original: UploadFile,
    replacement: File,
    metadata: Partial<UploadFileMetadata> = {},
): UploadFile {
    return Object.assign(replacement, {
        id: original.id,
        source: original.source,
        status: original.status,
        metadata: {
            ...(original.metadata ?? {}),
            ...metadata,
        },
        url: original.url,
        relativePath: original.relativePath,
        key: original.key,
        etag: original.etag,
        fileHash: original.fileHash,
        checksumSHA256: original.checksumSHA256,
        thumbnail: original.thumbnail,
    }) as UploadFile
}

export function uploadFileFromImageResult(
    original: UploadFile,
    result: {
        bytes: ArrayBuffer
        type?: string
        name?: string
        metadata?: Record<string, unknown>
    },
): UploadFile {
    const file = new File([result.bytes], result.name ?? original.name, {
        type: result.type || original.type,
        lastModified: original.lastModified,
    })
    return cloneUploadFile(
        original,
        file,
        (result.metadata ?? {}) as Partial<UploadFileMetadata>,
    )
}
