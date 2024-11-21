import { PutObjectCommand, S3Client, _Error } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { S3PresignedUrlParams } from 'backend/types'
import s3UpdateCORS from 'backend/utils/aws/s3/s3-update-cors'
import fileValidateParams from 'backend/utils/files/file-validate-params'
import {
    PresignedUrlResponse,
    UploadError,
    UploadErrorType,
} from 'types/StorageSDK'

const DEFAULT_EXPIRES_IN = 3600

export default async function s3GeneratePresignedUrl({
    fileParams,
    bucketName: Bucket,
    s3ClientConfig,
    expiresIn = DEFAULT_EXPIRES_IN,
    origin,
    provider,
}: S3PresignedUrlParams): Promise<PresignedUrlResponse> {
    const {
        name: fileName,
        type: ContentType,
        size: ContentLength,
    } = fileParams
    try {
        // Validate file params
        fileValidateParams(fileParams)

        // Configure CORS for request origin
        await s3UpdateCORS(origin, Bucket, s3ClientConfig, provider)

        // Create S3 client
        const client = new S3Client(s3ClientConfig)

        // Generate unique key for the file
        const Key = `uploads/${Date.now()}-${fileName}`

        // Create PutObject command
        const command = new PutObjectCommand({
            Bucket,
            Key,
            ContentType,
            ContentLength,
        })

        // Generate presigned URL
        const uploadUrl = await getSignedUrl(client, command, {
            expiresIn,
            signableHeaders: new Set(['content-type', 'content-length']),
        })

        // Generate public URL (if bucket is public)
        const publicUrl = uploadUrl.split(Key)[0] + Key

        return {
            key: Key,
            publicUrl,
            uploadUrl,
            expiresIn,
        }
    } catch (error) {
        if (error instanceof UploadError) throw error

        const message = (error as _Error)?.Message || (error as Error).message
        const errorType = ((error as _Error)?.Code ||
            UploadErrorType.PRESIGNED_URL_ERROR) as UploadErrorType

        throw new UploadError(message, errorType, false, 500)
    }
}
