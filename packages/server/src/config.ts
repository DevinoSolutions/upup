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
    box?: { clientId: string; clientSecret: string }
  }

  tokenStore?: TokenStore

  /**
   * Identify the authenticated user for OAuth + tokenStore scoping.
   * Return null if the request has no authenticated user (OAuth will 401).
   * If omitted, falls back to a singleton 'default' user — fine for demos,
   * unsuitable for multi-tenant production.
   */
  getUserId?: (req: Request) => Promise<string | null>

  hooks?: {
    onBeforeUpload?: (file: FileMetadata, req: Request) => Promise<boolean>
    onFileUploaded?: (file: UploadedFile, req: Request) => Promise<void>
    onUploadComplete?: (files: UploadedFile[], req: Request) => Promise<void>
  }

  auth?: (req: Request) => Promise<boolean>
  maxFileSize?: number
  allowedTypes?: string[]

  /**
   * Outbound server→S3 multipart threshold (bytes). Files at or above this
   * size use S3 multipart on the /files/:provider/transfer path; smaller
   * files stream through as a single PUT. Default: 100 MB.
   */
  multipartThreshold?: number
}

/**
 * Key-value store the server uses for OAuth state + drive access tokens.
 * Interface matches Redis / Cloudflare KV / any string-keyed KV.
 * Consumers implement this against their own persistence layer.
 */
export interface TokenStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
}

/** Drive OAuth tokens we persist after a successful /auth/:provider/cb. */
export interface DriveTokens {
  accessToken: string
  expiresAt?: number
  scope?: string
  tokenType?: string
  refreshToken?: string
}

/** Short-lived OAuth state map, keyed by the random state param. */
export interface OAuthState {
  userId: string
  provider: string
  returnTo?: string
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

export const DEFAULT_MULTIPART_THRESHOLD = 100 * 1024 * 1024
