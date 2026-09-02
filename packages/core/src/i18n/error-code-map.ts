// packages/core/src/i18n/error-code-map.ts
//
// M13 seam: maps a server/S3/token machine `code` (the same value the C1-C2
// server changes started emitting and C6's uploadErrorFromResponse now
// surfaces on the client) to an EXISTING key in the ErrorMessages catalog.
// No new locale strings are added here — every target is a key that already
// exists in every locale bundle. This is the one place P8 (drive-browse error
// UI) and any alerting/telemetry consumer should call to turn a `.code` into
// a human-displayable i18n key.

import type { ErrorMessages } from './types'

/**
 * Map an upload/server/token error `code` to a key of ErrorMessages.
 * Unknown or absent codes fall back to a generic message so the UI never
 * shows a raw, unlocalized machine code to the end user.
 */
export function errorCodeToMessageKey(
    code: string | undefined,
): keyof ErrorMessages {
    if (!code) return 'uploadFailed'

    switch (code) {
        // Upload-token verification codes (@useupup/server's UploadTokenErrorCode)
        case 'expired':
            return 'failedToRefreshExpiredToken'
        case 'bad_signature':
        case 'malformed':
            return 'temporaryCredentialsInvalid'

        // S3 / S3-compatible provider error codes
        case 'SignatureDoesNotMatch':
            return 'temporaryCredentialsInvalid'
        case 'AccessDenied':
            return 'unauthorizedAccess'
        case 'EntityTooLarge':
            return 'fileTooLarge'
        case 'InvalidBucketName':
        case 'NoSuchBucket':
            return 'missingRequiredConfiguration'

        // @useupup/server machine codes (UpupErrorCode)
        case 'PRESIGN_FAILED':
            return 'signedUrlGenerationFailed'
        case 'STORAGE_ERROR':
            return 'presignedUrlInvalid'
        case 'BAD_REQUEST':
            return 'invalidUploadEndpoint'
        case 'AUTH_PROVIDER_ERROR':
            return 'dropboxAuthFailed'
        case 'AUTH_EXPIRED':
            return 'failedToRefreshExpiredToken'
        case 'AUTH_DENIED':
            return 'unauthorizedAccess'
        case 'CORS_ERROR':
            return 'corsMisconfigured'
        case 'QUOTA_EXCEEDED':
            return 'storageQuotaExceeded'

        // Drive-controller reauth-vs-app-auth distinction (F-427, consumed by C8)
        case 'UNAUTHENTICATED':
            return 'unauthorizedAccess'

        default:
            return 'uploadFailedWithCode'
    }
}
