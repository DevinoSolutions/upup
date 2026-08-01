import pako from 'pako'
import type { Translations, UploadFile } from '@upupjs/core'
import { fileAppendParams, revokeFileUrl } from '@upupjs/core/internal'

export { fileAppendParams, revokeFileUrl }

/** Human-readable file size using the localized unit labels. Shared by
 *  FilePreview (grid tile), FileRow (list) and FileHero (single-file). */
export function formatFileSize(
    bytes: number | undefined,
    tr: Translations,
): string {
    if (!bytes || bytes === 0) return tr.zeroBytes
    const k = 1024
    const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i] ?? ''}`
}
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
} from '@upupjs/core/internal'

export async function compressFile(oldFile: UploadFile): Promise<UploadFile> {
    const buffer = await oldFile.arrayBuffer()
    const compressed = new File([pako.gzip(buffer)], oldFile.name + '.gz', {
        type: 'application/octet-stream',
        lastModified: oldFile.lastModified,
    })
    const newUploadFile = fileAppendParams(compressed)
    newUploadFile.id = oldFile.id
    /* eslint-disable @typescript-eslint/no-deprecated -- carry legacy thumbnail/fileHash across compression until v3 removes them */
    if (oldFile.thumbnail !== undefined)
        newUploadFile.thumbnail = oldFile.thumbnail
    if (oldFile.fileHash !== undefined)
        newUploadFile.fileHash = oldFile.fileHash
    /* eslint-enable @typescript-eslint/no-deprecated -- end legacy field carry-over */
    if (oldFile.key !== undefined) newUploadFile.key = oldFile.key
    newUploadFile.source = oldFile.source
    newUploadFile.status = oldFile.status
    newUploadFile.metadata = oldFile.metadata
    revokeFileUrl(oldFile)
    return newUploadFile
}
