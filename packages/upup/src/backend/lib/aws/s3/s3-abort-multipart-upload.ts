import {
    AbortMultipartUploadCommand,
    S3Client,
    _Error,
} from '@aws-sdk/client-s3'
import {
    MultipartAbortResponse,
    UploadError,
    UploadErrorType,
} from '../../../../shared/types'
import { S3MultipartParams } from '../../../types'

export default async function s3AbortMultipartUpload({
    bucketName: Bucket,
    s3ClientConfig,
    key,
    uploadId,
}: S3MultipartParams & {
    key: string
    uploadId: string
}): Promise<MultipartAbortResponse> {
    try {
        const client = new S3Client(s3ClientConfig)

        const command = new AbortMultipartUploadCommand({
            Bucket,
            Key: key,
            UploadId: uploadId,
        })

        await client.send(command)

        return { ok: true }
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
