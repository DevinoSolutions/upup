import type { CoreOptions } from './options/types'
import type { UploadFile } from './types/upload-file'
import { UploadStatus } from './types/upload-status'
import { fileFingerprint, loadSession } from './utils/multipart-session-store'

/** A finished multipart upload can die in the window between its
 *  synchronous session removal and the asynchronous IndexedDB snapshot
 *  clear — the next visit then restores a file the server already
 *  assembled, offering a Resume that would re-upload all of it. The
 *  session store is the tiebreaker: init writes the session synchronously
 *  before the first byte moves and completion removes it synchronously,
 *  so an UPLOADING-status file of multipart size with no session is a
 *  stale snapshot, not a crashed upload. PROCESSING files never had a
 *  session and stay restorable; so does everything below the multipart
 *  threshold or outside persist mode. */
export function isStaleMultipartRestore(
    file: UploadFile,
    resumable: CoreOptions['resumable'],
): boolean {
    if (resumable?.protocol !== 'multipart') return false
    if (!(resumable.persist ?? true)) return false
    if (!(file instanceof File)) return false
    if (file.status !== UploadStatus.UPLOADING) return false
    if (file.key != null) return false
    if (file.size < (resumable.thresholdBytes ?? 5 * 1024 * 1024)) {
        return false
    }
    return loadSession(fileFingerprint(file)) == null
}

/** A crash mid-run leaves files that were still in flight with no server key;
 *  they come back PAUSED (as does the overall status) so the user chooses
 *  whether to resume. Files that already hold a key keep their status. */
export function normalizeRestoredFiles(
    liveFiles: [string, UploadFile][],
    restoredStatus: UploadStatus,
): { files: [string, UploadFile][]; status: UploadStatus } {
    const wasActive =
        restoredStatus === UploadStatus.PROCESSING ||
        restoredStatus === UploadStatus.UPLOADING
    return {
        files: liveFiles.map(([id, file]) => {
            if (
                wasActive &&
                file.key == null &&
                (file.status === UploadStatus.PROCESSING ||
                    file.status === UploadStatus.UPLOADING ||
                    file.status === UploadStatus.READY ||
                    file.status === UploadStatus.IDLE)
            ) {
                return [
                    id,
                    Object.assign(file, {
                        status: UploadStatus.PAUSED,
                    }),
                ] as [string, UploadFile]
            }
            return [id, file] as [string, UploadFile]
        }),
        status: wasActive ? UploadStatus.PAUSED : restoredStatus,
    }
}

/** A restored PAUSED file rendered "0 B of N" even when most of it was
 *  already in storage — the persisted multipart session knows the real
 *  offset, but nothing replayed it into the progress pipeline until the
 *  user actually hit resume. Returns the `upload-progress` payloads to emit
 *  so the restored UI opens at the byte count the resume will continue from.
 *  Same session gates as tryResume (scope), minus the server round-trip:
 *  this is display-only and must not spend a request; the authoritative
 *  recheck still happens on resume. */
export function restoredProgressPayloads(
    restored: [string, UploadFile][],
    serverUrl: CoreOptions['serverUrl'],
): { fileId: string; loaded: number; total: number }[] {
    const payloads: { fileId: string; loaded: number; total: number }[] = []
    for (const [, file] of restored) {
        if (file.status !== UploadStatus.PAUSED) continue
        if (!(file instanceof File)) continue
        const session = loadSession(fileFingerprint(file))
        if (!session || session.scope !== serverUrl) continue
        const loaded = Math.min(session.uploadedBytes ?? 0, file.size)
        if (loaded <= 0) continue
        payloads.push({ fileId: file.id, loaded, total: file.size })
    }
    return payloads
}
