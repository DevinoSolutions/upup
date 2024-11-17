import {
    StorageConfig,
    StorageSDK,
    UploadError,
    UploadErrorType,
    UploadOptions,
    UploadProgress,
    UploadResult,
} from '../../../types/StorageSDK'

interface AzureUploadResponse extends UploadResult {
    contentMD5?: string
    lastModified?: string
    sasUrl?: string
}

type UploadConfig = StorageConfig & {
    constraints?: {
        multiple: boolean
        accept: string
        maxFileSize?: number
    }
}

export class AzureSDK implements StorageSDK {
    private config: UploadConfig
    private uploadCount = 0

    constructor(config: UploadConfig) {
        this.config = config
        this.validateConfig()
        this.uploadCount = 0
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

    async upload(
        file: File,
        options?: UploadOptions,
    ): Promise<AzureUploadResponse> {
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
                options?.onProgress,
            )

            if (!uploadResponse.ok)
                throw new Error(
                    `Upload failed with status ${uploadResponse.status}`,
                )

            return {
                key: presignedData.key,
                location: presignedData.publicUrl,
                httpStatus: uploadResponse.status,
                sasUrl: presignedData.uploadUrl,
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

            console.log('Requesting Azure SAS URL:', {
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
                console.error('SAS URL request failed:', {
                    status: response.status,
                    error: errorData,
                })
                throw new Error(errorData.details || 'Failed to get upload URL')
            }

            const data = await response.json()
            console.log('Received Azure SAS URL data:', {
                key: data.key,
                requestId: data.requestId,
                expiresIn: data.expiresIn,
            })

            return data
        } catch (error) {
            console.error('Error getting Azure SAS URL:', error)
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
                            statusText: xhr.statusText,
                            headers: new Headers({
                                'Content-Type': file.type,
                                'x-ms-blob-type': 'BlockBlob',
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
            xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
            xhr.setRequestHeader('Content-Type', file.type)
            xhr.setRequestHeader('x-ms-version', '2024-11-04')
            xhr.send(file)
        })
    }

    private handleError(error: unknown): never {
        if (error instanceof UploadError) throw error

        const err = error as Error
        if (err.message?.includes('unauthorized')) {
            throw new UploadError(
                UploadErrorType.PERMISSION_ERROR,
                'Unauthorized access to Azure Storage',
                false,
            )
        }
        if (err.message?.includes('expired')) {
            throw new UploadError(
                UploadErrorType.EXPIRED_URL,
                'Azure SAS token has expired',
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
