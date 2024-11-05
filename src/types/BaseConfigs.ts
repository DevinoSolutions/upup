export type BaseConfigs = {
    toBeCompressed?: boolean
    multiple?: boolean
    onChange?: (files: File[]) => void
    accept?: string
    limit?: number
    onFileClick?: (file: File) => void
    mini?: boolean
    onFilesChange?: (files: File[]) => Promise<File[]>
    maxFileSize?: {
        size: number
        unit?: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'
    }
    customMessage?: string
    onClick?: (integrationType: string) => void
    onUpload?: (file: File) => void
    onCompletedUpload?: (file: File, key: string) => void
    onAllCompleted?: (keys: string[]) => void
    onUploadFail?: (file: File, error: Error) => void
    onFileProgress?: (file: File, progress: number) => void
    onTotalProgress?: (
        progress: number,
        completedFiles: number,
        totalFiles: number,
    ) => void
    onFileRemove?: (file: File) => void
    onDragOver?: (files: File[]) => void
    onDragLeave?: (files: File[]) => void
    onDrop?: (files: File[]) => void
}
