import type { UploadFile } from '../types/upload-file'
import type { UploadStatus } from '../types/upload-status'
import type { FileSource } from '../types/file-source'
import type { FilesProgressMap } from '../file-utils'

export interface OrchestratorState {
    files: Map<string, UploadFile>
    uploadStatus: UploadStatus
    uploadError: string
    totalProgress: number
    filesProgressMap: FilesProgressMap
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
    activeAdapter?: FileSource
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
    onFileUploadProgress?: (file: UploadFile, progress: number) => void
    onFileUploadComplete?: (file: UploadFile) => void
    onFilesUploadProgress?: (totalProgress: number) => void
    onFilesUploadComplete?: (files: UploadFile[]) => void
    onFileRemoved?: (file: UploadFile) => void
    onFileDrop?: (files: File[]) => void
    onDoneClicked?: () => void
    onPrepareFiles?: (files: UploadFile[]) => Promise<UploadFile[] | File[]> | UploadFile[] | File[]
}
