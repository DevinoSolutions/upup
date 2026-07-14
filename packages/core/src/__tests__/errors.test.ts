import { describe, it, expect } from 'vitest'
import {
    UpupErrorCode,
    UpupError,
    UpupAuthError,
    UpupNetworkError,
    UpupValidationError,
    UpupQuotaError,
    UpupStorageError,
    parseErrorBody,
    uploadErrorFromResponse,
} from '../errors'

// ─────────────────────────────────────────────
// UpupErrorCode enum
// ─────────────────────────────────────────────
describe('UpupErrorCode', () => {
    it('defines all expected error codes', () => {
        const expected = [
            'AUTH_EXPIRED',
            'AUTH_DENIED',
            'AUTH_PROVIDER_ERROR',
            'FILE_TOO_LARGE',
            'FILE_TOO_SMALL',
            'TYPE_MISMATCH',
            'LIMIT_EXCEEDED',
            'TOTAL_SIZE_EXCEEDED',
            'DUPLICATE',
            'MIN_FILES_NOT_MET',
            'UPLOAD_FAILED',
            'UPLOAD_ABORTED',
            'PRESIGN_FAILED',
            'CORS_ERROR',
            'PIPELINE_STEP_FAILED',
            'HEIC_CONVERSION_FAILED',
            'NETWORK_ERROR',
            'TIMEOUT',
            'STORAGE_ERROR',
            'QUOTA_EXCEEDED',
            'NO_UPLOAD_TARGET',
            'BAD_REQUEST',
            'AUTH_REQUIRED',
        ]
        for (const code of expected) {
            expect(Object.values(UpupErrorCode)).toContain(code)
        }
    })

    it('has 23 distinct error codes', () => {
        expect(new Set(Object.values(UpupErrorCode)).size).toBe(23)
    })
})

// ─────────────────────────────────────────────
// UpupError (base)
// ─────────────────────────────────────────────
describe('UpupError', () => {
    it('is an instance of Error', () => {
        const err = new UpupError(
            'Something went wrong',
            UpupErrorCode.UPLOAD_FAILED,
        )
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

    it('has an optional status field, undefined by default', () => {
        const err = new UpupError('msg', UpupErrorCode.UPLOAD_FAILED)
        expect(err.status).toBeUndefined()
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
        expect(new UpupAuthError('msg', 'S3').code).toBe(
            UpupErrorCode.AUTH_PROVIDER_ERROR,
        )
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
        expect(new UpupNetworkError('msg').code).toBe(
            UpupErrorCode.NETWORK_ERROR,
        )
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
        expect(
            new UpupValidationError(
                'too large',
                UpupErrorCode.FILE_TOO_LARGE,
                file,
            ),
        ).toBeInstanceOf(UpupError)
    })

    it('sets code to the reason', () => {
        const err = new UpupValidationError(
            'too large',
            UpupErrorCode.FILE_TOO_LARGE,
            file,
        )
        expect(err.code).toBe(UpupErrorCode.FILE_TOO_LARGE)
    })

    it('stores the reason', () => {
        const err = new UpupValidationError(
            'type mismatch',
            UpupErrorCode.TYPE_MISMATCH,
            file,
        )
        expect(err.reason).toBe(UpupErrorCode.TYPE_MISMATCH)
    })

    it('stores the file reference', () => {
        const err = new UpupValidationError(
            'duplicate',
            UpupErrorCode.DUPLICATE,
            file,
        )
        expect(err.file).toBe(file)
    })

    it('is not retryable', () => {
        expect(
            new UpupValidationError('msg', UpupErrorCode.LIMIT_EXCEEDED, file)
                .retryable,
        ).toBe(false)
    })
})

// ─────────────────────────────────────────────
// UpupQuotaError
// ─────────────────────────────────────────────
describe('UpupQuotaError', () => {
    it('is an instance of UpupError', () => {
        expect(new UpupQuotaError('quota exceeded', 100, 110)).toBeInstanceOf(
            UpupError,
        )
    })

    it('sets code to QUOTA_EXCEEDED', () => {
        expect(new UpupQuotaError('msg', 100, 110).code).toBe(
            UpupErrorCode.QUOTA_EXCEEDED,
        )
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
        expect(new UpupStorageError('msg', 'S3', 'upload')).toBeInstanceOf(
            UpupError,
        )
    })

    it('sets code to STORAGE_ERROR', () => {
        expect(new UpupStorageError('msg', 'S3', 'presign').code).toBe(
            UpupErrorCode.STORAGE_ERROR,
        )
    })

    it('stores provider and operation', () => {
        const err = new UpupStorageError('msg', 'GCS', 'multipart-init')
        expect(err.provider).toBe('GCS')
        expect(err.operation).toBe('multipart-init')
    })

    it('is not retryable', () => {
        expect(new UpupStorageError('msg', 'S3', 'upload').retryable).toBe(
            false,
        )
    })

    it('accepts the widened multipart-sign-part and multipart-abort operations', () => {
        expect(
            new UpupStorageError('msg', 'S3', 'multipart-sign-part').operation,
        ).toBe('multipart-sign-part')
        expect(
            new UpupStorageError('msg', 'S3', 'multipart-abort').operation,
        ).toBe('multipart-abort')
    })
})

// ─────────────────────────────────────────────
// parseErrorBody (P4/C6)
// ─────────────────────────────────────────────
describe('parseErrorBody', () => {
    it('parses a JSON server error body with code+error', () => {
        const parsed = parseErrorBody(
            JSON.stringify({
                error: 'Invalid upload token',
                code: 'bad_signature',
            }),
        )
        expect(parsed).toEqual({
            code: 'bad_signature',
            message: 'Invalid upload token',
        })
    })

    it('parses a JSON server error body with code+message', () => {
        const parsed = parseErrorBody(
            JSON.stringify({
                message: 'Presign failed',
                code: 'PRESIGN_FAILED',
            }),
        )
        expect(parsed).toEqual({
            code: 'PRESIGN_FAILED',
            message: 'Presign failed',
        })
    })

    it('parses an S3 XML error body', () => {
        const xml =
            '<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>SignatureDoesNotMatch</Code><Message>The request signature we calculated does not match the signature you provided.</Message></Error>'
        const parsed = parseErrorBody(xml)
        expect(parsed).toEqual({
            code: 'SignatureDoesNotMatch',
            message:
                'The request signature we calculated does not match the signature you provided.',
        })
    })

    it('falls back to a truncated text snippet for an unrecognized body', () => {
        const parsed = parseErrorBody('plain text failure, not json or xml')
        expect(parsed).toEqual({
            code: undefined,
            message: 'plain text failure, not json or xml',
        })
    })

    it('truncates a long plain-text body to 200 chars', () => {
        const long = 'x'.repeat(500)
        const parsed = parseErrorBody(long)
        expect(parsed.message.length).toBe(200)
    })

    it('handles an undefined/empty body gracefully', () => {
        expect(parseErrorBody(undefined)).toEqual({
            code: undefined,
            message: '',
        })
        expect(parseErrorBody('')).toEqual({ code: undefined, message: '' })
    })
})

// ─────────────────────────────────────────────
// uploadErrorFromResponse (P4/C6)
// ─────────────────────────────────────────────
describe('uploadErrorFromResponse', () => {
    it('builds a UpupStorageError from an S3 XML body (kind: storage)', () => {
        const xml =
            '<Error><Code>SignatureDoesNotMatch</Code><Message>bad sig</Message></Error>'
        const err = uploadErrorFromResponse({
            status: 403,
            statusText: 'Forbidden',
            body: xml,
            kind: 'storage',
            operation: 'upload',
        })
        expect(err).toBeInstanceOf(UpupStorageError)
        expect(err.code).toBe('SignatureDoesNotMatch')
        expect(err.status).toBe(403)
    })

    it('builds a typed error from a server JSON body carrying its own code', () => {
        const err = uploadErrorFromResponse({
            status: 403,
            statusText: 'Forbidden',
            body: JSON.stringify({
                error: 'Invalid upload token',
                code: 'bad_signature',
            }),
            kind: 'storage',
            operation: 'multipart-sign-part',
        })
        expect(err.code).toBe('bad_signature')
        expect(err.status).toBe(403)
    })

    it('builds a UpupAuthError when kind is auth', () => {
        const err = uploadErrorFromResponse({
            status: 401,
            statusText: 'Unauthorized',
            body: JSON.stringify({
                error: 'Unauthorized',
                code: 'UNAUTHENTICATED',
            }),
            kind: 'auth',
            provider: 'google-drive',
        })
        expect(err).toBeInstanceOf(UpupAuthError)
        expect(err.code).toBe('UNAUTHENTICATED')
    })

    it('falls back to the status/statusText when the body is empty', () => {
        const err = uploadErrorFromResponse({
            status: 500,
            statusText: 'Internal Server Error',
            body: '',
            kind: 'network',
        })
        expect(err.message).toContain('500')
        expect(err.status).toBe(500)
    })
})
