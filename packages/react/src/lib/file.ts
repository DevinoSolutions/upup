import pako from 'pako'
import { FileSource, UploadStatus, type UploadFile } from '@upup/core'
import { b64EncodeUnicode } from '../shared/lib/encoder'

export {
    bytesToSize,
    sizeToBytes,
    checkFileSize,
    PREVIEW_MAX_TEXT_SIZE,
    PREVIEW_TEXT_TRUNCATE_LENGTH,
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
    fileCanPreviewText,
    fileGetExtension,
    fileIs3D,
    searchDriveFiles,
} from '@upup/core'

export const fileAppendParams = (file: File) => {
    const rel =
        (file as any).relativePath ||
        (file as any).webkitRelativePath ||
        file.name
    Object.assign(file, {
        id: (file as any).id || b64EncodeUnicode(rel),
        url: (file as any).url || URL.createObjectURL(file),
        source: (file as any).source || FileSource.LOCAL,
        status: (file as any).status || UploadStatus.READY,
        metadata: (file as any).metadata || {},
    })

    return file as UploadFile
}

/**
 * Revokes a blob URL to free memory. Safe to call on any file URL.
 * @param file - UploadFile object containing the URL to revoke
 */
export const revokeFileUrl = (file: UploadFile) => {
    if (file.url?.startsWith('blob:')) {
        URL.revokeObjectURL(file.url)
    }
}

export async function compressFile(oldFile: UploadFile) {
    const buffer = await oldFile.arrayBuffer()

    const compressed = new File([pako.gzip(buffer)], oldFile.name + '.gz', {
        type: 'application/octet-stream',
        lastModified: oldFile.lastModified,
    })
    const newUploadFile = fileAppendParams(compressed)
    newUploadFile.id = oldFile.id
    newUploadFile.thumbnail = oldFile.thumbnail
    newUploadFile.fileHash = oldFile.fileHash
    newUploadFile.key = oldFile.key
    newUploadFile.source = oldFile.source
    newUploadFile.status = oldFile.status
    newUploadFile.metadata = oldFile.metadata

    // Revoke old blob URL to prevent memory leak
    revokeFileUrl(oldFile)

    return newUploadFile
}

