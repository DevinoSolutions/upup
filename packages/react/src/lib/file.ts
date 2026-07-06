import pako from 'pako'
import type { UploadFile } from '@upup/core'
import { fileAppendParams, revokeFileUrl } from '@upup/core/internal'

export { fileAppendParams, revokeFileUrl }
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
} from '@upup/core/internal'

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
