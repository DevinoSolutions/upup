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
