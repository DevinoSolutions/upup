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
}
