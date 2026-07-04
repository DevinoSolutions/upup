import { uploadErrorFromResponse, type CloudProvider } from '../contracts'

export interface ServerTransferOptions {
    serverUrl: string
    headers?: Record<string, string>
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
    }

    private providerSlug(provider: CloudProvider): string {
        switch (provider) {
            case 'googleDrive':
                return 'google-drive'
            case 'oneDrive':
                return 'onedrive'
            case 'dropbox':
                return 'dropbox'
            case 'box':
                return 'box'
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
        const response = await fetch(
            `${this.serverUrl}/files/${slug}/transfer`,
            {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    fileId,
                    fileName: options?.fileName,
                    token: options?.token,
                }),
            },
        )

        if (!response.ok) {
            const body = await response.text().catch(() => '')
            throw uploadErrorFromResponse({
                status: response.status,
                statusText: response.statusText,
                body,
                kind: 'network',
            })
        }

        return response.json()
    }
}
