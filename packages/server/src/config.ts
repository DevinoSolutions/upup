import type { StorageProvider, UpupCorsConfig } from '@upup/core'

/** Context passed to a custom keyStrategy. */
export interface KeyStrategyContext {
  /** Resolved userId, or null when anonymous. */
  userId: string | null
  fileName: string
  contentType: string
  size: number
}

export type UpupServerConfig = {
  storage: {
    type: StorageProvider | string
    bucket: string
    region: string
    accessKeyId?: string
    secretAccessKey?: string
    /** S3-compatible endpoint (MinIO / Cloudflare R2 / DO Spaces / on-prem). Omit for AWS S3. */
    endpoint?: string
    /** Path-style addressing. Defaults to true when `endpoint` is set (required by MinIO).
     *  Only applies when `endpoint` is set; ignored for native AWS S3. */
    forcePathStyle?: boolean
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

  /**
   * HMAC secret for stateless upload tokens (multipart key/uploadId binding).
   * REQUIRED. Stable, high-entropy, >=16 chars, shared across all instances.
   * `createHandler` throws if missing or too short.
   */
  uploadTokenSecret?: string

  /**
   * Override object-key generation. Default namespaces by userId:
   * `<userId|anon>/<uuid>/<sanitized-filename>`. The client never chooses the key.
   */
  keyStrategy?: (ctx: KeyStrategyContext) => string

  /**
   * Permit drive providers / tokenStore WITHOUT a getUserId resolver, collapsing
   * every caller into one shared anonymous namespace. Demos only — never in
   * multi-tenant production. Default false -> createHandler throws.
   */
  allowAnonymous?: boolean

  hooks?: {
    onBeforeUpload?: (file: FileMetadata, req: Request) => Promise<boolean>
    onFileUploaded?: (file: UploadedFile, req: Request) => Promise<void>
    onUploadComplete?: (files: UploadedFile[], req: Request) => Promise<void>
  }

  auth?: (req: Request) => Promise<boolean>
  maxFileSize?: number
  allowedTypes?: string[]
  cors?: UpupCorsConfig

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
