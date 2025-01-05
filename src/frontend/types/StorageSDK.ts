import { UpupProvider } from '../../shared/types/StorageSDK'
import { BaseConfigs } from './'

export interface StorageConfig {
    provider: UpupProvider
    tokenEndpoint: string
    constraints?: {
        multiple: boolean
        accept: string
        maxFileSize?: number
    }
}

export interface UploadProgress {
    loaded: number
    total: number
    percentage: number
}

export type UploadOptions = Pick<
    BaseConfigs,
    | 'onFileUploadStart'
    | 'onFileUploadProgress'
    | 'onFileUploadComplete'
    | 'onFileUploadFail'
    | 'onTotalUploadProgress'
> & {
    path?: string
    metadata?: Record<string, string>
    onTotalUploadProgress(completedFiles: number): void
}

export interface UploadResult {
    key: string
    httpStatus: number
}

export interface StorageSDK {
    upload(file: File, options?: UploadOptions): Promise<UploadResult>
    validateConfig(): boolean
}
