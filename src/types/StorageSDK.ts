import { AWSCredentials } from './AWSSDK'
import { AzureCredentials } from './AzureSDK'
import { GCSCredentials } from './GCSSDK'

export type Provider = 'aws'
// export type Provider = 'aws' | 'azure' | 'gcp' | 'backblaze'

export interface StorageConfig {
    provider: Provider
    region: string
    bucket: string
    tokenEndpoint: string
    expiresIn?: number // in seconds, default 3600 (1 hour)
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

export interface CredentialsManager {
    getCredentials():
        | Promise<AWSCredentials>
        | Promise<AzureCredentials>
        | Promise<GCSCredentials>
    shouldRefresh(): boolean
    refresh(): Promise<void>
}

export interface RetryConfig {
    maxRetries: number
    delayMs: number
    backoffMultiplier: number
}

export enum UploadErrorType {
    FILE_TOO_LARGE = 'FILE_TOO_LARGE',
    CREDENTIALS_ERROR = 'CREDENTIALS_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    EXPIRED_URL = 'EXPIRED_URL',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
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
