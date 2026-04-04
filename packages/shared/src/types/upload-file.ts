import { FileSource } from './file-source'
import { UploadStatus } from './upload-status'

export type UploadFileMetadata = {
  width?: number
  height?: number
  duration?: number
  thumbnailUrl?: string
  checksum?: string
  originalContentHash?: string
}

export type UploadFile = File & {
  id: string
  source: FileSource
  status: UploadStatus
  metadata: UploadFileMetadata
  url?: string
  relativePath?: string
  key?: string
  etag?: string
  /** @deprecated Use metadata.originalContentHash instead */
  fileHash?: string
  /** @deprecated Use metadata.checksum instead */
  checksumSHA256?: string
  /** @deprecated Use metadata.thumbnailUrl instead */
  thumbnail?: {
    file: File
    key?: string
  }
}

export type UploadFileWithProgress = UploadFile & { progress: number }

/** @deprecated Use UploadFile instead */
export type FileWithParams = UploadFile
