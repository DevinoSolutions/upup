import { UpupNetworkError, type CloudProvider } from '@upup/shared'

export interface ServerTransferOptions {
  serverUrl: string
  headers?: Record<string, string>
  apiKey?: string
}

export interface TransferResult {
  provider: string
  fileId: string
  status: string
  key?: string
  url?: string
}

/**
 * Strategy that POSTs to the server's /files/:provider/transfer endpoint
 * to transfer a file from a cloud drive directly to S3 on the server side.
 */
export class ServerTransfer {
  private serverUrl: string
  private headers: Record<string, string>

  constructor(options: ServerTransferOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, '')
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    if (options.apiKey) {
      this.headers['x-api-key'] = options.apiKey
    }
  }

  private providerSlug(provider: CloudProvider): string {
    switch (provider) {
      case 'google_drive':
        return 'google-drive'
      case 'onedrive':
        return 'onedrive'
      case 'dropbox':
        return 'dropbox'
      default:
        return provider
    }
  }

  async transfer(
    provider: CloudProvider,
    fileId: string,
    options?: { token?: string; fileName?: string },
  ): Promise<TransferResult> {
    const slug = this.providerSlug(provider)
    const response = await fetch(`${this.serverUrl}/files/${slug}/transfer`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        fileId,
        fileName: options?.fileName,
        token: options?.token,
      }),
    })

    if (!response.ok) {
      throw new UpupNetworkError(
        `File transfer failed: ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    return response.json()
  }
}
