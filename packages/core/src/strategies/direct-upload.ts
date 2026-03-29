import {
  UpupNetworkError,
  type UploadStrategy,
  type UploadCredentials,
  type UploadResult,
} from '@upup/shared'

export class DirectUpload implements UploadStrategy {
  async upload(
    file: File | Blob,
    credentials: UploadCredentials,
    options: {
      onProgress: (loaded: number, total: number) => void
      signal: AbortSignal
    },
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          options.onProgress(e.loaded, e.total)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            key: credentials.key,
            publicUrl: credentials.publicUrl,
          })
        } else {
          reject(
            new UpupNetworkError(
              `Upload failed: ${xhr.status} ${xhr.statusText}`,
              xhr.status,
            ),
          )
        }
      })

      xhr.addEventListener('error', () => {
        reject(new UpupNetworkError('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new UpupNetworkError('Upload aborted'))
      })

      options.signal.addEventListener('abort', () => xhr.abort())

      xhr.open('PUT', credentials.uploadUrl)

      xhr.send(file)
    })
  }
}
