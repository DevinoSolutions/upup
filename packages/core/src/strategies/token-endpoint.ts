import {
  UpupNetworkError,
  type CredentialStrategy,
  type FileMetadata,
  type PresignedUrlResponse,
} from '@upup/shared'

export class TokenEndpointCredentials implements CredentialStrategy {
  private url: string
  private headers: Record<string, string>

  constructor(options: { url: string; headers?: Record<string, string> }) {
    this.url = options.url
    this.headers = options.headers ?? {}
  }

  async getPresignedUrl(file: FileMetadata): Promise<PresignedUrlResponse> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
      }),
    })

    if (!response.ok) {
      throw new UpupNetworkError(
        `Presign request failed: ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    return response.json()
  }
}
