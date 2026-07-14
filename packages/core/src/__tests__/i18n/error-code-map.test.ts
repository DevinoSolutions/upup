import { describe, it, expect } from 'vitest'
import { errorCodeToMessageKey } from '../../i18n/error-code-map'
import { enUS } from '../../i18n/locales/en-US'

const catalogKeys = new Set(Object.keys(enUS.messages.errors))

describe('errorCodeToMessageKey', () => {
    it('maps every possible return value to a real key in the ErrorMessages catalog', () => {
        const sampleCodes = [
            'expired',
            'bad_signature',
            'malformed',
            'SignatureDoesNotMatch',
            'PRESIGN_FAILED',
            'STORAGE_ERROR',
            'BAD_REQUEST',
            'AUTH_PROVIDER_ERROR',
            'AUTH_EXPIRED',
            'UNAUTHENTICATED',
            'some-totally-unknown-code-xyz',
            undefined,
        ]
        for (const code of sampleCodes) {
            const key = errorCodeToMessageKey(code)
            expect(catalogKeys.has(key)).toBe(true)
        }
    })

    it('maps an unknown code to uploadFailedWithCode', () => {
        expect(errorCodeToMessageKey('totally-unrecognized-code')).toBe(
            'uploadFailedWithCode',
        )
    })

    it('maps undefined to uploadFailed (no code to report)', () => {
        expect(errorCodeToMessageKey(undefined)).toBe('uploadFailed')
    })

    it('maps the expired token code to failedToRefreshExpiredToken', () => {
        expect(errorCodeToMessageKey('expired')).toBe(
            'failedToRefreshExpiredToken',
        )
    })

    it('maps the S3 SignatureDoesNotMatch code to temporaryCredentialsInvalid', () => {
        expect(errorCodeToMessageKey('SignatureDoesNotMatch')).toBe(
            'temporaryCredentialsInvalid',
        )
    })
})
