import { Provider } from 'shared/types/StorageSDK'

export interface StorageConfig {
    provider: Provider
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

export interface UploadOptions {
    path?: string
    onProgress?: (progress: UploadProgress) => void
    metadata?: Record<string, string>
}

export interface UploadResult {
    key: string
    httpStatus: number
}

export interface StorageSDK {
    upload(file: File, options?: UploadOptions): Promise<UploadResult>
    validateConfig(): boolean
}
