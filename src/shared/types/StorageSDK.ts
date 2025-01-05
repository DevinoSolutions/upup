export enum UpupProvider {
    AWS = 'aws',
    Azure = 'azure',
    BackBlaze = 'backblaze',
    DigitalOcean = 'digitalocean',
}

export type PresignedUrlResponse = {
    key: string
    publicUrl: string
    uploadUrl: string
    expiresIn: number
}

export enum UploadErrorType {
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    EXPIRED_URL = 'EXPIRED_URL',

    FILE_VALIDATION_ERROR = 'FILE_VALIDATION_ERROR',
    PRESIGNED_URL_ERROR = 'PRESIGNED_URL_ERROR',

    SIGNED_URL_ERROR = 'SIGNED_URL_ERROR',
    CORS_CONFIG_ERROR = 'CORS_CONFIG_ERROR',
    TEMPORARY_CREDENTIALS_ERROR = 'TEMPORARY_CREDENTIALS_ERROR',

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
