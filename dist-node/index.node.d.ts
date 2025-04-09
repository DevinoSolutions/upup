import { S3ClientConfig } from '@aws-sdk/client-s3'

declare enum UpupProvider {
    AWS = 'aws',
    Azure = 'azure',
    BackBlaze = 'backblaze',
    DigitalOcean = 'digitalocean',
}
type PresignedUrlResponse = {
    key: string
    publicUrl: string
    uploadUrl: string
    expiresIn: number
}

interface FileParams {
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
type S3PresignedUrlParams = UrlParams & {
    bucketName: string
    s3ClientConfig: S3ClientConfig
    origin: string
    provider: UpupProvider
    enableAutoCorsConfig?: boolean
}
type AzureSasUrlParams = UrlParams & {
    containerName: string
    credentials: AzureCredentials
}
type AzureCredentials = {
    tenantId: string
    clientId: string
    clientSecret: string
    storageAccount: string
}

declare function s3GeneratePresignedUrl({
    fileParams,
    bucketName: Bucket,
    s3ClientConfig,
    expiresIn,
    origin,
    provider,
    enableAutoCorsConfig,
}: S3PresignedUrlParams): Promise<PresignedUrlResponse>

declare function s3GenerateSignedUrl(
    s3ClientConfig: S3ClientConfig,
    Key: string,
    Bucket: string,
    expiresIn?: number,
): Promise<string>

declare function azureGenerateSasUrl({
    fileParams,
    containerName,
    credentials,
    expiresIn,
}: AzureSasUrlParams): Promise<PresignedUrlResponse>

export {
    azureGenerateSasUrl,
    s3GeneratePresignedUrl,
    s3GenerateSignedUrl,
    UpupProvider,
}
