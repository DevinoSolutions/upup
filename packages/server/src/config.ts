import type { StorageProvider } from '@upup/shared'

export type UpupServerConfig = {
  storage: {
    type: StorageProvider | string
    bucket: string
    region: string
    accessKeyId?: string
    secretAccessKey?: string
    [key: string]: unknown
  }

  providers?: {
    googleDrive?: { clientId: string; clientSecret: string }
    dropbox?: { appKey: string; appSecret: string }
    oneDrive?: { clientId: string; clientSecret: string; tenantId?: string }
  }

  tokenStore?: TokenStore

  hooks?: {
    onBeforeUpload?: (file: FileMetadata, req: Request) => Promise<boolean>
    onFileUploaded?: (file: UploadedFile, req: Request) => Promise<void>
    onUploadComplete?: (files: UploadedFile[], req: Request) => Promise<void>
  }

  auth?: (req: Request) => Promise<boolean>
  maxFileSize?: number
  allowedTypes?: string[]
}

export interface TokenStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}

export interface FileMetadata {
  name: string
  size: number
  type: string
}

export interface UploadedFile {
  key: string
  name: string
  size: number
  type: string
  url: string
}
