export type UploadFile = File & {
  id: string
  url?: string
  relativePath?: string
  key?: string
  fileHash?: string
  checksumSHA256?: string
  etag?: string
  thumbnail?: {
    file: File
    key?: string
  }
}

export type UploadFileWithProgress = UploadFile & { progress: number }
