export type BaseConfigs = {
    shouldCompress?: boolean
    multiple?: boolean
    accept?: string
    limit?: number
    mini?: boolean
    maxFileSize?: {
        size: number
        unit?: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'
    }
    customMessage?: string
    onFilesSelected?: (files: File[]) => void
    onPrepareFiles?: (files: File[]) => Promise<File[]>
    onFileClick?: (file: File) => void
    onIntegrationClick?: (integrationType: string) => void
    onFileUploadStart?: (file: File) => void
    onFileUploadComplete?: (file: File, key: string) => void
    onAllUploadsComplete?: (keys: string[]) => void
    onFileUploadFail?: (file: File, error: Error) => void
    onFileUploadProgress?: (
        file: File,
        {
            loaded,
            total,
            percentage,
        }: { loaded: number; total: number; percentage: number },
    ) => void
    onTotalUploadProgress?: (completedFiles: number, totalFiles: number) => void
    onFileRemove?: (file: File) => void
    onFileDragOver?: (files: File[]) => void
    onFileDragLeave?: (files: File[]) => void
    onFileDrop?: (files: File[]) => void
    onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
    onCancelUpload?: (files: File[]) => void
}
