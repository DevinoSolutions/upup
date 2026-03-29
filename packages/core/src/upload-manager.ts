import {
  UpupNetworkError,
  type CredentialStrategy,
  type UploadStrategy,
  type UploadFile,
  type UploadResult,
} from '@upup/shared'

export interface UploadManagerOptions {
  credentials: CredentialStrategy
  uploadStrategy: UploadStrategy
  maxConcurrentUploads: number
  maxRetries?: number
  fastAbortThreshold?: number
  isSuccessfulCall?: (
    response: { status: number; headers: Record<string, string>; body: unknown },
  ) => boolean | Promise<boolean>
  onProgress: (fileId: string, loaded: number, total: number) => void
  onFileComplete: (file: UploadFile, result: UploadResult) => void
  onFileError?: (file: UploadFile, error: Error) => void
}

export class UploadManager {
  private abortController = new AbortController()
  private options: UploadManagerOptions

  constructor(options: UploadManagerOptions) {
    this.options = options
  }

  async uploadAll(files: UploadFile[]): Promise<UploadResult[]> {
    const { maxConcurrentUploads } = this.options
    const results: UploadResult[] = []
    const queue = [...files]
    let active = 0

    await new Promise<void>((resolve, reject) => {
      const tryNext = () => {
        if (queue.length === 0 && active === 0) {
          resolve()
          return
        }

        while (active < maxConcurrentUploads && queue.length > 0) {
          const file = queue.shift()!
          active++

          this.uploadFile(file)
            .then((result) => {
              results.push(result)
              this.options.onFileComplete(file, result)
            })
            .catch((err) => {
              if (this.options.onFileError) {
                this.options.onFileError(file, err instanceof Error ? err : new Error(String(err)))
              }
            })
            .finally(() => {
              active--
              tryNext()
            })
        }
      }

      tryNext()

      // Handle empty file list
      if (files.length === 0) {
        resolve()
      }
    })

    return results
  }

  private async uploadFile(file: UploadFile): Promise<UploadResult> {
    const { credentials, uploadStrategy, maxRetries = 3, isSuccessfulCall } = this.options
    const maxAttempts = maxRetries + 1
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (this.abortController.signal.aborted) {
        throw new UpupNetworkError('Upload aborted')
      }

      try {
        const presigned = await credentials.getPresignedUrl({
          name: file.name,
          size: file.size,
          type: file.type,
        })

        const result = await uploadStrategy.upload(file as unknown as File, presigned, {
          onProgress: (loaded, total) => this.options.onProgress(file.id, loaded, total),
          signal: this.abortController.signal,
        })

        if (isSuccessfulCall) {
          // Build a synthetic response from the UploadResult
          const syntheticResponse = {
            status: 200,
            headers: {} as Record<string, string>,
            body: result as unknown,
          }
          const ok = await isSuccessfulCall(syntheticResponse)
          if (!ok) {
            throw new UpupNetworkError('isSuccessfulCall returned false', 0)
          }
        }

        return result
      } catch (err) {
        // Don't retry on abort
        if (this.abortController.signal.aborted) {
          throw err
        }

        const isNetwork = err instanceof UpupNetworkError
        // Don't retry on client errors (4xx) or non-network errors
        if (isNetwork && err.status !== undefined && err.status >= 400 && err.status < 500) {
          throw err
        }
        // isSuccessfulCall failure — don't retry by default
        if (isNetwork && err.status === 0) {
          throw err
        }

        lastError = err instanceof Error ? err : new Error(String(err))

        if (attempt < maxAttempts - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms, ...
          await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)))
        }
      }
    }

    throw lastError ?? new UpupNetworkError('Upload failed after retries')
  }

  abort(): void {
    this.abortController.abort()
  }

  pause(): void {
    this.abortController.abort()
    this.abortController = new AbortController()
  }
}
