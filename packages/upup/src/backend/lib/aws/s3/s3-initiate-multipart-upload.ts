import {
    CreateMultipartUploadCommand,
    S3Client,
    _Error,
} from '@aws-sdk/client-s3'
import { v4 as uuid } from 'uuid'
import {
    MultipartInitResponse,
    UploadError,
    UploadErrorType,
} from '../../../../shared/types'
import { FileParams, S3MultipartParams } from '../../../types'
import fileValidateParams from '../../files/file-validate-params'
import s3UpdateCORS from './s3-update-cors'

const DEFAULT_EXPIRES_IN = 3600
const MIN_PART_SIZE = 5 * 1024 * 1024 // 5 MiB
const MAX_PARTS = 10_000

/**
 * Compute a valid part size given file size and optional user preference.
 * Enforces S3 multipart constraints: min 5 MiB, max 10,000 parts.
 */
export function computePartSize(
    fileSize: number,
    chunkSizeBytes?: number,
): number {
    // Start with user preference or default minimum
    let partSize = chunkSizeBytes ?? MIN_PART_SIZE

    // Clamp to minimum
    if (partSize < MIN_PART_SIZE) partSize = MIN_PART_SIZE

    // Ensure we don't exceed max parts
    const minPartSizeForFile = Math.ceil(fileSize / MAX_PARTS)
    if (partSize < minPartSizeForFile) partSize = minPartSizeForFile

    return partSize
}

export default async function s3InitiateMultipartUpload({
    fileParams,
    bucketName: Bucket,
    s3ClientConfig,
    expiresIn = DEFAULT_EXPIRES_IN,
    origin,
    provider,
    enableAutoCorsConfig = false,
    chunkSizeBytes,
}: S3MultipartParams & {
    fileParams: FileParams
    chunkSizeBytes?: number
}): Promise<MultipartInitResponse> {
    const { name: fileName, type: ContentType, size } = fileParams

    try {
        fileValidateParams(fileParams)

        if (enableAutoCorsConfig) {
            await s3UpdateCORS(origin, Bucket, s3ClientConfig, provider)
        }

        const client = new S3Client(s3ClientConfig)
        const Key = `${uuid()}-${fileName}`

        const command = new CreateMultipartUploadCommand({
            Bucket,
            Key,
            ContentType,
        })

        const response = await client.send(command)

        if (!response.UploadId) {
            throw new Error('Failed to initiate multipart upload: no UploadId')
        }

        const partSize = computePartSize(size, chunkSizeBytes)

        return {
            key: Key,
            uploadId: response.UploadId,
            partSize,
            expiresIn,
        }
    } catch (error) {
        if (error instanceof UploadError) throw error

        const message = (error as _Error)?.Message ?? (error as Error).message
        throw new UploadError(
            message,
            UploadErrorType.PRESIGNED_URL_ERROR,
            false,
            500,
        )
    }
}
