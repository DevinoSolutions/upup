import {
    StorageConfig,
    StorageSDK,
    UploadError,
    UploadErrorType,
    UploadOptions,
    UploadProgress,
    UploadResult,
} from '../../../types/StorageSDK'

interface DigitalOceanUploadResponse extends UploadResult {
    eTag?: string
}

type UploadConfig = StorageConfig & {
    constraints?: {
        multiple: boolean
        accept: string
        maxFileSize?: number
    }
}

export class DigitalOceanSDK implements StorageSDK {
    private config: UploadConfig
    private uploadCount = 0

    constructor(config: UploadConfig) {
        this.config = config
        this.validateConfig()
        this.uploadCount = 0
    }

    async upload(
        file: File,
        options?: UploadOptions,
    ): Promise<DigitalOceanUploadResponse> {
        try {
            if (!this.config.constraints?.multiple && this.uploadCount > 0) {
                throw new Error('Multiple file uploads are not allowed')
            }

            const presignedData = await this.getPresignedUrl(file)
            this.uploadCount++

            const uploadResponse = await this.uploadWithProgress(
                presignedData.uploadUrl,
                file,
                options?.onProgress,
            )

            if (!uploadResponse.ok) {
                throw new Error(
                    `Upload failed with status ${uploadResponse.status}`,
                )
            }

            return {
                key: presignedData.key,
                location: presignedData.publicUrl,
                httpStatus: uploadResponse.status,
                eTag: uploadResponse.headers.get('ETag') || '',
            }
        } catch (error) {
            console.error('Upload error:', error)
            throw this.handleError(error)
        }
    }

    private async getPresignedUrl(file: File) {
        try {
            const requestBody = {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                constraints: this.config.constraints,
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

            return await response.json()
        } catch (error) {
            console.error('Error getting DigitalOcean presigned URL:', error)
            throw error
        }
    }

    private async uploadWithProgress(
        url: string,
        file: File,
        onProgress?: (progress: UploadProgress) => void,
    ): Promise<Response> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()

            xhr.upload.addEventListener('progress', event => {
                if (event.lengthComputable && onProgress) {
                    onProgress({
                        loaded: event.loaded,
                        total: event.total,
                        percentage: (event.loaded / event.total) * 100,
                    })
                }
            })

            xhr.addEventListener('load', () => {
                const isValidStatus = xhr.status >= 200 && xhr.status < 300
                if (isValidStatus) {
                    resolve(
                        new Response(xhr.response, {
                            status: xhr.status,
                            headers: new Headers({
                                ETag: xhr.getResponseHeader('ETag') || '',
                            }),
                        }),
                    )
                } else {
                    reject(
                        new Error(
                            `Upload failed with status ${xhr.status}: ${xhr.responseText}`,
                        ),
                    )
                }
            })

            xhr.addEventListener('error', () =>
                reject(new Error('Network error during upload')),
            )

            xhr.open('PUT', url)
            xhr.setRequestHeader('Content-Type', file.type)
            xhr.send(file)
        })
    }

    validateConfig(): boolean {
        const required = ['tokenEndpoint'] as const
        const missing = required.filter(key => !this.config[key])

        if (missing.length > 0) {
            throw new Error(
                `Missing required configuration: ${missing.join(', ')}`,
            )
        }

        return true
    }

    private handleError(error: unknown): never {
        if (error instanceof UploadError) throw error

        const err = error as Error
        if (err.message?.includes('unauthorized')) {
            throw new UploadError(
                UploadErrorType.PERMISSION_ERROR,
                'Unauthorized access to DigitalOcean Space',
                false,
            )
        }
        if (err.message?.includes('expired')) {
            throw new UploadError(
                UploadErrorType.EXPIRED_URL,
                'Presigned URL has expired',
                true,
            )
        }

        throw new UploadError(
            UploadErrorType.UNKNOWN_ERROR,
            `Upload failed: ${err.message}`,
            true,
        )
    }
}
