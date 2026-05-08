import { describe, it, expect } from 'vitest'
import {
    UpupErrorCode,
    UpupError,
    UpupAuthError,
    UpupNetworkError,
    UpupValidationError,
    UpupQuotaError,
    UpupStorageError,
} from '../errors'

// ─────────────────────────────────────────────
// UpupErrorCode enum
// ─────────────────────────────────────────────
describe('UpupErrorCode', () => {
    it('defines all expected error codes', () => {
        const expected = [
            'AUTH_EXPIRED', 'AUTH_DENIED', 'AUTH_PROVIDER_ERROR',
            'FILE_TOO_LARGE', 'FILE_TOO_SMALL', 'TYPE_MISMATCH',
            'LIMIT_EXCEEDED', 'TOTAL_SIZE_EXCEEDED', 'DUPLICATE',
            'MIN_FILES_NOT_MET', 'UPLOAD_FAILED', 'UPLOAD_ABORTED',
            'PRESIGN_FAILED', 'CORS_ERROR', 'PIPELINE_STEP_FAILED',
            'HEIC_CONVERSION_FAILED', 'NETWORK_ERROR', 'TIMEOUT',
            'STORAGE_ERROR', 'QUOTA_EXCEEDED', 'NO_UPLOAD_TARGET',
        ]
        for (const code of expected) {
            expect(Object.values(UpupErrorCode)).toContain(code)
        }
    })

    it('has 21 distinct error codes', () => {
        expect(new Set(Object.values(UpupErrorCode)).size).toBe(21)
    })
})

// ─────────────────────────────────────────────
// UpupError (base)
// ─────────────────────────────────────────────
describe('UpupError', () => {
    it('is an instance of Error', () => {
        const err = new UpupError('Something went wrong', UpupErrorCode.UPLOAD_FAILED)
        expect(err).toBeInstanceOf(Error)
    })

    it('sets name to UpupError', () => {
        const err = new UpupError('msg', UpupErrorCode.UPLOAD_FAILED)
        expect(err.name).toBe('UpupError')
    })

    it('stores the message', () => {
        const err = new UpupError('custom message', UpupErrorCode.TIMEOUT)
        expect(err.message).toBe('custom message')
    })

    it('stores the error code', () => {
        const err = new UpupError('msg', UpupErrorCode.CORS_ERROR)
        expect(err.code).toBe('CORS_ERROR')
    })

    it('defaults retryable to false', () => {
        const err = new UpupError('msg', UpupErrorCode.UPLOAD_FAILED)
        expect(err.retryable).toBe(false)
    })

    it('accepts retryable=true', () => {
        const err = new UpupError('msg', UpupErrorCode.NETWORK_ERROR, true)
        expect(err.retryable).toBe(true)
    })
})

// ─────────────────────────────────────────────
// UpupAuthError
// ─────────────────────────────────────────────
describe('UpupAuthError', () => {
    it('is an instance of UpupError', () => {
        expect(new UpupAuthError('expired', 'S3')).toBeInstanceOf(UpupError)
    })

    it('sets name to UpupAuthError', () => {
        expect(new UpupAuthError('msg', 'GCS').name).toBe('UpupAuthError')
    })

    it('sets code to AUTH_PROVIDER_ERROR', () => {
        expect(new UpupAuthError('msg', 'S3').code).toBe(UpupErrorCode.AUTH_PROVIDER_ERROR)
    })

    it('stores the provider', () => {
        expect(new UpupAuthError('msg', 'Dropbox').provider).toBe('Dropbox')
    })

    it('is not retryable', () => {
        expect(new UpupAuthError('msg', 'S3').retryable).toBe(false)
    })
})

// ─────────────────────────────────────────────
// UpupNetworkError
// ─────────────────────────────────────────────
describe('UpupNetworkError', () => {
    it('is an instance of UpupError', () => {
        expect(new UpupNetworkError('timeout')).toBeInstanceOf(UpupError)
    })

    it('sets code to NETWORK_ERROR', () => {
        expect(new UpupNetworkError('msg').code).toBe(UpupErrorCode.NETWORK_ERROR)
    })

    it('is retryable', () => {
        expect(new UpupNetworkError('msg').retryable).toBe(true)
    })

    it('stores optional HTTP status', () => {
        expect(new UpupNetworkError('msg', 503).status).toBe(503)
    })

    it('status is undefined when not provided', () => {
        expect(new UpupNetworkError('msg').status).toBeUndefined()
    })
})

// ─────────────────────────────────────────────
// UpupValidationError
// ─────────────────────────────────────────────
describe('UpupValidationError', () => {
    const file = new File(['data'], 'test.txt')

    it('is an instance of UpupError', () => {
        expect(new UpupValidationError('too large', UpupErrorCode.FILE_TOO_LARGE, file)).toBeInstanceOf(UpupError)
    })

    it('sets code to the reason', () => {
        const err = new UpupValidationError('too large', UpupErrorCode.FILE_TOO_LARGE, file)
        expect(err.code).toBe(UpupErrorCode.FILE_TOO_LARGE)
    })

    it('stores the reason', () => {
        const err = new UpupValidationError('type mismatch', UpupErrorCode.TYPE_MISMATCH, file)
        expect(err.reason).toBe(UpupErrorCode.TYPE_MISMATCH)
    })

    it('stores the file reference', () => {
        const err = new UpupValidationError('duplicate', UpupErrorCode.DUPLICATE, file)
        expect(err.file).toBe(file)
    })

    it('is not retryable', () => {
        expect(new UpupValidationError('msg', UpupErrorCode.LIMIT_EXCEEDED, file).retryable).toBe(false)
    })
})

// ─────────────────────────────────────────────
// UpupQuotaError
// ─────────────────────────────────────────────
describe('UpupQuotaError', () => {
    it('is an instance of UpupError', () => {
        expect(new UpupQuotaError('quota exceeded', 100, 110)).toBeInstanceOf(UpupError)
    })

    it('sets code to QUOTA_EXCEEDED', () => {
        expect(new UpupQuotaError('msg', 100, 110).code).toBe(UpupErrorCode.QUOTA_EXCEEDED)
    })

    it('stores limit and used', () => {
        const err = new UpupQuotaError('msg', 50, 60)
        expect(err.limit).toBe(50)
        expect(err.used).toBe(60)
    })

    it('is not retryable', () => {
        expect(new UpupQuotaError('msg', 1, 2).retryable).toBe(false)
    })
})

// ─────────────────────────────────────────────
// UpupStorageError
// ─────────────────────────────────────────────
describe('UpupStorageError', () => {
    it('is an instance of UpupError', () => {
        expect(new UpupStorageError('msg', 'S3', 'upload')).toBeInstanceOf(UpupError)
    })

    it('sets code to STORAGE_ERROR', () => {
        expect(new UpupStorageError('msg', 'S3', 'presign').code).toBe(UpupErrorCode.STORAGE_ERROR)
    })

    it('stores provider and operation', () => {
        const err = new UpupStorageError('msg', 'GCS', 'multipart-init')
        expect(err.provider).toBe('GCS')
        expect(err.operation).toBe('multipart-init')
    })

    it('is not retryable', () => {
        expect(new UpupStorageError('msg', 'S3', 'upload').retryable).toBe(false)
    })
})
