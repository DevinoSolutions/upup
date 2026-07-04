import {
    UpupNetworkError,
    uploadErrorFromResponse,
    type UploadStrategy,
    type UploadCredentials,
    type UploadResult,
} from '../contracts'

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

            xhr.upload.addEventListener('progress', e => {
                if (e.lengthComputable) {
                    options.onProgress(e.loaded, e.total)
                }
            })

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        key: credentials.key,
                        publicUrl: credentials.publicUrl,
                        downloadUrl: credentials.downloadUrl,
                    })
                } else {
                    reject(
                        uploadErrorFromResponse({
                            status: xhr.status,
                            statusText: xhr.statusText,
                            body: xhr.responseText,
                            kind: 'storage',
                            operation: 'upload',
                        }),
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
            for (const [key, value] of Object.entries(
                credentials.uploadHeaders ?? {},
            )) {
                xhr.setRequestHeader(key, value)
            }

            xhr.send(file)
        })
    }
}
