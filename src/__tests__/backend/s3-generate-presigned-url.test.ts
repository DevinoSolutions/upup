import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import s3GeneratePresignedUrl from '../../backend/lib/aws/s3/s3-generate-presigned-url'
import s3UpdateCORS from '../../backend/lib/aws/s3/s3-update-cors'
import { UploadError, UploadErrorType, UpupProvider } from '../../shared/types'

// Mock external dependencies
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(config => {
        // Validate required config parameters
        if (
            !config.credentials?.accessKeyId ||
            !config.credentials?.secretAccessKey
        )
            throw new Error('Missing required credentials')
        if (!config.region) throw new Error('Missing required region')

        return {
            config,
        }
    }),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
}))
jest.mock('@aws-sdk/s3-request-presigner')
jest.mock('../../backend/lib/aws/s3/s3-update-cors')

describe('s3GeneratePresignedUrl', () => {
    // Common test parameters
    const baseParams = {
        fileParams: {
            name: 'test.jpg',
            type: 'image/jpeg',
            size: 1024,
        },
        bucketName: 'test-bucket',
        s3ClientConfig: {
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
            },
        },
        origin: 'http://localhost:3000',
        provider: UpupProvider.AWS,
    }

    // Helper function to call the S3 function with defaults
    const callPresignedUrlFunction = (overrides?: Record<string, any>) =>
        s3GeneratePresignedUrl({ ...baseParams, ...overrides })

    beforeEach(() => {
        jest.clearAllMocks()
        ;(getSignedUrl as jest.Mock).mockResolvedValue(
            'https://test-presigned-url.com',
        )
        ;(s3UpdateCORS as jest.Mock).mockResolvedValue('CORS updated')
    })

    it('should generate a presigned URL successfully', async () => {
        const result = await callPresignedUrlFunction({ expiresIn: 3600 })

        expect(result).toEqual({
            key: expect.stringContaining('-test.jpg'),
            publicUrl: expect.stringContaining('https://'),
            uploadUrl: 'https://test-presigned-url.com',
            expiresIn: 3600,
        })

        expect(S3Client).toHaveBeenCalledWith(baseParams.s3ClientConfig)
        expect(s3UpdateCORS).toHaveBeenCalledWith(
            baseParams.origin,
            baseParams.bucketName,
            baseParams.s3ClientConfig,
            baseParams.provider,
        )
    })

    it('should use default expiresIn when not provided', async () => {
        const result = await callPresignedUrlFunction()
        expect(result.expiresIn).toBe(3600)
    })

    it('should handle file validation errors', async () => {
        await expect(
            callPresignedUrlFunction({
                fileParams: { ...baseParams.fileParams, name: '' },
            }),
        ).rejects.toThrow(UploadError)
    })

    it('should handle CORS configuration errors', async () => {
        ;(s3UpdateCORS as jest.Mock).mockRejectedValue(
            new UploadError(
                'CORS update failed',
                UploadErrorType.CORS_CONFIG_ERROR,
            ),
        )
        await expect(callPresignedUrlFunction()).rejects.toThrow(UploadError)
    })

    it('should handle presigned URL generation errors', async () => {
        ;(getSignedUrl as jest.Mock).mockRejectedValue(
            new Error('Failed to generate URL'),
        )
        await expect(callPresignedUrlFunction()).rejects.toThrow(UploadError)
    })

    it('should generate correct key format', async () => {
        const result = await callPresignedUrlFunction()
        expect(result.key).toMatch(/^[0-9a-f-]+-test\.jpg$/)
    })

    describe('S3 client configuration validation', () => {
        const testCases = [
            {
                description: 'missing region',
                config: {
                    credentials: {
                        accessKeyId: 'test-key',
                        secretAccessKey: 'test-secret',
                    },
                },
                expectedError: 'Missing required region',
            },
            {
                description: 'incomplete credentials (missing secretAccessKey)',
                config: {
                    region: 'us-east-1',
                    credentials: {
                        accessKeyId: 'test-key',
                    },
                },
                expectedError: 'Missing required credentials',
            },
            {
                description: 'missing credentials entirely',
                config: {
                    region: 'us-east-1',
                },
                expectedError: 'Missing required credentials',
            },
        ]

        test.each(testCases)(
            'should throw error when $description',
            async ({ config, expectedError }) => {
                await expect(
                    callPresignedUrlFunction({
                        s3ClientConfig: config as any,
                    }),
                ).rejects.toThrow(
                    new UploadError(
                        expectedError,
                        UploadErrorType.SIGNED_URL_ERROR,
                    ),
                )

                expect(S3Client).toHaveBeenCalledWith(config)
            },
        )
    })
})
