import { ListPartsCommand, S3Client, _Error } from '@aws-sdk/client-s3'
import {
    MultipartListPartsResponse,
    UploadError,
    UploadErrorType,
} from '../../../../shared/types'
import { S3MultipartParams } from '../../../types'

export default async function s3ListMultipartParts({
    bucketName: Bucket,
    s3ClientConfig,
    key,
    uploadId,
}: S3MultipartParams & {
    key: string
    uploadId: string
}): Promise<MultipartListPartsResponse> {
    try {
        const client = new S3Client(s3ClientConfig)

        const parts: MultipartListPartsResponse['parts'] = []
        let partNumberMarker: string | undefined

        // Paginate through all parts
        while (true) {
            const command = new ListPartsCommand({
                Bucket,
                Key: key,
                UploadId: uploadId,
                PartNumberMarker: partNumberMarker,
            })

            const response = await client.send(command)

            if (response.Parts) {
                for (const part of response.Parts) {
                    if (part.PartNumber != null && part.ETag) {
                        parts.push({
                            partNumber: part.PartNumber,
                            eTag: part.ETag,
                        })
                    }
                }
            }

            if (!response.IsTruncated) break
            partNumberMarker = String(
                response.Parts?.[response.Parts.length - 1]?.PartNumber,
            )
        }

        return { parts }
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
