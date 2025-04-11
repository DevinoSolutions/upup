import {
    FileWithParams,
    PresignedUrlResponse,
    UploadError,
    UploadErrorType,
    UpupProvider,
    UpupUploaderProps,
} from '../../../shared/types'
import { StorageSDK, UploadOptions, UploadResult } from '../../types/StorageSDK'

type UploadConfig = Pick<
    UpupUploaderProps,
    'provider' | 'tokenEndpoint' | 'customProps'
> & {
    constraints?: {
        multiple: boolean
        accept: string
        maxFileSize?: number
    }
    enableAutoCorsConfig: boolean
}

export class ProviderSDK implements StorageSDK {
    private readonly config: UploadConfig
    private uploadCount = 0

    constructor(config: UploadConfig) {
        this.config = config
        this.validateConfig()
        this.uploadCount = 0
    }

    async upload(
        file: FileWithParams,
        options = {} as UploadOptions,
    ): Promise<UploadResult> {
        try {
            // Check if multiple files are allowed
            if (!this.config.constraints?.multiple && this.uploadCount > 0)
                throw new Error('Multiple file uploads are not allowed')

            options.onFileUploadStart?.(file)
            // Get presigned URL from backend
            const presignedData = await this.getPresignedUrl(file)

            // Increment upload count
            this.uploadCount++

            // Upload using presigned URL
            const uploadResponse = await this.uploadWithProgress(
                presignedData.uploadUrl,
                file,
                options,
            )

            if (!uploadResponse.ok)
                throw new Error(`status ${uploadResponse.status}`)
            if (options.sendEvent)
                options.onFileUploadComplete?.(file, presignedData.key)
            file.key = presignedData.key
            return {
                key: presignedData.key,
                file,
                httpStatus: uploadResponse.status,
            }
        } catch (error) {
            throw this.handleError(error)
        }
    }

    private async getPresignedUrl(
        file: FileWithParams,
    ): Promise<PresignedUrlResponse> {
        const requestBody = {
            name: file.name,
            type: file.type,
            size: file.size,
            provider: this.config.provider,
            customProps: this.config.customProps,
            enableAutoCorsConfig: this.config.enableAutoCorsConfig,
            ...this.config.constraints,
        }

        const response = await fetch(this.config.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.details || 'Failed to get upload URL')
        }

        const data = await response.json()

        return data
    }

    private async uploadWithProgress(
        url: string,
        file: FileWithParams,
        { onFileUploadProgress, onFilesUploadProgress }: UploadOptions,
    ): Promise<Response> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()

            xhr.upload.addEventListener('progress', event => {
                if (event.lengthComputable && onFileUploadProgress) {
                    onFileUploadProgress(file, {
                        loaded: event.loaded,
                        total: event.total,
                        percentage: (event.loaded / event.total) * 100,
                    })
                }
                if (event.lengthComputable && onFilesUploadProgress) {
                    onFilesUploadProgress(this.uploadCount)
                }
            })

            xhr.addEventListener('load', () => {
                const isValidStatus = xhr.status >= 200 && xhr.status < 300

                if (isValidStatus) {
                    resolve(
                        new Response(xhr.response, {
                            status: xhr.status,
                            headers:
                                this.config.provider !== UpupProvider.Azure
                                    ? new Headers({
                                          ETag:
                                              xhr.getResponseHeader('ETag') ??
                                              '',
                                      })
                                    : undefined,
                        }),
                    )
                } else {
                    reject(
                        new Error(
                            `Status: ${xhr.status} (${xhr.statusText}). Details: ${xhr.responseText}`,
                        ),
                    )
                }
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
            xhr.send(file)
        })
    }

    validateConfig(): boolean {
        const required = ['tokenEndpoint', 'provider'] as const
        const missing = required.filter(key => !this.config[key])

        // Validate required fields
        if (missing.length > 0) {
            throw new UploadError(
                `Missing required configuration: ${missing.join(', ')}`,
                UploadErrorType.FILE_VALIDATION_ERROR,
            )
        }

        // Validate provider enum
        if (!Object.values(UpupProvider).includes(this.config.provider)) {
            throw new UploadError(
                `Invalid provider: ${
                    this.config.provider
                }. Valid options: ${Object.values(UpupProvider).join(', ')}`,
                UploadErrorType.CORS_CONFIG_ERROR,
            )
        }

        // Validate tokenEndpoint format
        try {
            new URL(this.config.tokenEndpoint)
        } catch (e) {
            throw new UploadError(
                `Invalid tokenEndpoint URL: ${this.config.tokenEndpoint}` + e,
                UploadErrorType.CORS_CONFIG_ERROR,
            )
        }

        // Validate constraints if present
        if (this.config.constraints) {
            const { maxFileSize, accept } = this.config.constraints

            if (maxFileSize !== undefined && maxFileSize <= 0) {
                throw new UploadError(
                    `maxFileSize must be greater than 0`,
                    UploadErrorType.FILE_VALIDATION_ERROR,
                )
            }

            if (
                accept &&
                !/^(\*\/\*|\*|[\w-]+\/(?:[\w+.-]+|\*)|\.[\w+.-]+)(,\s*(\*\/\*|\*|[\w-]+\/(?:[\w+.-]+|\*)|\.[\w+.-]+))*$/.test(
                    accept,
                )
            ) {
                throw new UploadError(
                    `Invalid accept format: ${accept}. Use MIME types, */*, * or extensions (like .fbx)`,
                    UploadErrorType.FILE_VALIDATION_ERROR,
                )
            }
        }

        return true
    }

    private handleError(error: unknown): never {
        // If it's already a structured UploadError, rethrow
        if (error instanceof UploadError) throw error

        // If it's an error from the backend with a specific error code
        if (error instanceof Error && 'code' in error) {
            const errorCode = (error as any).code
            switch (errorCode) {
                // Permission and Authentication Errors
                case 'UNAUTHORIZED':
                case 'FORBIDDEN':
                case 'AUTHENTICATION_FAILED':
                    throw new UploadError(
                        'Unauthorized access to Provider',
                        UploadErrorType.PERMISSION_ERROR,
                    )

                // URL and Credential Related Errors
                case 'URL_EXPIRED':
                case 'PRESIGNED_URL_INVALID':
                    throw new UploadError(
                        'Presigned URL has expired or is invalid',
                        UploadErrorType.EXPIRED_URL,
                        true,
                    )

                case 'TEMPORARY_CREDENTIALS_INVALID':
                    throw new UploadError(
                        'Temporary credentials are no longer valid',
                        UploadErrorType.TEMPORARY_CREDENTIALS_ERROR,
                        true,
                    )

                // CORS and Configuration Errors
                case 'CORS_MISCONFIGURED':
                case 'ORIGIN_NOT_ALLOWED':
                    throw new UploadError(
                        'CORS configuration prevents file upload',
                        UploadErrorType.CORS_CONFIG_ERROR,
                    )

                // File Validation Errors
                case 'FILE_TOO_LARGE':
                    throw new UploadError(
                        'File exceeds maximum size limit',
                        UploadErrorType.FILE_VALIDATION_ERROR,
                    )

                case 'INVALID_FILE_TYPE':
                    throw new UploadError(
                        'File type is not allowed',
                        UploadErrorType.FILE_VALIDATION_ERROR,
                    )

                // Network and Infrastructure Errors
                case 'NETWORK_ERROR':
                case 'CONNECTION_TIMEOUT':
                    throw new UploadError(
                        'Network error during upload',
                        UploadErrorType.UNKNOWN_UPLOAD_ERROR,
                        true,
                    )

                case 'STORAGE_QUOTA_EXCEEDED':
                    throw new UploadError(
                        'Storage quota has been exceeded',
                        UploadErrorType.PERMISSION_ERROR,
                    )

                case 'SIGNED_URL_GENERATION_FAILED':
                    throw new UploadError(
                        'Failed to generate signed upload URL',
                        UploadErrorType.SIGNED_URL_ERROR,
                        true,
                    )

                // Catch-all for any unhandled specific error codes
                default:
                    throw new UploadError(
                        `Upload failed with error code: ${errorCode}`,
                        UploadErrorType.UNKNOWN_UPLOAD_ERROR,
                        true,
                    )
            }
        }

        // Fallback for errors without specific codes
        throw new UploadError(
            `Upload failed: ${(error as Error).message}`,
            UploadErrorType.UNKNOWN_UPLOAD_ERROR,
            true,
        )
    }
}
