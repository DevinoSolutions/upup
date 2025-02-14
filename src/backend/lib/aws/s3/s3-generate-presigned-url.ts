import { PutObjectCommand, S3Client, _Error } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuid } from 'uuid'
import {
    PresignedUrlResponse,
    UploadError,
    UploadErrorType,
} from '../../../../shared/types'
import { S3PresignedUrlParams } from '../../../types'
import fileValidateParams from '../../files/file-validate-params'
import s3GenerateSignedUrl from './s3-generate-signed-url'
import s3UpdateCORS from './s3-update-cors'

const DEFAULT_EXPIRES_IN = 3600

function getUploadErrorParams(error: unknown) {
    const message = (error as _Error)?.Message ?? (error as Error).message
    const errorType = ((error as _Error)?.Code ??
        UploadErrorType.PRESIGNED_URL_ERROR) as UploadErrorType

    return { message, errorType }
}

export default async function s3GeneratePresignedUrl({
    fileParams,
    bucketName: Bucket,
    s3ClientConfig,
    expiresIn = DEFAULT_EXPIRES_IN,
    origin,
    provider,
    enableAutoCorsConfig,
}: S3PresignedUrlParams): Promise<PresignedUrlResponse> {
    const {
        name: fileName,
        type: ContentType,
        size: ContentLength,
    } = fileParams
    try {
        // Validate file params
        fileValidateParams(fileParams)

        if (enableAutoCorsConfig) {
            // Configure CORS for request origin
            await s3UpdateCORS(origin, Bucket, s3ClientConfig, provider)
        }

        // Create S3 client
        const client = new S3Client(s3ClientConfig)

        // Generate unique key for the file
        const Key = `${uuid()}-${fileName}`

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
        const publicUrl = await s3GenerateSignedUrl(s3ClientConfig, Key, Bucket)

        return {
            key: Key,
            publicUrl,
            uploadUrl,
            expiresIn,
        }
    } catch (error) {
        if (error instanceof UploadError) throw error

        const { message, errorType } = getUploadErrorParams(error)
        throw new UploadError(message, errorType, false, 500)
    }
}
