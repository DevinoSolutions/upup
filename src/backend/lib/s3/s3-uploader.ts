import {
    CompleteMultipartUploadCommand,
    CreateMultipartUploadCommand,
    GetObjectCommand,
    S3Client,
    S3ClientConfig,
    UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuid } from 'uuid'
import { fileGetChunksCount } from '../../../shared/lib/file'
import {
    UploadError,
    UploadErrorType,
    UpupProvider,
} from '../../../shared/types'
import { FileParams } from '../../types'
import { fileValidateParams } from '../file'
import awsGenerateSignatureHeaders from './s3-generate-signature-headers'

export default class S3Uploader {
    private s3Client: S3Client
    private fileBucketKey: string
    private fileUploadId = ''
    private expiresIn = 3600 // 1 hour

    constructor(
        private fileParams: FileParams,
        private s3ClientConfig: S3ClientConfig,
        private bucketName: string,
        private origin: string,
        private provider: UpupProvider,
    ) {
        // Validate file params
        fileValidateParams(this.fileParams)

        // Initialize S3 client
        this.s3Client = new S3Client(this.s3ClientConfig)

        // Generate unique key for the file
        this.fileBucketKey = `${uuid()}-${this.fileParams.name}`
    }

    private async updateCORSConfig() {
        const urlMap = {
            [UpupProvider.AWS]: `https://${this.bucketName}.s3.${this.s3ClientConfig.region}.amazonaws.com/?cors`,
            [UpupProvider.BackBlaze]: `${this.s3ClientConfig.endpoint}/${this.bucketName}/?cors=null`,
            [UpupProvider.DigitalOcean]: `https://${this.bucketName}.${this.s3ClientConfig.region}.digitaloceanspaces.com/?cors`,
            [UpupProvider.Azure]: ``,
        }
        const url = urlMap[this.provider]

        const corsConfig = `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration>
    <CORSRule>
        <ID>Allow S3 Operations from my site: ${this.origin}</ID>
        <AllowedOrigin>${this.origin}</AllowedOrigin>
        <AllowedHeader>*</AllowedHeader>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <ExposeHeader>ETag</ExposeHeader>
        <MaxAgeSeconds>3600</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>`

        const response = await fetch(url, {
            method: 'PUT',
            body: corsConfig,
            headers: awsGenerateSignatureHeaders({
                corsConfig,
                bucketName: this.bucketName,
                s3ClientConfig: this.s3ClientConfig,
                provider: this.provider,
            }),
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
    }

    private async generateFileMultipartUploadID() {
        try {
            const response = await this.s3Client.send(
                new CreateMultipartUploadCommand({
                    Bucket: this.bucketName,
                    Key: this.fileBucketKey,
                    ContentType: this.fileParams.type,
                    ChecksumAlgorithm: 'SHA256',
                    // Add custom metadata to track upload status
                    Metadata: {
                        'x-amz-resume-enabled': 'true',
                    },
                }),
            )
            this.fileUploadId = response.UploadId || ''
        } catch (error) {
            throw new UploadError(
                (error as Error).message,
                UploadErrorType.MULTIPART_UPLOAD_ID_ERROR,
                false,
            )
        }
    }

    private async generatePreSignedUrls() {
        try {
            const chunksCount = fileGetChunksCount(this.fileParams.size)
            const promises = []

            for (let index = 0; index < chunksCount; index++)
                promises.push(
                    getSignedUrl(
                        this.s3Client,
                        new UploadPartCommand({
                            Bucket: this.bucketName,
                            Key: this.fileBucketKey,
                            UploadId: this.fileUploadId,
                            PartNumber: index + 1,
                            ChecksumAlgorithm: 'SHA256',
                        }),
                        {
                            expiresIn: this.expiresIn,
                        },
                    ),
                )

            const signedUrls = await Promise.all(promises)

            return signedUrls.map((signedUrl, index) => {
                return {
                    signedUrl: signedUrl,
                    PartNumber: index + 1,
                }
            })
        } catch (error) {
            throw new UploadError(
                (error as Error).message,
                UploadErrorType.PRESIGNED_URL_ERROR,
                false,
            )
        }
    }

    private async generateSignedUrl() {
        try {
            const url = await getSignedUrl(
                this.s3Client,
                new GetObjectCommand({
                    Bucket: this.bucketName,
                    Key: this.fileBucketKey,
                }),
                {
                    expiresIn: this.expiresIn,
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

    async finalise(chunks: Array<{ PartNumber: number }>) {
        const sortedChunks = chunks.sort((a, b) => a.PartNumber - b.PartNumber)

        return this.s3Client.send(
            new CompleteMultipartUploadCommand({
                Bucket: this.bucketName,
                Key: this.fileBucketKey,
                UploadId: this.fileUploadId,
                MultipartUpload: {
                    // ordering the parts to make sure they are in the right order
                    Parts: sortedChunks,
                },
            }),
        )
    }

    async begin() {
        await this.updateCORSConfig()
        await this.generateFileMultipartUploadID()
        const presignedUrls = await this.generatePreSignedUrls()
        const publicUrl = await this.generateSignedUrl()

        return { presignedUrls, publicUrl }
    }
}
