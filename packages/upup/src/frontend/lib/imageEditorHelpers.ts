import { FileWithParams, ImageEditorOptions } from '../../shared/types'
import { revokeFileUrl } from './file'

/**
 * Convert a data-URL (base64 or plain) string to a Blob.
 * Works with any MIME type encoded as `data:<mime>;base64,<data>`.
 */
export function dataURLtoBlob(dataURL: string): Blob {
    const [header, base64Data] = dataURL.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
    const binary = atob(base64Data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
}

/**
 * Create a new FileWithParams from a Blob, preserving the identity (`id`)
 * of the original file. A fresh blob URL is created for the new file.
 *
 * @param blob      The edited image blob.
 * @param original  The original FileWithParams being replaced.
 * @param output    Optional output settings (mimeType, quality, fileName).
 * @returns A new FileWithParams with the same `id` but updated content.
 */
export function blobToFileWithParams(
    blob: Blob,
    original: FileWithParams,
    output?: ImageEditorOptions['output'],
): FileWithParams {
    const fileName = output?.fileName
        ? output.fileName(original)
        : original.name

    const file = new File([blob], fileName, {
        type: blob.type || original.type,
        lastModified: Date.now(),
    })

    // Preserve file identity so the upload pipeline sees the same entry.
    const fileWithParams = file as FileWithParams
    fileWithParams.id = original.id
    fileWithParams.url = URL.createObjectURL(file)
    fileWithParams.key = original.key
    fileWithParams.fileHash = original.fileHash
    fileWithParams.thumbnail = original.thumbnail

    return fileWithParams
}

/**
 * Replace a file in a Map<string, FileWithParams>, revoking the old blob URL
 * to prevent memory leaks.
 *
 * @param map     The current files map (not mutated — a new Map is returned).
 * @param fileId  The id of the file to replace.
 * @param newFile The replacement FileWithParams.
 * @returns A new Map with the replaced entry.
 */
export function revokeAndReplace(
    map: Map<string, FileWithParams>,
    fileId: string,
    newFile: FileWithParams,
): Map<string, FileWithParams> {
    const oldFile = map.get(fileId)
    if (oldFile) {
        revokeFileUrl(oldFile)
    }

    const next = new Map(map)
    next.set(fileId, newFile)
    return next
}
