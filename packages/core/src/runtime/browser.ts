import type { RuntimeAdapter } from '../contracts'

export const BrowserRuntime: RuntimeAdapter = {
    async computeHash(data: ArrayBuffer): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
    },

    createImageBitmap:
        typeof createImageBitmap !== 'undefined'
            ? (blob: Blob) => createImageBitmap(blob)
            : undefined,

    createWorker:
        typeof Worker !== 'undefined'
            ? () => {
                  try {
                      return new Worker(
                          new URL('./pipeline-worker.js', import.meta.url),
                          {
                              type: 'module',
                          },
                      )
                  } catch {
                      // upup-catch: worker construction can fail (CSP, unsupported bundler resolution) — fall back to no worker
                      return null
                  }
              }
            : undefined,

    async upload(url, body, options) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()

            xhr.upload.addEventListener('progress', e => {
                if (e.lengthComputable) options.onProgress(e.loaded, e.total)
            })

            xhr.addEventListener('load', () => {
                const headers: Record<string, string> = {}
                xhr.getAllResponseHeaders()
                    .split('\r\n')
                    .forEach(line => {
                        const [key, ...vals] = line.split(': ')
                        if (key) headers[key.toLowerCase()] = vals.join(': ')
                    })
                resolve({ status: xhr.status, headers, body: xhr.responseText })
            })

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'))
            })
            options.signal.addEventListener('abort', () => {
                xhr.abort()
            })

            xhr.open(options.method, url)
            for (const [k, v] of Object.entries(options.headers)) {
                xhr.setRequestHeader(k, v)
            }
            xhr.send(body)
        })
    },

    async readAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
        return file.arrayBuffer()
    },

    createObjectURL:
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? (blob: Blob) => URL.createObjectURL(blob)
            : undefined,

    revokeObjectURL:
        typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function'
            ? (url: string) => {
                  URL.revokeObjectURL(url)
              }
            : undefined,
}
