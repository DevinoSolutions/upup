import {
  UpupNetworkError,
  type CredentialStrategy,
  type FileMetadata,
  type PresignedUrlResponse,
  type MultipartInitResponse,
  type MultipartSignPartResponse,
  type MultipartCompleteResponse,
} from '@upup/shared'

export interface ServerCredentialsOptions {
  serverUrl: string
  headers?: Record<string, string>
  apiKey?: string
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
    if (options.apiKey) {
      this.headers['x-api-key'] = options.apiKey
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.serverUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new UpupNetworkError(
        `Presign request failed: ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    return response.json()
  }

  async getPresignedUrl(file: FileMetadata): Promise<PresignedUrlResponse> {
    return this.post<PresignedUrlResponse>('/presign', {
      name: file.name,
      size: file.size,
      type: file.type,
    })
  }

  async initMultipartUpload(file: FileMetadata): Promise<MultipartInitResponse> {
    return this.post<MultipartInitResponse>('/multipart/init', {
      name: file.name,
      size: file.size,
      type: file.type,
    })
  }

  async signPart(params: {
    key: string
    uploadId: string
    partNumber: number
  }): Promise<MultipartSignPartResponse> {
    return this.post<MultipartSignPartResponse>('/multipart/sign-part', params)
  }

  async completeMultipartUpload(params: {
    key: string
    uploadId: string
    parts: { partNumber: number; eTag: string }[]
  }): Promise<MultipartCompleteResponse> {
    return this.post<MultipartCompleteResponse>('/multipart/complete', params)
  }

  async abortMultipartUpload(params: {
    key: string
    uploadId: string
  }): Promise<void> {
    await this.post('/multipart/abort', params)
  }
}
