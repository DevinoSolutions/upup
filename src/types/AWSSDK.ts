import { UploadResult } from './StorageSDK'

export interface AWSCredentials {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
    expiration: number // Unix timestamp
}

export interface AWSUploadConfig {
    bucket: string
    region: string
    endpoint?: string
    credentials: AWSCredentials
}

export interface AWSUploadResponse extends UploadResult {
    eTag?: string
    versionId?: string
}
