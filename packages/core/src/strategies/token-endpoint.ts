import {
    parseErrorBody,
    uploadErrorFromResponse,
    type CredentialStrategy,
    type FileMetadata,
    type PresignedUrlResponse,
} from '../contracts'

/**
 * Read a failed presign response's body without letting the read itself become
 * the failure: `text()` can reject on a torn connection, and a hand-rolled
 * Response stand-in may not implement it at all. Either way the status alone
 * still classifies the error.
 */
async function readErrorBody(response: Response): Promise<string | undefined> {
    try {
        return await response.text()
    } catch {
        // upup-catch: body unreadable — fall back to the status-only message
        return undefined
    }
}

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
                metadata: file.metadata ?? {},
            }),
        })

        if (!response.ok) {
            // A self-hosted token endpoint puts its actionable copy in the body
            // ("File exceeds your plan's limit", "your sign-in expired"). This
            // strategy used to drop it and throw the status line alone, which
            // left consumers matching HTTP statuses out of upup's own message
            // text to recover what their server had already said.
            const body = await readErrorBody(response)
            const error = uploadErrorFromResponse({
                status: response.status,
                statusText: response.statusText,
                ...(body !== undefined ? { body } : {}),
                kind: 'network',
            })
            if (!parseErrorBody(body).message.trim()) {
                // Nothing usable in the body — keep the exact wording this
                // strategy has always thrown, so a consumer matching on it
                // sees no change.
                error.message = `Presign request failed: ${response.status} ${response.statusText}`
            }
            throw error
        }

        return response.json() as Promise<PresignedUrlResponse>
    }
}
