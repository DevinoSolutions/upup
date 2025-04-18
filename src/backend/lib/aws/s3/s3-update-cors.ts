import { S3ClientConfig } from '@aws-sdk/client-s3'
import {
    UploadError,
    UploadErrorType,
    UpupProvider,
} from '../../../../shared/types'
import awsGenerateSignatureHeaders from '../aws-generate-signature-headers'

export default async function s3UpdateCORS(
    origin: string,
    bucketName: string,
    config: S3ClientConfig,
    provider: UpupProvider,
) {
    const urlMap = {
        [UpupProvider.AWS]: `https://${bucketName}.s3.${config.region}.amazonaws.com/?cors`,
        [UpupProvider.BackBlaze]: `${config.endpoint}/${bucketName}/?cors=null`,
        [UpupProvider.DigitalOcean]: `https://${bucketName}.${config.region}.digitaloceanspaces.com/?cors`,
        [UpupProvider.Azure]: ``,
    }
    const url = urlMap[provider]

    const corsConfig = `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration>
    <CORSRule>
        <ID>Allow S3 Operations from my site: ${origin}</ID>
        <AllowedOrigin>${origin}</AllowedOrigin>
        <AllowedHeader>*</AllowedHeader>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <ExposeHeader>ETag</ExposeHeader>
        <MaxAgeSeconds>3600</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>`

    const headers = awsGenerateSignatureHeaders(
        corsConfig,
        bucketName,
        config,
        provider,
    )

    const response = await fetch(url, {
        method: 'PUT',
        body: corsConfig,
        headers,
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new UploadError(
            errorText,
            UploadErrorType.CORS_CONFIG_ERROR,
            false,
            response.status,
        )
    }

    const data = await response.text()
    return data
}
