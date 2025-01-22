import {
    PresignedUrlResponse,
    UploadError,
    UploadErrorType,
    UpupProvider,
    UpupUploaderProps,
} from '../../../shared/types'
import {
    StorageSDK,
    UploadOptions,
    UploadOptionsWithSignal,
} from '../../types/StorageSDK'

export enum UploadState {
    PENDING = 'PENDING',
    UPLOADING = 'UPLOADING',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

type UploadConfig = Pick<UpupUploaderProps, 'provider' | 'tokenEndpoint'> & {
    constraints?: {
        multiple: boolean
        accept: string
        maxFileSize?: number
    }
}

export class ProviderSDK implements StorageSDK {
    private config: UploadConfig
    private uploadCount = 0
    private uploadedChunks: {
        [key: string]: {
            bytesUploaded: number
            lastAttempt: number
            retryCount: number
        }
    } = {}
    private lastOptions = {} as UploadOptions
    private activeUploads: Map<
        string,
        { file: File; controller: AbortController; status: UploadState }
    > = new Map()
    private MAX_RETRIES = 3

    constructor(config: UploadConfig) {
        this.config = config
        this.validateConfig()
    }

    validateConfig(): boolean {
        const required = ['tokenEndpoint', 'provider'] as const
        const missing = required.filter(key => !this.config[key])

        if (missing.length > 0)
            throw new Error(
                `Missing required configuration: ${missing.join(', ')}`,
            )
        if (!Object.values(UpupProvider).includes(this.config.provider))
            throw new Error(`Invalid provider: ${this.config.provider}`)

        return true
    }

    private async getPresignedUrl(file: File): Promise<PresignedUrlResponse> {
        const response = await fetch(this.config.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: file.name,
                type: file.type,
                size: file.size,
                provider: this.config.provider,
                ...this.config.constraints,
            }),
        })
        const data = await response.json()
        if (!response.ok)
            throw new Error(data.details || 'Failed to get upload URL')

        return data
    }

    private uploadWithProgress(
        url: string,
        file: File,
        {
            onFileUploadProgress,
            onFilesUploadProgress,
            signal,
        }: UploadOptionsWithSignal,
    ): Promise<Response> {
        const fileState = this.uploadedChunks[file.name] || {
            bytesUploaded: 0,
            lastAttempt: Date.now(),
            retryCount: 0,
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            const startByte = fileState.bytesUploaded

            xhr.upload.addEventListener('progress', event => {
                if (event.lengthComputable && onFileUploadProgress) {
                    const totalLoaded = startByte + event.loaded
                    fileState.bytesUploaded = totalLoaded
                    fileState.lastAttempt = Date.now()

                    onFileUploadProgress(file, {
                        loaded: totalLoaded,
                        total: event.total,
                        percentage: (totalLoaded / event.total) * 100,
                    })
                }
                if (event.lengthComputable && onFilesUploadProgress)
                    onFilesUploadProgress(this.uploadCount)
            })

            xhr.addEventListener('load', () => {
                const isValidStatus = xhr.status >= 200 && xhr.status < 300

                if (isValidStatus)
                    resolve(
                        new Response(xhr.response, {
                            status: xhr.status,
                            headers:
                                this.config.provider !== UpupProvider.Azure
                                    ? new Headers({
                                          ETag:
                                              xhr.getResponseHeader('ETag') ||
                                              '',
                                      })
                                    : undefined,
                        }),
                    )
                else
                    reject(
                        new Error(
                            `Upload failed - Status: ${xhr.status} (${xhr.statusText}). Details: ${xhr.responseText}`,
                        ),
                    )
            })

            xhr.addEventListener('error', () =>
                reject(
                    new Error(
                        `Network error during upload - Status: ${xhr.status} (${xhr.statusText})`,
                    ),
                ),
            )

            xhr.open('PUT', url)

            if (this.config.provider === UpupProvider.Azure)
                xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')

            // Add range header for resume functionality
            if (startByte > 0)
                xhr.setRequestHeader(
                    'Content-Range',
                    `bytes ${startByte}-${file.size - 1}/${file.size}`,
                )

            // Slice the file if resuming
            const fileSlice = startByte > 0 ? file.slice(startByte) : file
            xhr.send(fileSlice)

            // Handle abort
            if (signal)
                signal.addEventListener('abort', () => {
                    xhr.abort()
                    reject(new Error('AbortError'))
                })
        })
    }

    async upload(file: File, options = {} as UploadOptionsWithSignal) {
        try {
            this.lastOptions = options

            // Check if multiple files are allowed
            if (!this.config.constraints?.multiple && this.uploadCount > 0)
                throw new Error('Multiple file uploads are not allowed')

            options.onFileUploadStart?.(file)
            // Get presigned URL from backend
            const { uploadUrl, ...presignedDataRest } =
                await this.getPresignedUrl(file)

            // Increment upload count
            this.uploadCount++

            // Upload using presigned URL
            const uploadResponse = await this.uploadWithProgress(
                uploadUrl,
                file,
                options,
            )

            if (!uploadResponse.ok)
                throw new Error(
                    `Upload failed with status ${uploadResponse.status}`,
                )

            // Update status on completion
            this.activeUploads.get(file.name)!.status = UploadState.COMPLETED
            options.onFileUploadComplete?.(file, presignedDataRest)
            this.cleanup(file.name)

            return presignedDataRest
        } catch (error) {
            const activeUpload = this.activeUploads.get(file.name)
            const isPauseError =
                error instanceof Error && error.message === 'AbortError'
            if (isPauseError && !!activeUpload) {
                activeUpload.status = UploadState.PAUSED
                // Handle paused upload
                this.uploadedChunks[file.name] = this.uploadedChunks[
                    file.name
                ] || {
                    bytesUploaded: 0,
                    lastAttempt: Date.now(),
                    retryCount: 0,
                }

                return
            }

            activeUpload!.status = UploadState.FAILED

            const uploadError = this.handleError(error)
            options.onError?.(uploadError.message, file)
            return
        }
    }

    async uploadAll(files: File[], options = {} as UploadOptions) {
        this.lastOptions = options

        const results = await Promise.all(
            files.map(async file => {
                const controller = new AbortController()

                this.activeUploads.set(file.name, {
                    file,
                    controller,
                    status: UploadState.UPLOADING,
                })

                const result = await this.upload(file, {
                    ...options,
                    signal: controller.signal,
                })

                return result
            }),
        )

        return results.filter(item => item !== undefined)
    }

    private handleError(error: unknown) {
        // If it's already a structured UploadError, rethrow
        if (error instanceof UploadError) return error

        // Handle paused upload
        if (error instanceof Error && error.message === 'AbortError')
            return new UploadError(
                'Upload paused',
                UploadErrorType.UPLOAD_PAUSED_ERROR,
                true,
            )

        // If it's an error from the backend with a specific error code
        if (error instanceof Error && 'code' in error) {
            const errorCode = (error as any).code

            switch (errorCode) {
                // Permission and Authentication Errors
                case 'UNAUTHORIZED':
                case 'FORBIDDEN':
                case 'AUTHENTICATION_FAILED':
                    return new UploadError(
                        'Unauthorized access to Provider',
                        UploadErrorType.PERMISSION_ERROR,
                    )

                // URL and Credential Related Errors
                case 'URL_EXPIRED':
                case 'PRESIGNED_URL_INVALID':
                    return new UploadError(
                        'Presigned URL has expired or is invalid',
                        UploadErrorType.EXPIRED_URL,
                        true,
                    )

                case 'TEMPORARY_CREDENTIALS_INVALID':
                    return new UploadError(
                        'Temporary credentials are no longer valid',
                        UploadErrorType.TEMPORARY_CREDENTIALS_ERROR,
                        true,
                    )

                // CORS and Configuration Errors
                case 'CORS_MISCONFIGURED':
                case 'ORIGIN_NOT_ALLOWED':
                    return new UploadError(
                        'CORS configuration prevents file upload',
                        UploadErrorType.CORS_CONFIG_ERROR,
                    )

                // File Validation Errors
                case 'FILE_TOO_LARGE':
                    return new UploadError(
                        'File exceeds maximum size limit',
                        UploadErrorType.FILE_VALIDATION_ERROR,
                    )

                case 'INVALID_FILE_TYPE':
                    return new UploadError(
                        'File type is not allowed',
                        UploadErrorType.FILE_VALIDATION_ERROR,
                    )

                // Network and Infrastructure Errors
                case 'NETWORK_ERROR':
                case 'CONNECTION_TIMEOUT':
                    return new UploadError(
                        'Network error during upload',
                        UploadErrorType.UNKNOWN_UPLOAD_ERROR,
                        true,
                    )

                case 'STORAGE_QUOTA_EXCEEDED':
                    return new UploadError(
                        'Storage quota has been exceeded',
                        UploadErrorType.PERMISSION_ERROR,
                    )

                case 'SIGNED_URL_GENERATION_FAILED':
                    return new UploadError(
                        'Failed to generate signed upload URL',
                        UploadErrorType.SIGNED_URL_ERROR,
                        true,
                    )

                // Catch-all for any unhandled specific error codes
                default:
                    return new UploadError(
                        `Upload failed with specific error code: ${errorCode}`,
                        UploadErrorType.UNKNOWN_UPLOAD_ERROR,
                        true,
                    )
            }
        }

        // Fallback for errors without specific codes
        return new UploadError(
            `Upload failed: ${(error as Error).message}`,
            UploadErrorType.UNKNOWN_UPLOAD_ERROR,
            true,
        )
    }

    isPaused(fileName: string): boolean {
        return this.activeUploads.get(fileName)?.status === UploadState.PAUSED
    }

    pauseUpload(fileName: string) {
        const upload = this.activeUploads.get(fileName)
        if (!upload) return

        upload.controller.abort()
        upload.status = UploadState.PAUSED
    }

    pauseAllUploads() {
        // Pause(abort) all active uploads
        for (const [fileName] of this.activeUploads) this.pauseUpload(fileName)
    }

    resumeUpload(file: File) {
        const upload = this.activeUploads.get(file.name)
        if (upload) upload.status = UploadState.UPLOADING

        return this.uploadAll([file], this.lastOptions)
    }

    resumeAllUploads() {
        const pausedFiles: File[] = []

        // Collect all paused files
        for (const [_fileName, { file, status }] of this.activeUploads)
            if (status === UploadState.PAUSED) pausedFiles.push(file)

        // Resume all uploads
        return this.uploadAll(pausedFiles, this.lastOptions)
    }

    async retryFailedUpload(file: File) {
        const upload = this.activeUploads.get(file.name)
        if (upload) upload.status = UploadState.UPLOADING

        await this.uploadAll([file], this.lastOptions)

        this.uploadedChunks[file.name] = this.uploadedChunks[file.name]
            ? {
                  ...this.uploadedChunks[file.name],
                  retryCount: this.uploadedChunks[file.name].retryCount + 1,
              }
            : {
                  bytesUploaded: 0,
                  lastAttempt: Date.now(),
                  retryCount: 1,
              }
        if (this.uploadedChunks[file.name].retryCount >= this.MAX_RETRIES)
            this.cleanup(file.name)
    }

    retryAllFailedUploads() {
        const failedFiles: File[] = []

        // Collect all failed files
        for (const [_fileName, { file, status }] of this.activeUploads) {
            if (status === UploadState.FAILED) failedFiles.push(file)
        }

        return Promise.all(
            failedFiles.map(file => this.retryFailedUpload(file)),
        )
    }

    private cleanup(fileName: string) {
        // Use this method when:
        // 1. A single file upload completes successfully
        // 2. A single file upload fails permanently (not retryable)
        // 3. User manually cancels a single file upload
        this.activeUploads.delete(fileName)
        delete this.uploadedChunks[fileName]
    }

    public dispose() {
        // Use this method when:
        // 1. Component unmounts
        // 2. User navigates away from upload page
        // 3. Need to reset the uploader completely
        this.pauseAllUploads()
        this.activeUploads.clear()
        this.uploadedChunks = {}
        this.uploadCount = 0
    }
}