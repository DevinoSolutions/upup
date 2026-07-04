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
  status?: number
  constructor(message: string, status?: number) {
    super(message, UpupErrorCode.NETWORK_ERROR, true)
    this.name = 'UpupNetworkError'
    this.status = status
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
  operation: 'presign' | 'upload' | 'multipart-init' | 'multipart-complete'
  constructor(message: string, provider: string, operation: UpupStorageError['operation']) {
    super(message, UpupErrorCode.STORAGE_ERROR, false)
    this.name = 'UpupStorageError'
    this.provider = provider
    this.operation = operation
  }
}

export class UpupConfigError extends UpupError {
  constructor(message: string, code: string = UpupErrorCode.NO_UPLOAD_TARGET) {
    super(message, code, false)
    this.name = 'UpupConfigError'
  }
}

// Legacy error types (moved from @upup/react for cross-package use)
export enum UploadErrorType {
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  EXPIRED_URL = 'EXPIRED_URL',
  FILE_VALIDATION_ERROR = 'FILE_VALIDATION_ERROR',
  PRESIGNED_URL_ERROR = 'PRESIGNED_URL_ERROR',
  SIGNED_URL_ERROR = 'SIGNED_URL_ERROR',
  CORS_CONFIG_ERROR = 'CORS_CONFIG_ERROR',
  TEMPORARY_CREDENTIALS_ERROR = 'TEMPORARY_CREDENTIALS_ERROR',
  UNKNOWN_UPLOAD_ERROR = 'UNKNOWN_UPLOAD_ERROR',
}

export class UploadError extends Error {
  private readonly DEFAULT_ERROR_STATUS_CODE = 500

  constructor(
    message: string,
    public type = UploadErrorType.UNKNOWN_UPLOAD_ERROR,
    public retryable = false,
    public status?: number,
  ) {
    super(message)
    this.name = 'UploadError'
    this.status = status ?? this.DEFAULT_ERROR_STATUS_CODE
  }
}
