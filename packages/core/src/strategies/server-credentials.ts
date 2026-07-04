import {
    uploadErrorFromResponse,
    type CredentialStrategy,
    type FileMetadata,
    type PresignedUrlResponse,
    type MultipartInitResponse,
    type MultipartSignPartResponse,
    type MultipartCompleteResponse,
} from '../contracts'
import type { UpupStorageError } from '../errors'

export interface ServerCredentialsOptions {
    serverUrl: string
    headers?: Record<string, string>
}

/** Map a server-mode route path to the UpupStorageError operation it represents. */
function operationForPath(path: string): UpupStorageError['operation'] {
    if (path.startsWith('/presign')) return 'presign'
    if (path.startsWith('/multipart/init')) return 'multipart-init'
    if (path.startsWith('/multipart/sign-part')) return 'multipart-sign-part'
    if (path.startsWith('/multipart/complete')) return 'multipart-complete'
    if (path.startsWith('/multipart/abort')) return 'multipart-abort'
    return 'upload'
}

export class ServerCredentials implements CredentialStrategy {
    private serverUrl: string
    private headers: Record<string, string>

    constructor(options: ServerCredentialsOptions) {
        this.serverUrl = options.serverUrl.replace(/\/$/, '')
        this.headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        }
    }

    private async post<T>(path: string, body: unknown): Promise<T> {
        const response = await fetch(`${this.serverUrl}${path}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const responseBody = await response.text().catch(() => '')
            throw uploadErrorFromResponse({
                status: response.status,
                statusText: response.statusText,
                body: responseBody,
                kind: 'storage',
                operation: operationForPath(path),
            })
        }

        return response.json()
    }

    async getPresignedUrl(file: FileMetadata): Promise<PresignedUrlResponse> {
        return this.post<PresignedUrlResponse>('/presign', {
            name: file.name,
            size: file.size,
            type: file.type,
            metadata: file.metadata ?? {},
        })
    }

    async initMultipartUpload(
        file: FileMetadata,
    ): Promise<MultipartInitResponse> {
        return this.post<MultipartInitResponse>('/multipart/init', {
            name: file.name,
            size: file.size,
            type: file.type,
            metadata: file.metadata ?? {},
        })
    }

    async signPart(params: {
        token: string
        partNumber: number
    }): Promise<MultipartSignPartResponse> {
        return this.post<MultipartSignPartResponse>(
            '/multipart/sign-part',
            params,
        )
    }

    async completeMultipartUpload(params: {
        token: string
        parts: { partNumber: number; eTag: string }[]
    }): Promise<MultipartCompleteResponse> {
        return this.post<MultipartCompleteResponse>(
            '/multipart/complete',
            params,
        )
    }

    async abortMultipartUpload(params: { token: string }): Promise<void> {
        await this.post('/multipart/abort', params)
    }
}
