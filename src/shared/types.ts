export enum UploadAdapter {
    INTERNAL = 'INTERNAL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    ONE_DRIVE = 'ONE_DRIVE',
    LINK = 'LINK',
    CAMERA = 'CAMERA',
    // DROPBOX = 'DROPBOX',
    // UNSPLASH = 'UNSPLASH',
    // BOX = 'BOX',
}

export type GoogleDriveConfigs = {
    google_api_key: string
    google_app_id: string
    google_client_id: string
}

export type OneDriveConfigs = {
    onedrive_client_id: string
    redirectUri?: string
}

export enum UpupProvider {
    AWS = 'aws',
    Azure = 'azure',
    BackBlaze = 'backblaze',
    DigitalOcean = 'digitalocean',
}

type MaxFileSizeObject = {
    size: number
    unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'
}

export type FileProgressObject = {
    loaded: number
    total: number
    percentage: number
}

export type UpupUploaderProps = {
    loader?: any

    uploadAdapters?: UploadAdapter[]
    driveConfigs?: {
        googleDrive?: GoogleDriveConfigs
        oneDrive?: OneDriveConfigs
    }
    provider: UpupProvider
    tokenEndpoint: string
    shouldCompress?: boolean
    accept?: string
    limit?: number
    mini?: boolean
    maxFileSize?: MaxFileSizeObject

    // Event Handlers
    onFilesSelected?: (files: File[]) => void
    onPrepareFiles?: (files: File[]) => Promise<File[]>
    onFileClick?: (file: File) => void
    onIntegrationClick?: (integrationType: string) => void
    onFileUploadStart?: (file: File) => void
    onFileUploadComplete?: (
        file: File,
        fileData: Omit<PresignedUrlResponse, 'uploadUrl'>,
    ) => void
    onFilesUploadComplete?: (
        results: Array<Omit<PresignedUrlResponse, 'uploadUrl'> | undefined>,
    ) => void
    onFileUploadProgress?: (
        file: File,
        { loaded, total, percentage }: FileProgressObject,
    ) => void
    onFilesUploadProgress?: (completedFiles: number, totalFiles: number) => void
    onFileRemove?: (file: File) => void
    onFileDragOver?: (files: File[]) => void
    onFileDragLeave?: (files: File[]) => void
    onFileDrop?: (files: File[]) => void
    onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
    onCancelUpload?: (files: File[]) => void
    onError?: (error: string, file?: File) => void
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

    UPLOAD_PAUSED = 'UPLOAD_PAUSED',
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
