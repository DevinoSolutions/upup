import { GetObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { UploadError, UploadErrorType } from 'shared/types/StorageSDK'

const DEFAULT_URL_VALID_TIME = 3600 * 24 * 3 // 3 days

export default async function s3GenerateSignedUrl(
    s3ClientConfig: S3ClientConfig,
    Key: string,
    Bucket: string,
    expiresIn = DEFAULT_URL_VALID_TIME,
) {
    try {
        const s3Client = new S3Client(s3ClientConfig)
        const url = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket,
                Key,
            }),
            {
                expiresIn,
            },
        )

        return url
    } catch (error) {
        throw new UploadError(
            (error as Error).message,
            UploadErrorType.SIGNED_URL_ERROR,
            false,
        )
    }
}
