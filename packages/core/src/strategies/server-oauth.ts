import {
  UpupNetworkError,
  type OAuthStrategy,
  type CloudProvider,
  type OAuthTokens,
  type RemoteFile,
} from '@upup/shared'

export interface ServerOAuthOptions {
  serverUrl: string
  headers?: Record<string, string>
  apiKey?: string
}

/**
 * OAuthStrategy that delegates to the upup server's /auth and /files routes.
 * The server handles the actual OAuth token exchange and cloud provider API calls.
 */
export class ServerOAuth implements OAuthStrategy {
  private serverUrl: string
  private headers: Record<string, string>

  constructor(options: ServerOAuthOptions) {
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

  async getAuthUrl(provider: CloudProvider): Promise<string> {
    // The server's GET /auth/:provider returns a 302 redirect.
    // We return the URL so the caller can navigate to it.
    return `${this.serverUrl}/auth/${this.providerSlug(provider)}`
  }

  async handleCallback(
    provider: CloudProvider,
    params: Record<string, string>,
  ): Promise<OAuthTokens> {
    const slug = this.providerSlug(provider)
    const qs = new URLSearchParams(params).toString()
    const response = await fetch(`${this.serverUrl}/auth/${slug}/cb?${qs}`, {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new UpupNetworkError(
        `OAuth callback failed: ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    return response.json()
  }

  async listFiles(
    provider: CloudProvider,
    path: string,
    token: string,
  ): Promise<RemoteFile[]> {
    const slug = this.providerSlug(provider)
    const qs = new URLSearchParams({ path, token }).toString()
    const response = await fetch(`${this.serverUrl}/files/${slug}?${qs}`, {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new UpupNetworkError(
        `List files failed: ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    const data = await response.json()
    return data.files ?? []
  }

  async getFileMetadata(
    provider: CloudProvider,
    fileId: string,
    token: string,
  ): Promise<RemoteFile> {
    const slug = this.providerSlug(provider)
    const qs = new URLSearchParams({ fileId, token }).toString()
    const response = await fetch(`${this.serverUrl}/files/${slug}?${qs}`, {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new UpupNetworkError(
        `Get file metadata failed: ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    return response.json()
  }
}
