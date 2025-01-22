import { ProviderUploadResponse, UpupUploaderProps } from '../../shared/types'

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
> & {
    path?: string
    metadata?: Record<string, string>
    onFilesUploadProgress?: (completedFiles: number) => void
}

export type UploadOptionsWithSignal = UploadOptions & {
    signal?: AbortController['signal']
}

export interface StorageSDK {
    validateConfig(): boolean
    upload(
        file: File,
        options?: UploadOptions,
    ): Promise<ProviderUploadResponse | undefined>
    uploadAll(
        files: File[],
        options?: UploadOptions,
    ): Promise<Array<ProviderUploadResponse | undefined>>
    isPaused(fileName: string): boolean
    pauseUpload(fileName: string): void
    pauseAllUploads(): void
    resumeUpload(file: File): Promise<Array<ProviderUploadResponse | undefined>>
    resumeAllUploads(): Promise<Array<ProviderUploadResponse | undefined>>
    retryFailedUpload: (file: File) => Promise<void>
    retryAllFailedUploads: () => Promise<void[]>
}
