import {
    StorageConfig,
    StorageSDK,
    UploadError,
    UploadErrorType,
    UploadOptions,
    UploadProgress,
    UploadResult,
} from '../../../types/StorageSDK'

type UploadConfig = StorageConfig & {
    constraints?: {
        multiple: boolean
        accept: string
        maxFileSize?: number
    }
}

export class S3SDK implements StorageSDK {
    private config: UploadConfig
    private uploadCount = 0

    constructor(config: UploadConfig) {
        this.config = config
        this.validateConfig()
        this.uploadCount = 0
    }

    async upload(
        file: File,
        options = {} as UploadOptions,
    ): Promise<UploadResult> {
        try {
            console.log('Uploading file:', file.name, this.config.constraints)
            // Check if multiple files are allowed
            if (!this.config.constraints?.multiple && this.uploadCount > 0)
                throw new Error('Multiple file uploads are not allowed')

            // Get presigned URL from backend
            const presignedData = await this.getPresignedUrl(file)

            // Increment upload count
            this.uploadCount++

            // Upload using presigned URL
            const uploadResponse = await this.uploadWithProgress(
                presignedData.uploadUrl,
                file,
                options.onProgress,
            )

            if (!uploadResponse.ok)
                throw new Error(
                    `Upload failed with status ${uploadResponse.status}`,
                )

            return {
                key: presignedData.key,
                location: presignedData.publicUrl,
                httpStatus: uploadResponse.status,
            }
        } catch (error) {
            console.error('Upload error:', error)
            throw this.handleError(error)
        }
    }

    private async getPresignedUrl(file: File) {
        try {
            const requestBody = {
                name: file.name,
                type: file.type,
                size: file.size,
                ...this.config.constraints,
            }

            console.log('Requesting presigned URL:', {
                ...requestBody,
                fileSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
            })

            const response = await fetch(this.config.tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('Presigned URL request failed:', {
                    status: response.status,
                    error: errorData,
                })
                throw new Error(errorData.details || 'Failed to get upload URL')
            }

            const data = await response.json()
            console.log('Received presigned URL data:', data, {
                key: data.key,
                expiresIn: data.expiresIn,
            })

            return data
        } catch (error) {
            console.error('Error getting presigned URL:', error)
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
            xhr.send(file)
        })
    }

    validateConfig(): boolean {
        const required = ['tokenEndpoint'] as const
        const missing = required.filter(key => !this.config[key])

        if (missing.length > 0)
            throw new Error(
                `Missing required configuration: ${missing.join(', ')}`,
            )

        return true
    }

    private handleError(error: unknown): never {
        if (error instanceof UploadError) throw error

        const err = error as Error
        if (err.message.includes('unauthorized'))
            throw new UploadError(
                'Unauthorized access to S3 Provider',
                UploadErrorType.PERMISSION_ERROR,
            )

        if (err.message.includes('expired'))
            throw new UploadError(
                'Presigned URL has expired',
                UploadErrorType.EXPIRED_URL,
                true,
            )

        throw new UploadError(
            `Upload failed: ${err.message}`,
            UploadErrorType.UNKNOWN_UPLOAD_ERROR,
            true,
        )
    }
}
