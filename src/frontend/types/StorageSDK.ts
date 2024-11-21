import { Provider } from 'types/StorageSDK'

export interface StorageConfig {
    provider: Provider
    tokenEndpoint: string
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
