export type Provider = 'aws' | 'azure'
// export type Provider = 'aws' | 'azure' | 'gcp' | 'backblaze'

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
    location: string
    httpStatus: number
}

export interface StorageSDK {
    upload(file: File, options?: UploadOptions): Promise<UploadResult>
    validateConfig(): boolean
}

export enum UploadErrorType {
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    EXPIRED_URL = 'EXPIRED_URL',
}

export class UploadError extends Error {
    constructor(
        public type: UploadErrorType,
        message: string,
        public retryable: boolean,
    ) {
        super(message)
        this.name = 'UploadError'
    }
}
