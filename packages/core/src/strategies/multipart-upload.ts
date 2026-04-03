import {
  UpupNetworkError,
  type UploadStrategy,
  type UploadCredentials,
  type UploadResult,
  type CredentialStrategy,
  type MultipartPart,
} from '@upup/shared'

export interface MultipartUploadOptions {
  credentials: CredentialStrategy
  chunkSizeBytes?: number
  maxConcurrentParts?: number
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5 MiB
const DEFAULT_MAX_CONCURRENT = 3

export class MultipartUpload implements UploadStrategy {
  private credentials: CredentialStrategy
  private chunkSizeBytes: number
  private maxConcurrentParts: number

  constructor(options: MultipartUploadOptions) {
    if (
      !options.credentials.initMultipartUpload ||
      !options.credentials.signPart ||
      !options.credentials.completeMultipartUpload
    ) {
      throw new Error(
        'CredentialStrategy must implement multipart methods (initMultipartUpload, signPart, completeMultipartUpload)',
      )
    }
    this.credentials = options.credentials
    this.chunkSizeBytes = options.chunkSizeBytes ?? DEFAULT_CHUNK_SIZE
    this.maxConcurrentParts = options.maxConcurrentParts ?? DEFAULT_MAX_CONCURRENT
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
    const init = await this.credentials.initMultipartUpload!({
      name: fileName,
      size: fileSize,
      type: fileType,
    })

    const partSize = init.partSize || this.chunkSizeBytes
    const totalParts = Math.ceil(fileSize / partSize)
    const completedParts: MultipartPart[] = []
    let totalUploaded = 0

    try {
      // 2. Upload parts with concurrency control
      const partQueue = Array.from({ length: totalParts }, (_, i) => i + 1)
      const activeParts: Promise<void>[] = []

      const uploadPart = async (partNumber: number): Promise<void> => {
        if (options.signal.aborted) {
          throw new UpupNetworkError('Upload aborted')
        }

        const start = (partNumber - 1) * partSize
        const end = Math.min(start + partSize, fileSize)
        const chunk = file.slice(start, end)

        // Sign the part
        const signed = await this.credentials.signPart!({
          key: init.key,
          uploadId: init.uploadId,
          partNumber,
        })

        if (options.signal.aborted) {
          throw new UpupNetworkError('Upload aborted')
        }

        // Upload the chunk
        const response = await fetch(signed.uploadUrl, {
          method: 'PUT',
          body: chunk,
          signal: options.signal,
        })

        if (!response.ok) {
          throw new UpupNetworkError(
            `Part ${partNumber} upload failed: ${response.status}`,
            response.status,
          )
        }

        const eTag = response.headers.get('ETag') ?? `"part-${partNumber}"`
        completedParts.push({ partNumber, eTag })

        totalUploaded += end - start
        options.onProgress(totalUploaded, fileSize)
      }

      // Process parts with concurrency limit
      for (const partNumber of partQueue) {
        if (options.signal.aborted) break

        const partPromise = uploadPart(partNumber).then(() => {
          const idx = activeParts.indexOf(partPromise)
          if (idx !== -1) activeParts.splice(idx, 1)
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

      const result = await this.credentials.completeMultipartUpload!({
        key: init.key,
        uploadId: init.uploadId,
        parts: completedParts,
      })

      return {
        key: result.key,
        publicUrl: result.publicUrl,
        etag: result.etag,
      }
    } catch (error) {
      // Abort on failure
      if (this.credentials.abortMultipartUpload) {
        await this.credentials
          .abortMultipartUpload({ key: init.key, uploadId: init.uploadId })
          .catch(() => {}) // Best-effort abort
      }
      throw error
    }
  }
}
