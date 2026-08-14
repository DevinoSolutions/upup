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
    /** Opaque server-issued token bound to {key, uploadId, size, expiry}. */
    token?: string
}

export type MultipartSignPartResponse = {
    uploadUrl: string
    uploadHeaders?: Record<string, string>
    expiresIn: number
}

export type MultipartPart = {
    partNumber: number
    eTag: string
    /** Bytes stored for this part. Populated on resume/list responses; the
     *  complete call ignores it. */
    size?: number
}

export type MultipartListPartsResponse = {
    parts: MultipartPart[]
}

export type MultipartResumeResponse = {
    key: string
    /** Fresh server-issued token replacing the presented (possibly expired)
     *  one — same key/uploadId/owner/size-envelope binding, new expiry. */
    token: string
    /** Parts the storage provider already holds; every entry carries `size`. */
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
