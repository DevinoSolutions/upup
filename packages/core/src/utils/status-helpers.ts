import { UploadStatus } from '../contracts'

export function isUploadActive(status: UploadStatus): boolean {
    return (
        status === UploadStatus.UPLOADING || status === UploadStatus.PROCESSING
    )
}

export function isUploadIdle(status: UploadStatus): boolean {
    return status === UploadStatus.IDLE || status === UploadStatus.READY
}

/** Whether a file's remove control is locked. "Has progress" used to imply
 *  "in flight", but a crash-restored PAUSED file now carries its resumable
 *  byte offset as progress too — and a paused file must stay discardable,
 *  because discarding is the one path that aborts its server-side upload and
 *  drops its persisted session. */
export function isFileRemovalLocked(
    progress: number | null | undefined,
    fileStatus: UploadStatus,
): boolean {
    return !!progress && fileStatus !== UploadStatus.PAUSED
}
