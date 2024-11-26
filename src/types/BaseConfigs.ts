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
    onIntegrationClick?: (integrationType: string) => void
    onFileUploadStart?: (file: File) => void
    onFileUploadComplete?: (file: File, key: string) => void
    onAllUploadsComplete?: (keys: string[]) => void
    onFileUploadFail?: (file: File, error: Error) => void
    onFileProgress?: (file: File, progress: number) => void
    onTotalUploadProgress?: (
        progress: number,
        completedFiles: number,
        totalFiles: number,
    ) => void
    onFileRemove?: (file: File) => void
    onFileDragOver?: (files: File[]) => void
    onFileDragLeave?: (files: File[]) => void
    onFileDrop?: (files: File[]) => void
    onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
    onCancelUpload?: (files: File[]) => void
}
