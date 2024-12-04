import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import s3GeneratePresignedUrl from '../../backend/lib/aws/s3/s3-generate-presigned-url'
import s3UpdateCORS from '../../backend/lib/aws/s3/s3-update-cors'
import {
    Provider,
    UploadError,
    UploadErrorType,
} from '../../shared/types/StorageSDK'

// Mock external dependencies
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(config => {
        // Validate required config parameters
        if (
            !config.credentials?.accessKeyId ||
            !config.credentials?.secretAccessKey
        ) {
            throw new Error('Missing required credentials')
        }
        if (!config.region) {
            throw new Error('Missing required region')
        }
        return {
            config,
        }
    }),
    PutObjectCommand: jest.fn(),
}))
jest.mock('@aws-sdk/s3-request-presigner')
jest.mock('../../backend/lib/aws/s3/s3-update-cors')

describe('s3GeneratePresignedUrl', () => {
    // Test data setup
    const mockFileParams = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024,
    }

    const mockBucketName = 'test-bucket'
    const mockS3Config = {
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
        },
    }

    const mockOrigin = 'http://localhost:3000'
    const mockExpiresIn = 3600
    const mockProvider = Provider.AWS

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()

        // Setup default mock implementations
        ;(getSignedUrl as jest.Mock).mockResolvedValue(
            'https://test-presigned-url.com',
        )
        ;(s3UpdateCORS as jest.Mock).mockResolvedValue('CORS updated')
    })

    it('should generate a presigned URL successfully', async () => {
        const result = await s3GeneratePresignedUrl({
            fileParams: mockFileParams,
            bucketName: mockBucketName,
            s3ClientConfig: mockS3Config,
            origin: mockOrigin,
            expiresIn: mockExpiresIn,
            provider: mockProvider,
        })

        // Verify the response structure
        expect(result).toEqual({
            key: expect.stringContaining('uploads/'),
            publicUrl: expect.stringContaining('https://'),
            uploadUrl: 'https://test-presigned-url.com',
            expiresIn: mockExpiresIn,
        })

        // Verify S3Client was initialized correctly
        expect(S3Client).toHaveBeenCalledWith(mockS3Config)

        // Verify CORS was updated
        expect(s3UpdateCORS).toHaveBeenCalledWith(
            mockOrigin,
            mockBucketName,
            mockS3Config,
            mockProvider,
        )
    })

    it('should use default expiresIn when not provided', async () => {
        const result = await s3GeneratePresignedUrl({
            fileParams: mockFileParams,
            bucketName: mockBucketName,
            s3ClientConfig: mockS3Config,
            origin: mockOrigin,
            provider: mockProvider,
        })

        expect(result.expiresIn).toBe(3600) // Default value
    })

    it('should handle file validation errors', async () => {
        const invalidFileParams = {
            name: '', // Invalid empty name
            type: 'image/jpeg',
            size: 1024,
        }

        await expect(
            s3GeneratePresignedUrl({
                fileParams: invalidFileParams,
                bucketName: mockBucketName,
                s3ClientConfig: mockS3Config,
                origin: mockOrigin,
                provider: mockProvider,
            }),
        ).rejects.toThrow(UploadError)
    })

    it('should handle CORS configuration errors', async () => {
        // Mock CORS update to fail
        ;(s3UpdateCORS as jest.Mock).mockRejectedValue(
            new UploadError(
                'CORS update failed',
                UploadErrorType.CORS_CONFIG_ERROR,
            ),
        )

        await expect(
            s3GeneratePresignedUrl({
                fileParams: mockFileParams,
                bucketName: mockBucketName,
                s3ClientConfig: mockS3Config,
                origin: mockOrigin,
                provider: mockProvider,
            }),
        ).rejects.toThrow(UploadError)
    })

    it('should handle presigned URL generation errors', async () => {
        // Mock getSignedUrl to fail
        ;(getSignedUrl as jest.Mock).mockRejectedValue(
            new Error('Failed to generate URL'),
        )

        await expect(
            s3GeneratePresignedUrl({
                fileParams: mockFileParams,
                bucketName: mockBucketName,
                s3ClientConfig: mockS3Config,
                origin: mockOrigin,
                provider: mockProvider,
            }),
        ).rejects.toThrow(UploadError)
    })

    it('should generate correct key format', async () => {
        const result = await s3GeneratePresignedUrl({
            fileParams: mockFileParams,
            bucketName: mockBucketName,
            s3ClientConfig: mockS3Config,
            origin: mockOrigin,
            provider: mockProvider,
        })

        // Verify key format: uploads/timestamp-filename
        expect(result.key).toMatch(/^uploads\/\d+-test\.jpg$/)
    })

    it('should throw error when s3ClientConfig is missing required credentials', async () => {
        const invalidConfig = {
            region: 'us-east-1',
            // Missing credentials
        }

        await expect(
            s3GeneratePresignedUrl({
                fileParams: mockFileParams,
                bucketName: mockBucketName,
                s3ClientConfig: invalidConfig,
                origin: mockOrigin,
                provider: mockProvider,
            }),
        ).rejects.toThrow(UploadError)

        expect(S3Client).toHaveBeenCalledWith(invalidConfig)
    })

    it('should throw error when region is missing from s3ClientConfig', async () => {
        const invalidConfig = {
            credentials: {
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
            },
            // Missing region
        }

        await expect(
            s3GeneratePresignedUrl({
                fileParams: mockFileParams,
                bucketName: mockBucketName,
                s3ClientConfig: invalidConfig,
                origin: mockOrigin,
                provider: mockProvider,
            }),
        ).rejects.toThrow(UploadError)

        expect(S3Client).toHaveBeenCalledWith(invalidConfig)
    })

    it('should throw error when credentials are incomplete', async () => {
        const invalidConfig = {
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test-key',
                // Missing secretAccessKey
            },
        }

        await expect(
            s3GeneratePresignedUrl({
                fileParams: mockFileParams,
                bucketName: mockBucketName,
                s3ClientConfig: invalidConfig as any,
                origin: mockOrigin,
                provider: mockProvider,
            }),
        ).rejects.toThrow(UploadError)

        expect(S3Client).toHaveBeenCalledWith(invalidConfig)
    })
})
