import { FileWithParams, UpupUploaderProps } from '../../shared/types'

export interface UploadProgress {
    loaded: number
    total: number
    percentage: number
}

export type UploadOptions = Pick<
    UpupUploaderProps,
    | 'onFileUploadStart'
    | 'onFileUploadProgress'
    | 'onFileUploadComplete'
    | 'onError'
    | 'onFilesUploadProgress'
> & {
    path?: string
    metadata?: Record<string, string>
    onFilesUploadProgress(completedFiles: number): void
}

export interface UploadResult {
    key: string
    file: FileWithParams
    httpStatus: number
}

export interface StorageSDK {
    upload(file: File, options?: UploadOptions): Promise<UploadResult>
    validateConfig(): boolean
}
