export type PresignedUrlResponse = {
  key: string
  publicUrl?: string
  downloadUrl?: string
  uploadUrl: string
  uploadHeaders?: Record<string, string>
  expiresIn: number
}

export type MultipartInitResponse = {
  key: string
  uploadId: string
  partSize: number
  expiresIn: number
}

export type MultipartSignPartResponse = {
  uploadUrl: string
  uploadHeaders?: Record<string, string>
  expiresIn: number
}

export type MultipartPart = {
  partNumber: number
  eTag: string
}

export type MultipartListPartsResponse = {
  parts: MultipartPart[]
}

export type MultipartCompleteResponse = {
  key: string
  publicUrl?: string
  downloadUrl?: string
  etag?: string
}

export type MultipartAbortResponse = {
  ok: true
}

type MaxFileSizeObject = {
  size: number
  unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'
}

export type ResumableUploadOptions =
  | {
      protocol: 'multipart'
      thresholdBytes?: number
      chunkSizeBytes?: number
      persist?: boolean
    }
  | {
      protocol: 'tus'
      endpoint: string
      chunkSizeBytes?: number
      /** @deprecated Use chunkSizeBytes instead. */
      chunkSize?: number
      retryDelays?: number[]
      storeFingerprintForResuming?: boolean
      removeFingerprintOnSuccess?: boolean
      headers?: Record<string, string>
      metadata?: Record<string, string>
      parallelUploads?: number
    }

export type CrashRecoveryOptions = {
  enabled?: boolean
  storeName?: string
  expiry?: number
}

export { type MaxFileSizeObject }
