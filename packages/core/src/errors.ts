export enum UpupErrorCode {
    AUTH_EXPIRED = 'AUTH_EXPIRED',
    AUTH_DENIED = 'AUTH_DENIED',
    AUTH_PROVIDER_ERROR = 'AUTH_PROVIDER_ERROR',
    FILE_TOO_LARGE = 'FILE_TOO_LARGE',
    FILE_TOO_SMALL = 'FILE_TOO_SMALL',
    TYPE_MISMATCH = 'TYPE_MISMATCH',
    LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
    TOTAL_SIZE_EXCEEDED = 'TOTAL_SIZE_EXCEEDED',
    DUPLICATE = 'DUPLICATE',
    MIN_FILES_NOT_MET = 'MIN_FILES_NOT_MET',
    UPLOAD_FAILED = 'UPLOAD_FAILED',
    UPLOAD_ABORTED = 'UPLOAD_ABORTED',
    PRESIGN_FAILED = 'PRESIGN_FAILED',
    CORS_ERROR = 'CORS_ERROR',
    PIPELINE_STEP_FAILED = 'PIPELINE_STEP_FAILED',
    HEIC_CONVERSION_FAILED = 'HEIC_CONVERSION_FAILED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT',
    STORAGE_ERROR = 'STORAGE_ERROR',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    NO_UPLOAD_TARGET = 'NO_UPLOAD_TARGET',
    BAD_REQUEST = 'BAD_REQUEST',
    AUTH_REQUIRED = 'AUTH_REQUIRED',
}

export type RestrictionFailedReason =
    | UpupErrorCode.TYPE_MISMATCH
    | UpupErrorCode.FILE_TOO_LARGE
    | UpupErrorCode.FILE_TOO_SMALL
    | UpupErrorCode.LIMIT_EXCEEDED
    | UpupErrorCode.TOTAL_SIZE_EXCEEDED
    | UpupErrorCode.DUPLICATE
    | 'BEFORE_FILE_ADDED_REJECTED'

export class UpupError extends Error {
    code: string
    retryable: boolean
    /** Optional HTTP status the error originated from (set by uploadErrorFromResponse). */
    status?: number
    constructor(message: string, code: string, retryable = false) {
        super(message)
        this.name = 'UpupError'
        this.code = code
        this.retryable = retryable
    }
}

export class UpupAuthError extends UpupError {
    provider: string
    constructor(message: string, provider: string) {
        super(message, UpupErrorCode.AUTH_PROVIDER_ERROR, false)
        this.name = 'UpupAuthError'
        this.provider = provider
    }
}

export class UpupNetworkError extends UpupError {
    constructor(message: string, status?: number) {
        super(message, UpupErrorCode.NETWORK_ERROR, true)
        this.name = 'UpupNetworkError'
        if (status !== undefined) this.status = status
    }
}

export class UpupValidationError extends UpupError {
    reason: RestrictionFailedReason
    file: File
    constructor(message: string, reason: RestrictionFailedReason, file: File) {
        super(message, reason, false)
        this.name = 'UpupValidationError'
        this.reason = reason
        this.file = file
    }
}

export class UpupQuotaError extends UpupError {
    limit: number
    used: number
    constructor(message: string, limit: number, used: number) {
        super(message, UpupErrorCode.QUOTA_EXCEEDED, false)
        this.name = 'UpupQuotaError'
        this.limit = limit
        this.used = used
    }
}

export class UpupStorageError extends UpupError {
    provider: string
    operation:
        | 'presign'
        | 'upload'
        | 'multipart-init'
        | 'multipart-complete'
        | 'multipart-sign-part'
        | 'multipart-abort'
    constructor(
        message: string,
        provider: string,
        operation: UpupStorageError['operation'],
    ) {
        super(message, UpupErrorCode.STORAGE_ERROR, false)
        this.name = 'UpupStorageError'
        this.provider = provider
        this.operation = operation
    }
}

export class UpupConfigError extends UpupError {
    constructor(
        message: string,
        code: string = UpupErrorCode.NO_UPLOAD_TARGET,
    ) {
        super(message, code, false)
        this.name = 'UpupConfigError'
    }
}

// ── Client error factory (P4/C6) ────────────────────────────────
//
// Every upload strategy used to build its error from status+statusText only,
// discarding the response body entirely — including S3's own error XML and
// @upupjs/server's `{error, code}` JSON. uploadErrorFromResponse() is the one
// place that reads the body and constructs a typed, code-carrying error.

const MAX_ERROR_BODY_SNIPPET = 200

/**
 * Best-effort parse of an HTTP error response body into a {code, message}
 * pair. Tries, in order: JSON `{code, error|message}`, S3-style XML
 * `<Error><Code>/<Message></Error>`, then falls back to a truncated text
 * snippet with no code.
 */
export function parseErrorBody(body: string | undefined): {
    code?: string
    message: string
} {
    if (!body) return { message: '' }

    try {
        const parsed: unknown = JSON.parse(body)
        if (parsed && typeof parsed === 'object') {
            const {
                code,
                error,
                message: msg,
            } = parsed as {
                code?: string
                error?: string
                message?: string
            }
            const message = error ?? msg
            if (typeof message === 'string' || typeof code === 'string') {
                return {
                    message: message ?? '',
                    ...(code !== undefined ? { code } : {}),
                }
            }
        }
    } catch {
        // upup-catch: body isn't JSON — fall through to XML/text parsing below
    }

    const xmlCode = /<Code>([^<]*)<\/Code>/.exec(body)?.[1]
    const xmlMessage = /<Message>([^<]*)<\/Message>/.exec(body)?.[1]
    if (xmlCode || xmlMessage) {
        return {
            message: xmlMessage ?? '',
            ...(xmlCode !== undefined ? { code: xmlCode } : {}),
        }
    }

    return { message: body.slice(0, MAX_ERROR_BODY_SNIPPET) }
}

export interface UploadErrorFromResponseArgs {
    status: number
    statusText: string
    body?: string
    kind: 'storage' | 'auth' | 'network'
    /** Required when kind === 'storage'; ignored otherwise. */
    operation?: UpupStorageError['operation']
    /** Provider label for storage/auth errors (e.g. 'S3', 'google-drive'). Defaults to 'server'. */
    provider?: string
}

/**
 * Construct a typed, code-carrying error from a failed fetch/XHR response —
 * the client-side half of the server's `{error, code}` convention (and S3's
 * own `<Error><Code>` XML). Picks the error class by `kind`; the resulting
 * `.code` is the server/S3-supplied machine code when present, else falls
 * back to the HTTP status text.
 */
export function uploadErrorFromResponse(
    args: UploadErrorFromResponseArgs,
): UpupError {
    const { status, statusText, body, kind, operation, provider } = args
    const parsed = parseErrorBody(body)
    const message = parsed.message || `${status} ${statusText}`.trim()

    let err: UpupError
    if (kind === 'auth') {
        err = new UpupAuthError(message, provider ?? 'server')
    } else if (kind === 'storage') {
        err = new UpupStorageError(
            message,
            provider ?? 'server',
            operation ?? 'upload',
        )
    } else {
        err = new UpupNetworkError(message, status)
    }

    if (parsed.code) err.code = parsed.code
    err.status = status
    return err
}
