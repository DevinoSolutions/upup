import { AWSCredentials } from '../../../types/AWSSDK'
import {
    CredentialsManager,
    RetryConfig,
    UploadError,
    UploadErrorType,
} from '../../../types/StorageSDK'

const BUFFER_TIME = 300 // 5 minutes buffer before expiration

export class AWSCredentialsManager implements CredentialsManager {
    private credentials: AWSCredentials | null = null
    private readonly bufferTime = BUFFER_TIME

    constructor(
        private readonly tokenEndpoint: string,
        private readonly retryConfig: RetryConfig,
    ) {}

    async getCredentials(): Promise<AWSCredentials> {
        if (!this.credentials || this.shouldRefresh()) await this.refresh()

        return this.credentials!
    }

    shouldRefresh(): boolean {
        if (!this.credentials) return true

        const currentTime = Math.floor(Date.now() / 1000)
        return currentTime + this.bufferTime >= this.credentials.expiration
    }

    async refresh(): Promise<void> {
        let attempt = 0

        while (attempt < this.retryConfig.maxRetries) {
            try {
                const response = await fetch(this.tokenEndpoint)

                if (!response.ok)
                    throw new UploadError(
                        UploadErrorType.CREDENTIALS_ERROR,
                        'Failed to refresh credentials',
                        true,
                    )

                this.credentials = await response.json()
                return
            } catch (error) {
                attempt++
                if (attempt === this.retryConfig.maxRetries)
                    throw new UploadError(
                        UploadErrorType.CREDENTIALS_ERROR,
                        'Max retry attempts reached for credentials refresh',
                        false,
                    )

                await new Promise(resolve =>
                    setTimeout(
                        resolve,
                        this.retryConfig.delayMs *
                            Math.pow(
                                this.retryConfig.backoffMultiplier,
                                attempt,
                            ),
                    ),
                )
            }
        }
    }
}
