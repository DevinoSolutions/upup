import { ClientSecretCredential } from '@azure/identity'
import {
    BlobSASPermissions,
    BlobServiceClient,
    SASProtocol,
    generateBlobSASQueryParameters,
} from '@azure/storage-blob'
import azureGetTemporaryCredentials from 'backend/lib/azure/azure-get-temporary-credentials'
import fileValidateParams from 'backend/lib/files/file-validate-params'
import { AzureSasUrlParams } from 'backend/types'
import {
    PresignedUrlResponse,
    UploadError,
    UploadErrorType,
} from 'shared/types/StorageSDK'

export default async function azureGenerateSasUrl({
    fileParams,
    containerName,
    credentials,
    expiresIn = 3600,
}: AzureSasUrlParams): Promise<PresignedUrlResponse> {
    try {
        // Validate file params
        fileValidateParams(fileParams)

        // Create Azure AD credentials
        const credential = new ClientSecretCredential(
            credentials.tenantId,
            credentials.clientId,
            credentials.clientSecret,
        )

        // Create blob service client
        const blobServiceClient = new BlobServiceClient(
            `https://${credentials.storageAccount}.blob.core.windows.net`,
            credential,
        )

        // Get user delegation key
        const userDelegationKey =
            await azureGetTemporaryCredentials(blobServiceClient)

        const { name: fileName, type: contentType } = fileParams
        const blobName = `uploads/${Date.now()}-${fileName}`

        // Get container client
        const containerClient =
            blobServiceClient.getContainerClient(containerName)

        // Get blob client
        const blobClient = containerClient.getBlobClient(blobName)

        // Generate SAS token
        const sasToken = generateBlobSASQueryParameters(
            {
                containerName,
                blobName,
                permissions: BlobSASPermissions.parse('racw'),
                startsOn: new Date(),
                expiresOn: new Date(Date.now() + expiresIn * 1000),
                protocol: SASProtocol.Https,
                contentType,
            },
            userDelegationKey,
            credentials.storageAccount,
        ).toString()

        // Construct full URL
        const uploadUrl = `${blobClient.url}?${sasToken}`

        return {
            key: blobName,
            publicUrl: blobClient.url,
            uploadUrl,
            expiresIn,
        }
    } catch (error) {
        if (error instanceof UploadError) throw error

        throw new UploadError(
            (error as Error).message,
            UploadErrorType.PRESIGNED_URL_ERROR,
            false,
            500,
        )
    }
}
