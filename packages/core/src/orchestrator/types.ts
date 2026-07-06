import type { UploadFile } from '../types/upload-file'
import type { UploadStatus } from '../types/upload-status'
import type { FileSource } from '../types/file-source'
import type { FilesProgressMap } from '../file-utils'
import type { ResolvedImageEditorOptions } from '../types/image-editor'
import type { UploadResult } from '../contracts-strategies'

export interface UploadProgressInfo {
    loaded: number
    total: number
    percentage: number
}

export interface OrchestratorState {
    files: Map<string, UploadFile>
    uploadStatus: UploadStatus
    uploadError: string
    /** Machine code from a typed UpupError (e.g. 'SignatureDoesNotMatch', 'bad_signature'), when the failure carried one. */
    uploadErrorCode?: string | undefined
    totalProgress: number
    filesProgressMap: FilesProgressMap
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
    activeSource?: FileSource | undefined
    editingFile: UploadFile | null
    editorQueue: UploadFile[]
    isAddingMore: boolean
    viewMode: 'grid' | 'list'
    isOnline: boolean
}

export interface OrchestratorCallbacks {
    onError?: ((message: string) => void) | undefined
    onWarn?: ((message: string) => void) | undefined
    onUploadComplete?: ((files: UploadFile[]) => void) | undefined
    onUploadStart?: (() => void) | undefined
    onFileUploadStart?: ((file: UploadFile) => void) | undefined
    onFileUploadProgress?:
        ((file: UploadFile, progress: UploadProgressInfo) => void) | undefined
    onFileUploadComplete?: ((file: UploadFile, key: string) => void) | undefined
    onFilesUploadProgress?:
        ((completedFiles: number, totalFiles: number) => void) | undefined
    onFilesUploadComplete?: ((files: UploadFile[]) => void) | undefined
    onFileRemoved?: ((file: UploadFile) => void) | undefined
    onFilesSelected?: ((files: UploadFile[]) => void) | undefined
    onFileDrop?: ((files: File[]) => void) | undefined
    onDoneClicked?: (() => void) | undefined
    onPrepareFiles?:
        | ((
              files: UploadFile[],
          ) => Promise<UploadFile[] | File[]> | UploadFile[] | File[])
        | undefined
    imageEditorOptions?: ResolvedImageEditorOptions | undefined
    /** When true, triggers upload automatically after files are added. */
    autoUpload?: boolean | undefined
}
