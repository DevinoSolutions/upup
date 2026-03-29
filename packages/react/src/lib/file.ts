'use client'

import pako from 'pako'
import type { UploadFile } from '@upup/shared'

// ---------------------------------------------------------------------------
// Internal helpers (previously in fileOrder / imageEditorHelpers)
// ---------------------------------------------------------------------------

type FileLikeWithPath = {
    name: string
    relativePath?: string
    webkitRelativePath?: string
}

function getFileOrderPath(file: FileLikeWithPath) {
    return file.relativePath || file.webkitRelativePath || file.name
}

function fileHasRelativePath(file: FileLikeWithPath) {
    return !!(file.relativePath || file.webkitRelativePath)
}

function copyPreservedFileMetadata(target: UploadFile, source: UploadFile) {
    target.id = source.id
    target.key = source.key
    target.fileHash = source.fileHash
    target.checksumSHA256 = source.checksumSHA256
    target.etag = source.etag
    target.thumbnail = source.thumbnail
    if (fileHasRelativePath(source as FileLikeWithPath)) {
        ;(target as any).relativePath = getFileOrderPath(
            source as FileLikeWithPath,
        )
    }
}

function blobToUploadFile(blob: Blob, source: UploadFile): UploadFile {
    const file = new File([blob], source.name, {
        type: blob.type || source.type,
        lastModified: source.lastModified,
    }) as UploadFile
    file.url = URL.createObjectURL(file)
    copyPreservedFileMetadata(file, source)
    return file
}

// ---------------------------------------------------------------------------
// Encoder helper (previously in shared/lib/encoder)
// ---------------------------------------------------------------------------
function b64EncodeUnicode(str: string): string {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
            String.fromCharCode(parseInt(p1, 16)),
        ),
    )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @param bytes assign keyword depend on size
 */
export const bytesToSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i]
}

/**
 * @param size
 * @param unit
 */
export const sizeToBytes = (
    size: number,
    unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB' = 'B',
) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = sizes.indexOf(unit)
    return size * Math.pow(1024, i)
}

export const fileAppendParams = (file: File): UploadFile => {
    const rel =
        (file as any).relativePath ||
        (file as any).webkitRelativePath ||
        file.name
    const relativePath = fileHasRelativePath(file as FileLikeWithPath)
        ? getFileOrderPath(file as FileLikeWithPath)
        : undefined
    Object.assign(file, {
        id: (file as any).id || b64EncodeUnicode(rel),
        url: (file as any).url || URL.createObjectURL(file),
        ...(relativePath ? { relativePath } : {}),
    })
    return file as UploadFile
}

/**
 * Revokes a blob URL to free memory. Safe to call on any file URL.
 */
export const revokeFileUrl = (file: UploadFile) => {
    if (file.url?.startsWith('blob:')) {
        URL.revokeObjectURL(file.url)
    }
}

const FINGERPRINT_CHUNK_SIZE = 1024 * 1024 // 1 MB

/**
 * Computes a SHA-256 content fingerprint for a file.
 */
export async function computeFileHash(file: File): Promise<string> {
    let data: ArrayBuffer

    if (file.size <= FINGERPRINT_CHUNK_SIZE * 2) {
        data = await file.arrayBuffer()
    } else {
        const head = await file.slice(0, FINGERPRINT_CHUNK_SIZE).arrayBuffer()
        const tail = await file
            .slice(file.size - FINGERPRINT_CHUNK_SIZE)
            .arrayBuffer()
        const sizeTag = new TextEncoder().encode(String(file.size))
        const merged = new Uint8Array(
            head.byteLength + tail.byteLength + sizeTag.byteLength,
        )
        merged.set(new Uint8Array(head), 0)
        merged.set(new Uint8Array(tail), head.byteLength)
        merged.set(sizeTag, head.byteLength + tail.byteLength)
        data = merged.buffer
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

/**
 * Computes a full SHA-256 hash of the entire file content.
 */
export async function computeFullContentHash(file: File): Promise<string> {
    const data = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

export async function compressFile(oldFile: UploadFile): Promise<UploadFile> {
    const buffer = await oldFile.arrayBuffer()
    const compressed = new File([pako.gzip(buffer)], oldFile.name + '.gz', {
        type: 'application/octet-stream',
        lastModified: oldFile.lastModified,
    })
    const newFile = fileAppendParams(compressed)
    copyPreservedFileMetadata(newFile, oldFile)
    revokeFileUrl(oldFile)
    return newFile
}

/** MIME types for HEIC/HEIF images that need conversion. */
const HEIC_MIME_TYPES = new Set([
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
])

function isHeicFile(file: File): boolean {
    if (HEIC_MIME_TYPES.has(file.type.toLowerCase())) return true
    const ext = file.name.split('.').pop()?.toLowerCase()
    return ext === 'heic' || ext === 'heif'
}

/**
 * Converts a HEIC/HEIF image to JPEG using heic2any.
 */
export async function convertHeicFile(file: UploadFile): Promise<UploadFile> {
    if (!isHeicFile(file)) return file

    const heic2any = (await import('heic2any')).default
    const blob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92,
    })
    const resultBlob = Array.isArray(blob) ? blob[0] : blob

    const name = file.name
        .replace(/\.heic$/i, '.jpg')
        .replace(/\.heif$/i, '.jpg')
    const converted = new File([resultBlob], name, {
        type: 'image/jpeg',
    }) as UploadFile
    converted.url = URL.createObjectURL(converted)
    copyPreservedFileMetadata(converted, file)
    revokeFileUrl(file)
    return converted
}

/**
 * Strips EXIF metadata from an image by re-drawing it on a canvas.
 */
export async function stripExifData(file: UploadFile): Promise<UploadFile> {
    if (!fileGetIsImage(file.type)) return file

    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        bitmap.close()
        return file
    }

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await canvas.convertToBlob({ type: file.type, quality: 1.0 })
    if (blob.size >= file.size) return file

    return blobToUploadFile(blob, file)
}

export type ImageCompressionOptions = {
    quality?: number
    maxWidth?: number
    maxHeight?: number
    mimeType?: string
    convertSize?: number
}

const IMAGE_COMPRESSION_DEFAULTS: Required<ImageCompressionOptions> = {
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1920,
    mimeType: '',
    convertSize: Infinity,
}

/**
 * Canvas-based image compression: resizes dimensions and reduces quality.
 */
export async function compressImageFile(
    file: UploadFile,
    options: ImageCompressionOptions = {},
): Promise<UploadFile> {
    if (!fileGetIsImage(file.type)) return file

    const { quality, maxWidth, maxHeight, mimeType, convertSize } = {
        ...IMAGE_COMPRESSION_DEFAULTS,
        ...options,
    }

    const outputMime =
        mimeType || (file.size > convertSize ? 'image/jpeg' : file.type)

    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    let newWidth = width
    let newHeight = height
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        newWidth = Math.round(width * ratio)
        newHeight = Math.round(height * ratio)
    }

    const canvas = new OffscreenCanvas(newWidth, newHeight)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)
    bitmap.close()

    const blob = await canvas.convertToBlob({ type: outputMime, quality })
    if (blob.size >= file.size) return file

    return blobToUploadFile(blob, file)
}

export type ThumbnailGeneratorOptions = {
    thumbnailWidth?: number
    thumbnailHeight?: number
    thumbnailType?: string
    waitForThumbnailsBeforeUpload?: boolean
}

export const THUMBNAIL_DEFAULTS: Required<ThumbnailGeneratorOptions> = {
    thumbnailWidth: 200,
    thumbnailHeight: 200,
    thumbnailType: 'image/jpeg',
    waitForThumbnailsBeforeUpload: false,
}

type ThumbnailCanvas = OffscreenCanvas | HTMLCanvasElement

function createThumbnailCanvas(width: number, height: number): ThumbnailCanvas {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height)
    }
    if (typeof document === 'undefined') {
        throw new Error('Canvas API is not available in this environment')
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
}

function getThumbnailDimensions(
    width: number,
    height: number,
    thumbnailWidth: number,
    thumbnailHeight: number,
) {
    const ratio = Math.min(thumbnailWidth / width, thumbnailHeight / height, 1)
    return {
        width: Math.max(Math.round(width * ratio), 1),
        height: Math.max(Math.round(height * ratio), 1),
    }
}

async function thumbnailCanvasToBlob(
    canvas: ThumbnailCanvas,
    thumbnailType: string,
): Promise<Blob> {
    if ('convertToBlob' in canvas) {
        return canvas.convertToBlob({ type: thumbnailType, quality: 0.8 })
    }
    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            blob => {
                if (blob) resolve(blob)
                else reject(new Error('Failed to create thumbnail blob'))
            },
            thumbnailType,
            0.8,
        )
    })
}

async function createThumbnailFileFromSource(
    source: CanvasImageSource,
    fileName: string,
    width: number,
    height: number,
    options: Required<ThumbnailGeneratorOptions>,
): Promise<File | undefined> {
    const { width: nextWidth, height: nextHeight } = getThumbnailDimensions(
        width,
        height,
        options.thumbnailWidth,
        options.thumbnailHeight,
    )

    const canvas = createThumbnailCanvas(nextWidth, nextHeight)
    const ctx = canvas.getContext('2d') as
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D
        | null
    if (!ctx) return

    ctx.drawImage(source, 0, 0, nextWidth, nextHeight)

    const blob = await thumbnailCanvasToBlob(canvas, options.thumbnailType)
    return new File([blob], `thumb_${fileName}`, {
        type: options.thumbnailType,
        lastModified: Date.now(),
    })
}

async function createVideoThumbnailFile(
    file: UploadFile,
    options: Required<ThumbnailGeneratorOptions>,
): Promise<File | undefined> {
    if (typeof document === 'undefined') return

    const video = document.createElement('video')
    const videoUrl = file.url || URL.createObjectURL(file)
    const shouldRevokeUrl = !file.url

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    try {
        await new Promise<void>((resolve, reject) => {
            const handleLoadedData = () => {
                cleanup()
                resolve()
            }
            const handleError = () => {
                cleanup()
                reject(new Error('Failed to load video thumbnail source'))
            }
            const cleanup = () => {
                video.removeEventListener('loadeddata', handleLoadedData)
                video.removeEventListener('error', handleError)
            }
            video.addEventListener('loadeddata', handleLoadedData)
            video.addEventListener('error', handleError)
            video.src = videoUrl
        })

        if (!video.videoWidth || !video.videoHeight) return

        return await createThumbnailFileFromSource(
            video,
            file.name,
            video.videoWidth,
            video.videoHeight,
            options,
        )
    } finally {
        video.pause()
        video.removeAttribute('src')
        video.load()
        if (shouldRevokeUrl) URL.revokeObjectURL(videoUrl)
    }
}

/**
 * Generates a thumbnail for an image or video file.
 */
export async function generateThumbnailForFile(
    file: UploadFile,
    options: ThumbnailGeneratorOptions = {},
): Promise<UploadFile> {
    const resolvedOptions = { ...THUMBNAIL_DEFAULTS, ...options }

    if (fileGetIsImage(file.type)) {
        const bitmap = await createImageBitmap(file)
        try {
            const thumbFile = await createThumbnailFileFromSource(
                bitmap,
                file.name,
                bitmap.width,
                bitmap.height,
                resolvedOptions,
            )
            if (thumbFile) file.thumbnail = { file: thumbFile }
            return file
        } finally {
            bitmap.close()
        }
    }

    if (!fileGetIsVideo(file.type)) return file

    const thumbFile = await createVideoThumbnailFile(file, resolvedOptions)
    if (thumbFile) file.thumbnail = { file: thumbFile }
    return file
}

export function searchDriveFiles<T extends { name: string }>(
    files: T[],
    searchTerm: string,
    options: {
        caseSensitive?: boolean
        exactMatch?: boolean
        maxResults?: number
    } = {},
): T[] {
    const {
        caseSensitive = false,
        exactMatch = false,
        maxResults = 100,
    } = options

    if (!searchTerm) return files?.slice(0, maxResults)

    let searchString = searchTerm
    let fileNames: string[]

    if (!caseSensitive) {
        searchString = searchTerm.toLowerCase()
        fileNames = files.map(file => file.name.toLowerCase())
    } else {
        fileNames = files.map(file => file.name)
    }

    return files
        .filter((_file, index) =>
            exactMatch
                ? fileNames[index] === searchString
                : fileNames[index].includes(searchString),
        )
        .slice(0, maxResults)
}

export function fileGetIsImage(fileType: string) {
    return fileType.startsWith('image/')
}

export function fileGetIsVideo(fileType: string) {
    return fileType.startsWith('video/')
}

/**
 * Maximum file size (in bytes) for which text-based preview is allowed.
 */
export const PREVIEW_MAX_TEXT_SIZE = 512 * 1024 // 512 KB

/**
 * Maximum number of characters to render in the preview portal for text files.
 */
export const PREVIEW_TEXT_TRUNCATE_LENGTH = 100_000

/**
 * Determines whether a file is a text-based file that could be previewed.
 */
export function fileGetIsText(fileType: string, fileName: string): boolean {
    if (!fileType) return false
    if (fileType.startsWith('text/')) return true
    const lower = fileName.toLowerCase()
    return (
        lower.endsWith('.txt') ||
        lower.endsWith('.md') ||
        lower.endsWith('.json') ||
        lower.endsWith('.csv') ||
        lower.endsWith('.log') ||
        lower.endsWith('.js') ||
        lower.endsWith('.ts') ||
        lower.endsWith('.css') ||
        lower.endsWith('.html')
    )
}

/**
 * Returns true if a text file is small enough to safely preview inline.
 */
export function fileCanPreviewText(
    fileType: string,
    fileName: string,
    fileSize: number | undefined,
): boolean {
    if (!fileGetIsText(fileType, fileName)) return false
    if (fileSize === undefined) return true
    return fileSize <= PREVIEW_MAX_TEXT_SIZE
}

export function fileGetExtension(fileType: string, fileName: string) {
    if (!fileType) {
        return fileName.split('.').pop()?.toLowerCase() || ''
    }
    const typeSplit = fileType.split('/')
    const nameSplit = fileName.split('.')
    const lastNamePart = nameSplit[nameSplit.length - 1]?.toLowerCase() || ''
    if (!typeSplit[1]) return lastNamePart
    if (typeSplit[1].includes('.')) return lastNamePart
    return typeSplit[1].toLowerCase()
}

export function fileIs3D(ext: string) {
    const threeDExtensions = [
        '3ds', '3dm', 'blend', 'dxf', 'dwg', 'c4d', 'ma', 'mb',
        'ply', 'stl', 'fbx', 'obj', 'dae', 'gltf', 'glb', 'm3',
    ]
    return threeDExtensions.includes(ext.toLowerCase())
}
