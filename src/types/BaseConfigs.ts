export type BaseConfigs = {
    shouldCompress?: boolean
    multiple?: boolean
    onFilesSelected?: (files: File[]) => void
    accept?: string
    limit?: number
    onFileClick?: (file: File) => void
    mini?: boolean
    onPrepareFiles?: (files: File[]) => Promise<File[]>
    maxFileSize?: {
        size: number
        unit?: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'
    }
    customMessage?: string
}
