import { S3Client, UploadPartCommand, _Error } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
    MultipartSignPartResponse,
    UploadError,
    UploadErrorType,
} from '../../../../shared/types'
import { S3MultipartParams } from '../../../types'

const DEFAULT_EXPIRES_IN = 3600

export default async function s3GeneratePresignedPartUrl({
    bucketName: Bucket,
    s3ClientConfig,
    expiresIn = DEFAULT_EXPIRES_IN,
    key,
    uploadId,
    partNumber,
    contentLength,
}: S3MultipartParams & {
    key: string
    uploadId: string
    partNumber: number
    contentLength: number
}): Promise<MultipartSignPartResponse> {
    try {
        const client = new S3Client(s3ClientConfig)

        const command = new UploadPartCommand({
            Bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
            ContentLength: contentLength,
        })

        const uploadUrl = await getSignedUrl(client, command, {
            expiresIn,
            signableHeaders: new Set(['content-length']),
        })

        return { uploadUrl, expiresIn }
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
