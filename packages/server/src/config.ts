import type {
    StorageProvider,
    UpupCorsConfig,
    PresignedUrlResponse,
    MultipartInitResponse,
    MultipartSignPartResponse,
} from '@useupup/core'
import type { UpupServerLogger } from './observability'

/**
 * Free-form routing hints the CLIENT sends alongside a file's name/type/size,
 * as the `metadata` field of a `/presign`, `/multipart/init`, or drive-transfer
 * body. upup neither interprets nor validates it — it is carried through to
 * `keyStrategy` and the storage resolver verbatim.
 *
 * It is ATTACKER-CONTROLLED. Treat it as you would a query parameter: switch on
 * it against a fixed allow-list, never let it name a bucket, a path prefix, or
 * a credential directly.
 */
export type UpupClientMetadata = Record<string, unknown>

/** Context passed to a custom keyStrategy. */
export interface KeyStrategyContext {
    /** Resolved userId, or null when anonymous. */
    userId: string | null
    fileName: string
    contentType: string
    size: number
    /** The client's `metadata` field, if it sent one. Untrusted — see
     *  {@link UpupClientMetadata}. */
    metadata?: UpupClientMetadata
    /** The originating request, past every auth and policy check. */
    req: Request
}

/** Which of the three presign-side responses `onPresignResponse` is rewriting. */
export type PresignResponsePhase =
    'presign' | 'multipart-init' | 'multipart-sign-part'

export interface PresignResponseContext {
    /** The originating request, already past every auth and policy check. */
    req: Request
    phase: PresignResponsePhase
    /** The server-chosen object key. Present on all three phases — on
     *  `multipart-sign-part` it comes from the VERIFIED token, not the client. */
    key: string
    /** The client-declared file (name/type/size). Absent on
     *  `multipart-sign-part`, which sees only a token and a part number. */
    file?: FileMetadata
    /** The client's `metadata` field, if it sent one. Untrusted — see
     *  {@link UpupClientMetadata}. Absent on `multipart-sign-part`. */
    metadata?: UpupClientMetadata
    /** Resolved userId, or null for an anonymous (server-namespaced) upload. */
    userId: string | null
}

/** What the hook receives — narrow it on `ctx.phase`, or with `'uploadUrl' in response`. */
export type PresignResponseBody =
    | PresignedUrlResponse
    | (MultipartInitResponse & { token: string })
    | MultipartSignPartResponse

/** What the hook may return: the same shapes, plus any extra fields you want
 *  to add for your client. */
export type PresignResponseRewrite = PresignResponseBody &
    Record<string, unknown>

/* eslint-disable @typescript-eslint/no-invalid-void-type -- `| void` is the deliberate "rewrite it, or just look at it" idiom: it is what lets an inspect-only hook be written with no return statement at all. `| undefined` would not — TypeScript rejects a void-returning function there, forcing every hook to end in `return undefined`. */
export type OnPresignResponse = (
    response: PresignResponseBody,
    ctx: PresignResponseContext,
) => PresignResponseRewrite | void | Promise<PresignResponseRewrite | void>
/* eslint-enable @typescript-eslint/no-invalid-void-type -- scope of the exemption above ends here; the rest of this file is held to the rule. */

/** One bucket's worth of S3 / S3-compatible connection settings. */
export interface UpupStorageConfig {
    /**
     * An S3 / S3-compatible provider label. @useupup/server only speaks the S3
     * API (buildS3ClientConfig always builds an @aws-sdk/client-s3 client) —
     * set `endpoint` for any non-AWS backend (MinIO/R2/DO Spaces/etc). A
     * provider with no S3-compatible surface (currently `StorageProvider.Azure`
     * — see @useupup/core's NON_S3_STORAGE_PROVIDERS) is rejected by
     * createUpupHandler at construct time.
     */
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

/** Which operation is asking for a storage config. */
export type StorageResolverPhase =
    | 'presign'
    | 'multipart-init'
    | 'multipart-sign-part'
    | 'multipart-complete'
    | 'multipart-abort'
    | 'multipart-resume'
    | 'drive-transfer'

export interface StorageResolverContext {
    /** The originating request, past every auth and policy check. */
    req: Request
    phase: StorageResolverPhase
    /** Resolved userId, or null for an anonymous (server-namespaced) upload. */
    userId: string | null
    /** The client's `metadata` field, if it sent one. Untrusted — see
     *  {@link UpupClientMetadata}. Absent on the multipart continuation
     *  phases, which carry only a token. */
    metadata?: UpupClientMetadata
    fileName?: string
    contentType?: string
    size?: number
    /**
     * Set on `multipart-sign-part` / `-complete` / `-abort` / `-resume` ONLY:
     * the opaque
     * identity of the storage this upload's `init` resolved, carried inside the
     * HMAC-signed upload token. Return the SAME storage for it — the server
     * re-derives the identity of whatever you return and answers `403
     * AUTH_DENIED` if it does not match, so a continuation can never be
     * steered to a different bucket than the one it started in.
     */
    storageId?: string
}

export type UpupStorageResolver = (
    ctx: StorageResolverContext,
) => UpupStorageConfig | Promise<UpupStorageConfig>

export type UpupServerConfig = {
    /**
     * One static bucket, or a resolver called per request to pick one — three
     * buckets by upload class, a tenant's own bucket, a quarantine bucket for
     * unscanned files. A resolver is validated at RESOLVE time (a bad config
     * fails that request with a 500), not at construct time like the static
     * form.
     */
    storage: UpupStorageConfig | UpupStorageResolver

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
     * `createUpupHandler` throws if missing or too short.
     */
    uploadTokenSecret?: string

    /**
     * Override object-key generation. Default namespaces by userId:
     * `<userId|anon>/<uuid>/<sanitized-filename>`. The client never chooses the key.
     */
    keyStrategy?: (ctx: KeyStrategyContext) => string

    /**
     * TTL, in SECONDS, for the signed GET download URLs this server hands back
     * (`downloadUrl` on the presign / multipart-complete / drive-transfer
     * responses, and `getDownloadUrl`'s result). Defaults to 3 days. Lower it
     * for gated content — a 15-minute link is `900`. This is the download half
     * only; the upload URL's own 1-hour expiry is unaffected.
     */
    downloadUrlExpiresIn?: number

    /**
     * Permit drive providers / tokenStore WITHOUT a getUserId resolver, collapsing
     * every caller into one shared anonymous namespace. Demos only — never in
     * multi-tenant production. Default false -> createUpupHandler throws.
     */
    allowAnonymous?: boolean

    /**
     * Permit `/presign` + `/multipart/init` with no `auth` and no `getUserId`
     * resolver — uploads run under the shared anonymous namespace. Demos /
     * upstream-auth deployments (tus/companion-style, where auth is handled
     * before the request reaches this handler) only. Default false -> those
     * routes return 403 AUTH_REQUIRED.
     */
    allowAnonymousUploads?: boolean

    /**
     * onFileUploaded/onUploadComplete fire on server-side-completion paths only
     * (multipart-complete, drive transfer) -- direct presigned-PUT uploads never
     * reach the server on completion, so no hook fires for them. See the
     * README's "Lifecycle hooks" section for the full per-path breakdown.
     */
    hooks?: {
        /**
         * Admission gate. Return `false` to reject with a generic
         * `403 Upload rejected`; THROW an `UpupError` to reject with that
         * error's own message and code in the 403 body (a quota check can say
         * "Storage limit exceeded — upgrade to keep uploading"). Any other
         * throw stays a generic 500 — internal error text never reaches the
         * client.
         */
        onBeforeUpload?: (file: FileMetadata, req: Request) => Promise<boolean>
        onFileUploaded?: (file: UploadedFile, req: Request) => Promise<void>
        onUploadComplete?: (
            files: UploadedFile[],
            req: Request,
        ) => Promise<void>
        /**
         * Last look at a presign-side response body before it is sent, for
         * deployments where the storage endpoint is not browser-reachable
         * (a same-origin proxy route, a docker-internal MinIO hostname, a
         * VPC-only endpoint). Return an object to REPLACE the payload; return
         * nothing to leave it as-is.
         *
         * Fires on exactly three responses, identified by `ctx.phase`:
         * `POST /presign` (`presign`), `POST /multipart/init`
         * (`multipart-init`, token already issued), and
         * `POST /multipart/sign-part` (`multipart-sign-part`).
         *
         * It runs AFTER every auth, policy, and token check and cannot bypass
         * any of them — a request that would 401/403 never reaches the hook.
         * Rewriting `uploadUrl` changes where the browser sends bytes, so the
         * URL you substitute must land at the same object.
         */
        onPresignResponse?: OnPresignResponse
    }

    /**
     * How long after its ORIGINAL `/multipart/init` an upload may still be
     * resumed via `POST /multipart/resume`, in seconds. Default 86400 (24h),
     * matching the client's localStorage session TTL. Set `0` to disable the
     * route entirely (it then 404s like any unknown path) — the cost of the
     * route is that a leaked token stays usable for this window, though only to
     * continue the SAME upload, to the SAME key, inside the SAME signed size
     * envelope, and still owner-bound whenever `getUserId` is configured.
     * Resuming re-issues a token with a fresh 1h expiry but carries the original
     * issue time forward, so rolling resumes can never extend this window.
     */
    multipartResumeWindowSeconds?: number

    auth?: (req: Request) => Promise<boolean>
    maxFileSize?: number
    allowedTypes?: string[]
    cors?: UpupCorsConfig

    /**
     * Called on every error path (500s, invalid upload tokens, OAuth/token-exchange
     * failures, health-check storage failures). Never receives secrets, tokens,
     * request bodies, or Authorization headers — only a route/method/status/code/
     * message plus the caught error's name/message/stack. Default: logs a
     * structured line via console.error.
     */
    onError?: UpupServerLogger

    /** Options for the built-in GET /health route. */
    health?: {
        /**
         * Expose the first 8 hex chars of SHA-256(uploadTokenSecret) on /health so
         * operators can spot cross-instance secret drift without revealing the
         * secret itself. Default: false.
         */
        exposeSecretFingerprint?: boolean
    }
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
    expiresAt?: number | undefined
    scope?: string | undefined
    tokenType?: string | undefined
    refreshToken?: string | undefined
}

/** Short-lived OAuth state map, keyed by the random state param. */
export interface OAuthState {
    userId: string
    provider: string
    returnTo?: string | undefined
}

export interface FileMetadata {
    name: string
    size: number
    type: string
    /** Free-form routing hints from the client. Untrusted — see
     *  {@link UpupClientMetadata}. */
    metadata?: UpupClientMetadata
}

export interface UploadedFile {
    key: string
    name: string
    size: number
    type: string
    url: string
}
