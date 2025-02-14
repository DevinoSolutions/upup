import { S3ClientConfig } from '@aws-sdk/client-s3'
import { UpupProvider } from '../shared/types'

export interface FileParams {
    name: string
    type: string
    size: number

    accept?: string
    maxFileSize?: number
    multiple?: boolean
}

interface UrlParams {
    fileParams: FileParams
    expiresIn?: number
}

export type S3PresignedUrlParams = UrlParams & {
    bucketName: string
    s3ClientConfig: S3ClientConfig
    origin: string
    provider: UpupProvider
    enableAutoCorsConfig: boolean
}

export type AzureSasUrlParams = UrlParams & {
    containerName: string
    credentials: AzureCredentials
}

export type AzureCredentials = {
    tenantId: string
    clientId: string
    clientSecret: string
    storageAccount: string
}
