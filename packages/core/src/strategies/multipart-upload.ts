import {
    UpupNetworkError,
    UpupConfigError,
    uploadErrorFromResponse,
    type UploadStrategy,
    type UploadCredentials,
    type UploadResult,
    type CredentialStrategy,
    type MultipartPart,
} from '../contracts'

export interface MultipartUploadOptions {
    credentials: CredentialStrategy
    chunkSizeBytes?: number | undefined
    maxConcurrentParts?: number | undefined
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5 MiB
const DEFAULT_MAX_CONCURRENT = 3

/** Reads a live AbortSignal through a call boundary so a repeat check after an
 *  `await` isn't (incorrectly) narrowed away as "always false" by TS — `.aborted`
 *  is `readonly`, but its value can genuinely change while we're awaiting. */
function isAborted(signal: AbortSignal): boolean {
    return signal.aborted
}

export class MultipartUpload implements UploadStrategy {
    private credentials: CredentialStrategy
    private initMultipartUpload: NonNullable<
        CredentialStrategy['initMultipartUpload']
    >
    private signPart: NonNullable<CredentialStrategy['signPart']>
    private completeMultipartUpload: NonNullable<
        CredentialStrategy['completeMultipartUpload']
    >
    private chunkSizeBytes: number
    private maxConcurrentParts: number

    constructor(options: MultipartUploadOptions) {
        const { credentials } = options
        if (
            !credentials.initMultipartUpload ||
            !credentials.signPart ||
            !credentials.completeMultipartUpload
        ) {
            throw new UpupConfigError(
                'CredentialStrategy must implement multipart methods (initMultipartUpload, signPart, completeMultipartUpload)',
            )
        }
        // Bound to the original `credentials` object — these are detached from
        // their owning instance below, and implementations (e.g. ServerCredentials)
        // rely on `this` internally (e.g. `this.post(...)`).
        this.credentials = credentials
        this.initMultipartUpload =
            credentials.initMultipartUpload.bind(credentials)
        this.signPart = credentials.signPart.bind(credentials)
        this.completeMultipartUpload =
            credentials.completeMultipartUpload.bind(credentials)
        this.chunkSizeBytes = options.chunkSizeBytes ?? DEFAULT_CHUNK_SIZE
        this.maxConcurrentParts =
            options.maxConcurrentParts ?? DEFAULT_MAX_CONCURRENT
    }

    async upload(
        file: File | Blob,
        _credentials: UploadCredentials,
        options: {
            onProgress: (loaded: number, total: number) => void
            signal: AbortSignal
        },
    ): Promise<UploadResult> {
        const fileSize = file.size
        const fileName = file instanceof File ? file.name : 'blob'
        const fileType = file.type || 'application/octet-stream'

        // 1. Initiate multipart upload
        const init = await this.initMultipartUpload({
            name: fileName,
            size: fileSize,
            type: fileType,
        })

        if (!init.token) {
            throw new UpupNetworkError(
                'Multipart init did not return an upload token (server too old or misconfigured)',
            )
        }
        const token = init.token

        const partSize = init.partSize || this.chunkSizeBytes
        const totalParts = Math.ceil(fileSize / partSize)
        const completedParts: MultipartPart[] = []
        let totalUploaded = 0

        try {
            // 2. Upload parts with concurrency control
            const partQueue = Array.from(
                { length: totalParts },
                (_, i) => i + 1,
            )
            const activeParts: Promise<void>[] = []

            const uploadPart = async (partNumber: number): Promise<void> => {
                if (isAborted(options.signal)) {
                    throw new UpupNetworkError('Upload aborted')
                }

                const start = (partNumber - 1) * partSize
                const end = Math.min(start + partSize, fileSize)
                const chunk = file.slice(start, end)

                // Sign the part
                const signed = await this.signPart({
                    token,
                    partNumber,
                })

                if (isAborted(options.signal)) {
                    throw new UpupNetworkError('Upload aborted')
                }

                // Upload the chunk
                const response = await fetch(signed.uploadUrl, {
                    method: 'PUT',
                    headers: signed.uploadHeaders ?? {},
                    body: chunk,
                    signal: options.signal,
                })

                if (!response.ok) {
                    const body = await response.text().catch(() => '')
                    const err = uploadErrorFromResponse({
                        status: response.status,
                        statusText: response.statusText,
                        body,
                        kind: 'storage',
                        operation: 'multipart-sign-part',
                    })
                    throw err
                }

                const eTag =
                    response.headers.get('ETag') ?? `"part-${partNumber}"`
                completedParts.push({ partNumber, eTag })

                totalUploaded += end - start
                options.onProgress(totalUploaded, fileSize)
            }

            // Process parts with concurrency limit
            for (const partNumber of partQueue) {
                if (options.signal.aborted) break

                const partPromise = uploadPart(partNumber).then(() => {
                    const idx = activeParts.indexOf(partPromise)
                    if (idx !== -1) void activeParts.splice(idx, 1)
                })
                activeParts.push(partPromise)

                if (activeParts.length >= this.maxConcurrentParts) {
                    await Promise.race(activeParts)
                }
            }

            // Wait for remaining parts
            await Promise.all(activeParts)

            // 3. Complete multipart upload
            completedParts.sort((a, b) => a.partNumber - b.partNumber)

            const result = await this.completeMultipartUpload({
                token,
                parts: completedParts,
            })

            return {
                key: result.key,
                publicUrl: result.publicUrl,
                downloadUrl: result.downloadUrl,
                etag: result.etag,
            }
        } catch (error) {
            // Abort on failure
            if (this.credentials.abortMultipartUpload) {
                await this.credentials
                    .abortMultipartUpload({ token })
                    .catch(() => {}) // Best-effort abort
            }
            throw error
        }
    }
}
