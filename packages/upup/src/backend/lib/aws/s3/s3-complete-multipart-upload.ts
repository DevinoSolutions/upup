import {
    CompleteMultipartUploadCommand,
    S3Client,
    _Error,
} from '@aws-sdk/client-s3'
import {
    MultipartCompleteResponse,
    MultipartPart,
    UploadError,
    UploadErrorType,
} from '../../../../shared/types'
import { S3MultipartParams } from '../../../types'
import s3GenerateSignedUrl from './s3-generate-signed-url'

export default async function s3CompleteMultipartUpload({
    bucketName: Bucket,
    s3ClientConfig,
    key,
    uploadId,
    parts,
}: S3MultipartParams & {
    key: string
    uploadId: string
    parts: MultipartPart[]
}): Promise<MultipartCompleteResponse> {
    try {
        const client = new S3Client(s3ClientConfig)

        const command = new CompleteMultipartUploadCommand({
            Bucket,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts
                    .sort((a, b) => a.partNumber - b.partNumber)
                    .map(p => ({
                        PartNumber: p.partNumber,
                        ETag: p.eTag,
                    })),
            },
        })

        await client.send(command)

        const publicUrl = await s3GenerateSignedUrl(s3ClientConfig, key, Bucket)

        return { key, publicUrl }
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
