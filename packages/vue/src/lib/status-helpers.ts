import { UploadStatus } from '@upup/core'

export function isUploadActive(status: UploadStatus): boolean {
    return status === UploadStatus.UPLOADING || status === UploadStatus.PROCESSING
}

export function isUploadIdle(status: UploadStatus): boolean {
    return status === UploadStatus.IDLE || status === UploadStatus.READY
}
