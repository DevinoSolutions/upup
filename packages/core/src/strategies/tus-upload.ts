import {
    UpupError,
    UpupErrorCode,
    UpupNetworkError,
    type ResumableUploadOptions,
    type UploadCredentials,
    type UploadResult,
    type UploadStrategy,
} from '../contracts'

type TusOptions = Extract<ResumableUploadOptions, { protocol: 'tus' }>

export class TusUpload implements UploadStrategy {
    constructor(private options: TusOptions) {}

    async upload(
        file: File | Blob,
        _credentials: UploadCredentials,
        options: {
            onProgress: (loaded: number, total: number) => void
            signal: AbortSignal
        },
    ): Promise<UploadResult> {
        let tus: typeof import('tus-js-client')
        try {
            tus = await import('tus-js-client')
        } catch {
            throw new UpupError(
                'Resumable (tus) uploads require the optional dependency "tus-js-client". Install it: npm i tus-js-client',
                UpupErrorCode.UPLOAD_FAILED,
            )
        }
        const fileName = file instanceof File ? file.name : 'blob'
        const fileType = file.type || 'application/octet-stream'

        return new Promise((resolve, reject) => {
            let settled = false
            let upload: InstanceType<typeof tus.Upload> | null = null

            const finishReject = (error: Error) => {
                if (settled) return
                settled = true
                reject(error)
            }

            const abortUpload = () => {
                upload?.abort().catch((error: unknown) => {
                    finishReject(
                        error instanceof Error
                            ? error
                            : new UpupNetworkError('Tus upload abort failed'),
                    )
                })
                finishReject(new UpupNetworkError('Upload aborted'))
            }

            if (options.signal.aborted) {
                finishReject(new UpupNetworkError('Upload aborted'))
                return
            }

            options.signal.addEventListener('abort', abortUpload, {
                once: true,
            })

            const uploadOptions: ConstructorParameters<typeof tus.Upload>[1] = {
                endpoint: this.options.endpoint,
                metadata: {
                    filename: fileName,
                    filetype: fileType,
                    ...this.options.metadata,
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    options.onProgress(bytesUploaded, bytesTotal)
                },
                onError: error => {
                    options.signal.removeEventListener('abort', abortUpload)
                    finishReject(
                        error instanceof Error
                            ? error
                            : new UpupNetworkError('Tus upload failed'),
                    )
                },
                onSuccess: () => {
                    if (settled) return
                    settled = true
                    options.signal.removeEventListener('abort', abortUpload)
                    resolve({
                        key: upload?.url ?? fileName,
                        publicUrl: upload?.url ?? undefined,
                    })
                },
            }

            // `chunkSize` is the deprecated alias of `chunkSizeBytes`; still honored
            // for backwards-compat.
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- v3 removal tracked
            const legacyChunkSize = this.options.chunkSize
            const chunkSize = this.options.chunkSizeBytes ?? legacyChunkSize
            if (this.options.headers !== undefined)
                uploadOptions.headers = this.options.headers
            if (chunkSize !== undefined) uploadOptions.chunkSize = chunkSize
            if (this.options.retryDelays !== undefined)
                uploadOptions.retryDelays = this.options.retryDelays
            if (this.options.storeFingerprintForResuming !== undefined) {
                uploadOptions.storeFingerprintForResuming =
                    this.options.storeFingerprintForResuming
            }
            if (this.options.removeFingerprintOnSuccess !== undefined) {
                uploadOptions.removeFingerprintOnSuccess =
                    this.options.removeFingerprintOnSuccess
            }
            if (this.options.parallelUploads !== undefined)
                uploadOptions.parallelUploads = this.options.parallelUploads

            upload = new tus.Upload(file, uploadOptions)

            upload.start()
        })
    }
}
