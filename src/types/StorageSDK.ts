import { BaseConfigs } from './BaseConfigs'

export enum Provider {
    AWS = 'aws',
    Azure = 'azure',
    BackBlaze = 'backblaze',
    DigitalOcean = 'digitalocean',
}

export interface StorageConfig {
    provider: Provider
    tokenEndpoint: string
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

export type PresignedUrlResponse = {
    key: string
    publicUrl: string
    uploadUrl: string
    expiresIn: number
}

export interface UploadResult {
    key: string
    httpStatus: number
}

export interface StorageSDK {
    upload(file: File, options?: UploadOptions): Promise<UploadResult>
    validateConfig(): boolean
}

export enum UploadErrorType {
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    EXPIRED_URL = 'EXPIRED_URL',

    FILE_VALIDATION_ERROR = 'FILE_VALIDATION_ERROR',
    PRESIGNED_URL_ERROR = 'PRESIGNED_URL_ERROR',

    UNKNOWN_UPLOAD_ERROR = 'UNKNOWN_UPLOAD_ERROR',
}

export class UploadError extends Error {
    private DEFAULT_ERROR_STATUS_CODE = 500

    constructor(
        message: string,
        public type = UploadErrorType.UNKNOWN_UPLOAD_ERROR,
        public retryable = false,
        public status?: number,
    ) {
        super(message)
        this.name = 'UploadError'
        this.status = status || this.DEFAULT_ERROR_STATUS_CODE
    }
}
