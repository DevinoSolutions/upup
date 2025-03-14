import { FC } from 'react'

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

type UpupUploaderPropsClassNames = {
    containerMiniWrapper?: string
    containerMini?: string
    containerFull?: string
    containerFullWrapper?: string
    containerHeader?: string
    containerHeaderTitle?: string
    containerCancelButton?: string
    containerAddMoreButton?: string

    adapterButtonList?: string
    adapterButton?: string
    adapterButtonIcon?: string
    adapterButtonText?: string

    adapterSelectorContainer?: string

    adapterViewHeader?: string
    adapterViewCancelButton?: string
    adapterView?: string
    driveLoading?: string

    driveHeader?: string
    driveLogoutButton?: string
    driveSearchContainer?: string
    driveSearchInput?: string
    driveBody?: string
    driveItemContainerDefault?: string
    driveItemContainerSelected?: string
    driveItemContainerInner?: string
    driveItemInnerText?: string
    driveFooter?: string
    driveAddFilesButton?: string
    driveCancelFilesButton?: string

    urlInput?: string
    urlFetchButton?: string

    cameraPreviewContainer?: string
    cameraDeleteButton?: string
    cameraCaptureButton?: string
    cameraRotateButton?: string
    cameraAddButton?: string

    fileListContainer?: string
    fileListContainerInnerSingle?: string
    fileListContainerInnerMultiple?: string
    fileListFooter?: string

    filePreviewPortal?: string
    fileItemSingle?: string
    fileItemMultiple?: string
    fileThumbnailSingle?: string
    fileThumbnailMultiple?: string
    fileInfo?: string
    fileName?: string
    fileSize?: string
    filePreviewButton?: string
    fileDeleteButton?: string

    uploadButton?: string
    uploadDoneButton?: string

    progressBarContainer?: string
    progressBar?: string
    progressBarInner?: string
    progressBarText?: string
}

export type UpupUploaderPropsIcons = {
    ContainerAddMoreIcon?: FC<{ className?: string }>

    FileDeleteIcon?: FC<{ className?: string }>

    CameraDeleteIcon?: FC<{ className?: string }>
    CameraCaptureIcon?: FC<{ className?: string }>
    CameraRotateIcon?: FC<{ className?: string }>

    LoaderIcon?: FC<{ className?: string }>
}

export type UpupUploaderProps = {
    // Required Props
    provider: UpupProvider
    tokenEndpoint: string

    // Optional Props
    enableAutoCorsConfig?: boolean
    uploadAdapters?: UploadAdapter[]
    driveConfigs?: {
        googleDrive?: GoogleDriveConfigs
        oneDrive?: OneDriveConfigs
    }
    shouldCompress?: boolean
    accept?: string
    limit?: number
    mini?: boolean
    maxFileSize?: MaxFileSizeObject
    customProps?: object
    dark?: boolean
    classNames?: UpupUploaderPropsClassNames
    icons?: UpupUploaderPropsIcons

    // Event Handlers
    onFilesSelected?: (files: File[]) => void
    onPrepareFiles?: (files: FileWithParams[]) => Promise<FileWithParams[]>
    onFileClick?: (file: FileWithParams) => void
    onIntegrationClick?: (integrationType: string) => void
    onFileUploadStart?: (file: FileWithParams) => void
    onFileUploadComplete?: (file: FileWithParams, key: string) => void
    onFilesUploadComplete?: (keys: string[]) => void
    onFileUploadProgress?: (
        file: FileWithParams,
        {
            loaded,
            total,
            percentage,
        }: { loaded: number; total: number; percentage: number },
    ) => void
    onFilesUploadProgress?: (completedFiles: number, totalFiles: number) => void
    onFileRemove?: (file: FileWithParams) => void
    onFilesDragOver?: (files: File[]) => void
    onFilesDragLeave?: (files: File[]) => void
    onFilesDrop?: (files: File[]) => void
    onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
    // onCancelUpload?: (files: FileWithParams[]) => void
    onError?: (errorMessage: string) => void
    onWarn?: (warningMessage: string) => void
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
    private readonly DEFAULT_ERROR_STATUS_CODE = 500

    constructor(
        message: string,
        public type = UploadErrorType.UNKNOWN_UPLOAD_ERROR,
        public retryable = false,
        public status?: number,
    ) {
        super(message)
        this.name = 'UploadError'
        this.status = status ?? this.DEFAULT_ERROR_STATUS_CODE
    }
}

export type FileWithParams = File & { id: string; url: string }

export type FileWithProgress = FileWithParams & { progress: number }
