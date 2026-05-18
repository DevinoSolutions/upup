import type { UploadFile } from '@upup/core'
import type { ImageEditorOptions } from '../shared/types'
import { revokeFileUrl } from '@upup/core'

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
 * Create a new UploadFile from a Blob, preserving the identity (`id`)
 * of the original file. A fresh blob URL is created for the new file.
 */
export function blobToUploadFile(
    blob: Blob,
    original: UploadFile,
    output?: ImageEditorOptions['output'],
): UploadFile {
    const fileName = output?.fileName
        ? output.fileName(original)
        : original.name

    const file = new File([blob], fileName, {
        type: blob.type || original.type,
        lastModified: Date.now(),
    })

    const fileWithParams = file as UploadFile
    fileWithParams.id = original.id
    fileWithParams.url = URL.createObjectURL(file)
    fileWithParams.source = original.source
    fileWithParams.status = original.status
    fileWithParams.metadata = original.metadata
    fileWithParams.key = original.key
    fileWithParams.fileHash = original.fileHash
    fileWithParams.thumbnail = original.thumbnail

    return fileWithParams
}

/**
 * Replace a file in a Map<string, UploadFile>, revoking the old blob URL
 * to prevent memory leaks.
 */
export function revokeAndReplace(
    map: Map<string, UploadFile>,
    fileId: string,
    newFile: UploadFile,
): Map<string, UploadFile> {
    const oldFile = map.get(fileId)
    if (oldFile) {
        revokeFileUrl(oldFile)
    }

    const next = new Map(map)
    next.set(fileId, newFile)
    return next
}
