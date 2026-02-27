import { en_US, mergeTranslations, t } from '../../../shared/i18n'
import type { Translations } from '../../../shared/i18n/types'
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
    translations?: Partial<Translations>
}

export class ProviderSDK implements StorageSDK {
    private readonly config: UploadConfig
    private readonly translations: Translations
    private uploadCount = 0

    constructor(config: UploadConfig) {
        this.config = config
        this.translations = mergeTranslations(en_US, config.translations)
        this.validateConfig()
        this.uploadCount = 0
    }

    async upload(
        file: FileWithParams,
        options = {} as UploadOptions,
    ): Promise<UploadResult> {
        try {
            if (!this.config.constraints?.multiple && this.uploadCount > 0)
                throw new UploadError(
                    this.translations.multipleFilesNotAllowed,
                    UploadErrorType.FILE_VALIDATION_ERROR,
                )

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
            if (options.sendEvent) {
                options.onFileUploadComplete?.(file, presignedData.key)
            }
            file.key = presignedData.key
            if (file.thumbnail?.file) {
                const thumbnailPresignedData = await this.getPresignedUrl(
                    file.thumbnail.file,
                    true,
                )
                const thumbnailUploadResponse = await this.uploadWithProgress(
                    thumbnailPresignedData.uploadUrl,
                    file.thumbnail.file,
                    options,
                    true,
                )
                if (!thumbnailUploadResponse.ok) {
                    throw new Error(`status ${thumbnailUploadResponse.status}`)
                }
                file.thumbnail.key = thumbnailPresignedData.key
            }
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
        file: FileWithParams | File,
        isThumbnail?: boolean,
    ): Promise<PresignedUrlResponse> {
        const requestBody = {
            name: file.name,
            type: file.type,
            size: file.size,
            isThumbnail: isThumbnail,
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
            throw new UploadError(
                errorData.details || this.translations.failedToGetUploadUrl,
                UploadErrorType.PRESIGNED_URL_ERROR,
            )
        }

        const data = await response.json()

        return data
    }

    private async uploadWithProgress(
        url: string,
        file: FileWithParams | File,
        { onFileUploadProgress, onFilesUploadProgress }: UploadOptions,
        isThumbnail?: boolean,
    ): Promise<Response> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()

            xhr.upload.addEventListener('progress', event => {
                if (
                    event.lengthComputable &&
                    onFileUploadProgress &&
                    !isThumbnail
                ) {
                    onFileUploadProgress(file as FileWithParams, {
                        loaded: event.loaded,
                        total: event.total,
                        percentage: (event.loaded / event.total) * 100,
                    })
                }
                if (
                    event.lengthComputable &&
                    onFilesUploadProgress &&
                    !isThumbnail
                ) {
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
                        new UploadError(
                            t(this.translations.statusError, {
                                status: String(xhr.status),
                                statusText: xhr.statusText ?? '',
                                details: xhr.responseText ?? '',
                            }),
                            UploadErrorType.UNKNOWN_UPLOAD_ERROR,
                        ),
                    )
                }
            })

            xhr.addEventListener('error', () =>
                reject(
                    new UploadError(
                        t(this.translations.networkErrorDuringUpload, {
                            status: String(xhr.status),
                            statusText: xhr.statusText ?? '',
                        }),
                        UploadErrorType.UNKNOWN_UPLOAD_ERROR,
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
                t(this.translations.missingRequiredConfiguration, {
                    missing: missing.join(', '),
                }),
                UploadErrorType.FILE_VALIDATION_ERROR,
            )
        }

        // Validate provider enum
        if (!Object.values(UpupProvider).includes(this.config.provider)) {
            throw new UploadError(
                t(this.translations.invalidProvider, {
                    provider: String(this.config.provider),
                    validOptions: Object.values(UpupProvider).join(', '),
                }),
                UploadErrorType.CORS_CONFIG_ERROR,
            )
        }

        // Validate tokenEndpoint format
        try {
            new URL(this.config.tokenEndpoint)
        } catch (e) {
            throw new UploadError(
                t(this.translations.invalidTokenEndpoint, {
                    tokenEndpoint: String(this.config.tokenEndpoint),
                    error: String(e),
                }),
                UploadErrorType.CORS_CONFIG_ERROR,
            )
        }

        // Validate constraints if present
        if (this.config.constraints) {
            const { maxFileSize, accept } = this.config.constraints

            if (maxFileSize !== undefined && maxFileSize <= 0) {
                throw new UploadError(
                    this.translations.maxFileSizeMustBeGreater,
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
                    t(this.translations.invalidAcceptFormat, {
                        accept: String(accept),
                    }),
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
                        this.translations.unauthorizedAccess,
                        UploadErrorType.PERMISSION_ERROR,
                    )

                // URL and Credential Related Errors
                case 'URL_EXPIRED':
                case 'PRESIGNED_URL_INVALID':
                    throw new UploadError(
                        this.translations.presignedUrlInvalid,
                        UploadErrorType.EXPIRED_URL,
                        true,
                    )

                case 'TEMPORARY_CREDENTIALS_INVALID':
                    throw new UploadError(
                        this.translations.temporaryCredentialsInvalid,
                        UploadErrorType.TEMPORARY_CREDENTIALS_ERROR,
                        true,
                    )

                // CORS and Configuration Errors
                case 'CORS_MISCONFIGURED':
                case 'ORIGIN_NOT_ALLOWED':
                    throw new UploadError(
                        this.translations.corsMisconfigured,
                        UploadErrorType.CORS_CONFIG_ERROR,
                    )

                // File Validation Errors
                case 'FILE_TOO_LARGE':
                    throw new UploadError(
                        this.translations.fileTooLarge,
                        UploadErrorType.FILE_VALIDATION_ERROR,
                    )

                case 'INVALID_FILE_TYPE':
                    throw new UploadError(
                        this.translations.invalidFileType,
                        UploadErrorType.FILE_VALIDATION_ERROR,
                    )

                // Network and Infrastructure Errors
                case 'NETWORK_ERROR':
                case 'CONNECTION_TIMEOUT':
                    throw new UploadError(
                        this.translations.networkErrorDuringUpload,
                        UploadErrorType.UNKNOWN_UPLOAD_ERROR,
                        true,
                    )

                case 'STORAGE_QUOTA_EXCEEDED':
                    throw new UploadError(
                        this.translations.storageQuotaExceeded,
                        UploadErrorType.PERMISSION_ERROR,
                    )

                case 'SIGNED_URL_GENERATION_FAILED':
                    throw new UploadError(
                        this.translations.signedUrlGenerationFailed,
                        UploadErrorType.SIGNED_URL_ERROR,
                        true,
                    )

                // Catch-all for any unhandled specific error codes
                default:
                    throw new UploadError(
                        t(this.translations.uploadFailedWithCode, {
                            code: String(errorCode),
                        }),
                        UploadErrorType.UNKNOWN_UPLOAD_ERROR,
                        true,
                    )
            }
        }

        // Fallback for errors without specific codes
        throw new UploadError(
            t(this.translations.uploadFailed, {
                message: (error as Error).message,
            }),
            UploadErrorType.UNKNOWN_UPLOAD_ERROR,
            true,
        )
    }
}
