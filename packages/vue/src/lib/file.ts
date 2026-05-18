import { FileSource, UploadStatus, type UploadFile, b64EncodeUnicode } from '@upup/core'

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
    const partial = file as Partial<UploadFile>
    const rel = partial.relativePath
        || (file as File & { webkitRelativePath?: string }).webkitRelativePath
        || file.name
    Object.assign(file, {
        id: partial.id || b64EncodeUnicode(rel),
        url: partial.url || URL.createObjectURL(file),
        source: partial.source || FileSource.LOCAL,
        status: partial.status || UploadStatus.READY,
        metadata: partial.metadata || {},
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
