import { en_US, mergeTranslations, t } from '../../../shared/i18n'
import type { Translations } from '../../../shared/i18n/types'
import {
    FileWithParams,
    MultipartCompleteResponse,
    MultipartInitResponse,
    MultipartListPartsResponse,
    MultipartPart,
    MultipartSignPartResponse,
    PresignedUrlResponse,
    ResumableUploadOptions,
    UploadError,
    UploadErrorType,
    UpupProvider,
    UpupUploaderProps,
} from '../../../shared/types'
import { StorageSDK, UploadOptions, UploadResult } from '../../types/StorageSDK'
import {
    fileFingerprint,
    loadSession,
    removeSession,
    saveSession,
    updateSessionProgress,
} from '../resumable/multipartSessionStore'

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
    resumable?: ResumableUploadOptions
    translations?: Partial<Translations>
}

export class ProviderSDK implements StorageSDK {
    private readonly config: UploadConfig
    private readonly translations: Translations
    private uploadCount = 0
    private currentXhr: XMLHttpRequest | null = null
    private _paused = false
    private _pauseResolve: (() => void) | null = null
    private _pausePromise: Promise<void> | null = null

    constructor(config: UploadConfig) {
        this.config = config
        this.translations = mergeTranslations(en_US, config.translations)
        this.validateConfig()
        this.uploadCount = 0
    }

    /**
     * Determine whether to use multipart upload.
     * Multipart is used when resumable.mode === 'multipart' AND provider is not Azure.
     */
    private shouldUseMultipart(): boolean {
        return (
            this.config.resumable?.mode === 'multipart' &&
            this.config.provider !== UpupProvider.Azure
        )
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

            if (this.shouldUseMultipart()) {
                return await this.multipartUpload(file, options)
            }
            return await this.singleUpload(file, options)
        } catch (error) {
            throw this.handleError(error)
        }
    }

    /**
     * Abort any in-flight XHR request.
     */
    abort(): void {
        if (this.currentXhr) {
            this.currentXhr.abort()
            this.currentXhr = null
        }
    }

    /**
     * Pause multipart upload — blocks between parts without aborting the current XHR.
     */
    pause(): void {
        if (this._paused) return
        this._paused = true
        this._pausePromise = new Promise<void>(resolve => {
            this._pauseResolve = resolve
        })
    }

    /**
     * Resume a paused multipart upload.
     */
    resume(): void {
        if (!this._paused) return
        this._paused = false
        this._pauseResolve?.()
        this._pauseResolve = null
        this._pausePromise = null
    }

    get isPaused(): boolean {
        return this._paused
    }

    /**
     * Abort multipart upload on the server and clear session.
     */
    async abortMultipart(file: FileWithParams): Promise<void> {
        const fingerprint = fileFingerprint(file)
        const session = loadSession(fingerprint)
        if (!session) return

        try {
            await this.tokenEndpointRequest({
                action: 'multipart:abort',
                provider: this.config.provider,
                key: session.key,
                uploadId: session.uploadId,
            })
        } catch {
            // Best-effort abort
        }
        removeSession(fingerprint)
    }

    // ─── Single PUT upload (existing behavior) ───────────────────────

    private async singleUpload(
        file: FileWithParams,
        options: UploadOptions,
    ): Promise<UploadResult> {
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
    }

    // ─── Multipart resumable upload ──────────────────────────────────

    private async multipartUpload(
        file: FileWithParams,
        options: UploadOptions,
    ): Promise<UploadResult> {
        const fingerprint = fileFingerprint(file)
        const persist =
            this.config.resumable?.mode === 'multipart' &&
            (this.config.resumable.persist ?? true)

        let key: string
        let uploadId: string
        let partSize: number
        let existingParts: MultipartPart[] = []
        let needsInit = true

        // Step 1: Check for existing session (resume) or init new
        const existingSession = persist ? loadSession(fingerprint) : null

        if (existingSession) {
            key = existingSession.key
            uploadId = existingSession.uploadId
            partSize = existingSession.partSize

            // Get already-uploaded parts from S3 — fall back to fresh init on stale session
            try {
                const listResponse =
                    await this.tokenEndpointRequest<MultipartListPartsResponse>(
                        {
                            action: 'multipart:listParts',
                            provider: this.config.provider,
                            key,
                            uploadId,
                        },
                    )
                existingParts = listResponse.parts
                needsInit = false
            } catch {
                // Session is stale (upload ID expired / deleted) — remove and start fresh
                console.warn(
                    'Existing multipart session is stale, starting fresh upload',
                )
                removeSession(fingerprint)
            }
        }

        if (needsInit) {
            const chunkSizeBytes =
                this.config.resumable?.mode === 'multipart'
                    ? this.config.resumable.chunkSizeBytes
                    : undefined

            const initResponse =
                await this.tokenEndpointRequest<MultipartInitResponse>({
                    action: 'multipart:init',
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    provider: this.config.provider,
                    customProps: this.config.customProps,
                    enableAutoCorsConfig: this.config.enableAutoCorsConfig,
                    ...this.config.constraints,
                    chunkSizeBytes,
                })

            key = initResponse.key
            uploadId = initResponse.uploadId
            partSize = initResponse.partSize

            if (persist) {
                saveSession(fingerprint, {
                    provider: this.config.provider,
                    key,
                    uploadId,
                    partSize,
                    updatedAt: Date.now(),
                    uploadedBytes: 0,
                })
            }
        }

        // Step 2: Compute parts and upload missing ones
        const totalParts = Math.ceil(file.size / partSize)
        const uploadedPartNumbers = new Set(
            existingParts.map(p => p.partNumber),
        )
        const uploadedBytes = existingParts.reduce((sum, p) => {
            const start = (p.partNumber - 1) * partSize
            const end = Math.min(start + partSize, file.size)
            return sum + (end - start)
        }, 0)

        let bytesUploaded = uploadedBytes

        this.uploadCount++

        // Fire initial progress for resumed uploads so UI immediately shows the resume point
        if (uploadedBytes > 0 && options.onFileUploadProgress) {
            options.onFileUploadProgress(file, {
                loaded: uploadedBytes,
                total: file.size,
                percentage: (uploadedBytes / file.size) * 100,
            })
        }

        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
            if (uploadedPartNumbers.has(partNumber)) continue

            // If paused, wait until resumed
            if (this._paused && this._pausePromise) {
                await this._pausePromise
            }

            const start = (partNumber - 1) * partSize
            const end = Math.min(start + partSize, file.size)
            const partBlob = file.slice(start, end)

            // Get presigned URL for this part
            const signResponse =
                await this.tokenEndpointRequest<MultipartSignPartResponse>({
                    action: 'multipart:signPart',
                    provider: this.config.provider,
                    key,
                    uploadId,
                    partNumber,
                    contentLength: partBlob.size,
                })

            // Upload part with progress tracking
            const partResponse = await this.uploadPartWithProgress(
                signResponse.uploadUrl,
                partBlob,
                file,
                options,
                bytesUploaded,
                file.size,
            )

            if (!partResponse.ok) {
                throw new Error(
                    `Part ${partNumber} upload failed with status ${partResponse.status}`,
                )
            }

            bytesUploaded += partBlob.size

            // Update session with progress so resume after refresh starts from here
            if (persist) {
                updateSessionProgress(fingerprint, bytesUploaded)
            }
        }

        // Step 3: List parts (canonical ETags from S3) and complete
        const finalListResponse =
            await this.tokenEndpointRequest<MultipartListPartsResponse>({
                action: 'multipart:listParts',
                provider: this.config.provider,
                key,
                uploadId,
            })

        const completeResponse =
            await this.tokenEndpointRequest<MultipartCompleteResponse>({
                action: 'multipart:complete',
                provider: this.config.provider,
                key,
                uploadId,
                parts: finalListResponse.parts,
            })

        // Step 4: Cleanup session
        removeSession(fingerprint)

        if (options.sendEvent) {
            options.onFileUploadComplete?.(file, completeResponse.key)
        }

        file.key = completeResponse.key

        // Thumbnails use single PUT (no multipart)
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
            key: completeResponse.key,
            file,
            httpStatus: 200,
        }
    }

    /**
     * Upload a single part via XHR PUT, tracking progress relative to the full file.
     */
    private uploadPartWithProgress(
        url: string,
        partBlob: Blob,
        file: FileWithParams,
        { onFileUploadProgress, onFilesUploadProgress }: UploadOptions,
        previouslyUploadedBytes: number,
        totalFileSize: number,
    ): Promise<Response> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            this.currentXhr = xhr

            xhr.upload.addEventListener('progress', event => {
                if (event.lengthComputable && onFileUploadProgress) {
                    const loaded = previouslyUploadedBytes + event.loaded
                    onFileUploadProgress(file, {
                        loaded,
                        total: totalFileSize,
                        percentage: (loaded / totalFileSize) * 100,
                    })
                }
                if (event.lengthComputable && onFilesUploadProgress) {
                    onFilesUploadProgress(this.uploadCount)
                }
            })

            xhr.addEventListener('load', () => {
                this.currentXhr = null
                const isValidStatus = xhr.status >= 200 && xhr.status < 300
                if (isValidStatus) {
                    resolve(
                        new Response(xhr.response, {
                            status: xhr.status,
                            headers: new Headers({
                                ETag: xhr.getResponseHeader('ETag') ?? '',
                            }),
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

            xhr.addEventListener('error', () => {
                this.currentXhr = null
                reject(
                    new Error(
                        `Network error during part upload - Status: ${xhr.status} (${xhr.statusText})`,
                    ),
                )
            })

            xhr.open('PUT', url)
            xhr.send(partBlob)
        })
    }

    // ─── Common helpers ──────────────────────────────────────────────

    /**
     * Generic request to tokenEndpoint with an action field.
     */
    private async tokenEndpointRequest<T>(
        body: Record<string, unknown>,
    ): Promise<T> {
        const response = await fetch(this.config.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(
                errorData.details || `Token endpoint error: ${response.status}`,
            )
        }

        return response.json()
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

        // Validate resumable config
        if (this.config.resumable?.mode === 'tus') {
            throw new UploadError(
                'Tus resumable uploads are not yet supported. Use mode: "multipart".',
                UploadErrorType.FILE_VALIDATION_ERROR,
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
