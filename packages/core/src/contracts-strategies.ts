import type { UploadFile } from './types/upload-file'
import type {
  PresignedUrlResponse,
  MultipartInitResponse,
  MultipartSignPartResponse,
  MultipartCompleteResponse,
  MultipartListPartsResponse,
} from './types/upload-protocols'

export type FileMetadata = {
  name: string
  size: number
  type: string
  metadata?: Record<string, unknown>
}

export type UploadCredentials = PresignedUrlResponse

export type UploadResult = {
  key: string
  publicUrl?: string
  downloadUrl?: string
  etag?: string
}

export type ProgressInfo = {
  loaded: number
  total: number
  percentage: number
}

export type OAuthTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

export type RemoteFile = {
  id: string
  name: string
  mimeType: string
  size: number
  isFolder: boolean
  thumbnailUrl?: string
  modifiedAt?: string
}

export type CloudProvider = 'googleDrive' | 'oneDrive' | 'dropbox' | 'box'

export interface CredentialStrategy {
  getPresignedUrl(file: FileMetadata): Promise<PresignedUrlResponse>
  initMultipartUpload?(file: FileMetadata): Promise<MultipartInitResponse>
  signPart?(params: { token: string; partNumber: number }): Promise<MultipartSignPartResponse>
  completeMultipartUpload?(params: { token: string; parts: { partNumber: number; eTag: string }[] }): Promise<MultipartCompleteResponse>
  abortMultipartUpload?(params: { token: string }): Promise<void>
  listParts?(params: { token: string }): Promise<MultipartListPartsResponse>
}

export interface OAuthStrategy {
  getAuthUrl(provider: CloudProvider): Promise<string>
  handleCallback(provider: CloudProvider, params: Record<string, string>): Promise<OAuthTokens>
  listFiles(provider: CloudProvider, path: string, token: string): Promise<RemoteFile[]>
  getFileMetadata(provider: CloudProvider, fileId: string, token: string): Promise<RemoteFile>
}

export interface UploadStrategy {
  upload(
    file: File | Blob,
    credentials: UploadCredentials,
    options: {
      onProgress: (loaded: number, total: number) => void
      signal: AbortSignal
    },
  ): Promise<UploadResult>
}

export interface RuntimeAdapter {
  computeHash(data: ArrayBuffer): Promise<string>
  createImageBitmap?(blob: Blob): Promise<ImageBitmap>
  createWorker?(code: string): Worker | null
  upload(
    url: string,
    body: Blob | ArrayBuffer,
    options: {
      method: string
      headers: Record<string, string>
      onProgress: (loaded: number, total: number) => void
      signal: AbortSignal
    },
  ): Promise<{ status: number; headers: Record<string, string>; body: string }>
  readAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer>
  createObjectURL?(blob: Blob): string
  revokeObjectURL?(url: string): void
  storage?: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
    delete(key: string): Promise<void>
  }
}
