import { BlobServiceClient } from '@azure/storage-blob'
import { UploadError, UploadErrorType } from '../../../shared/types'

export default async function azureGetTemporaryCredentials(
    blobServiceClient: BlobServiceClient,
    expiresIn = 3600,
) {
    try {
        // Get start and end time for delegation key
        const startsOn = new Date()
        const expiresOn = new Date(startsOn)
        expiresOn.setMinutes(startsOn.getMinutes() + expiresIn / 60) // 1 hour validity

        // Get user delegation key
        const userDelegationKey = await blobServiceClient.getUserDelegationKey(
            startsOn,
            expiresOn,
        )

        return userDelegationKey
    } catch (error) {
        throw new UploadError(
            (error as Error).message,
            UploadErrorType.TEMPORARY_CREDENTIALS_ERROR,
            false,
            500,
        )
    }
}
