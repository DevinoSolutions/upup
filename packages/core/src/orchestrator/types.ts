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
    uploadErrorCode?: string
    totalProgress: number
    filesProgressMap: FilesProgressMap
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
    activeSource?: FileSource
    editingFile: UploadFile | null
    editorQueue: UploadFile[]
    isAddingMore: boolean
    viewMode: 'grid' | 'list'
    isOnline: boolean
}

export interface OrchestratorCallbacks {
    onError?: (message: string) => void
    onWarn?: (message: string) => void
    onUploadComplete?: (files: UploadFile[]) => void
    onUploadStart?: () => void
    onFileUploadStart?: (file: UploadFile) => void
    onFileUploadProgress?: (
        file: UploadFile,
        progress: UploadProgressInfo,
    ) => void
    onFileUploadComplete?: (file: UploadFile, key: string) => void
    onFilesUploadProgress?: (completedFiles: number, totalFiles: number) => void
    onFilesUploadComplete?: (files: UploadFile[]) => void
    onFileRemoved?: (file: UploadFile) => void
    onFilesSelected?: (files: UploadFile[]) => void
    onFileDrop?: (files: File[]) => void
    onDoneClicked?: () => void
    onPrepareFiles?: (
        files: UploadFile[],
    ) => Promise<UploadFile[] | File[]> | UploadFile[] | File[]
    imageEditorOptions?: ResolvedImageEditorOptions
    /** When true, triggers upload automatically after files are added. */
    autoUpload?: boolean
}
