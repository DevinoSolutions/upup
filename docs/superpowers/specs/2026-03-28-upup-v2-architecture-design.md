# upup v2.0 Architecture Design

> Design spec for the upup-react-file-uploader v2.0 rewrite: multi-package architecture with headless core, composable strategies, middleware pipeline, plugin system, SSR-first design, and optimized bundle size.

**Date:** 2026-03-28
**Status:** Revised — incorporating competitive enhancements from react-uploady, better-upload, uploadcare, react-filepond analysis

---

## 1. Goals

1. **Headless-first:** A framework-agnostic core (`@upup/core`) that works in browser and Node.js. Zero DOM dependency.
2. **Composable strategies:** Pluggable credential, OAuth, and upload strategies. Consumer chooses client mode or server mode.
3. **Middleware pipeline:** Extensible file processing pipeline. Built-in steps (HEIC, EXIF, compress, checksum) are opt-in imports; consumers can add custom steps.
4. **Plugin system:** Vite-inspired plain-object plugins with factory functions. Type-safe extensions via `.use()` chaining.
5. **SSR-first:** Every React component works with Next.js App Router out of the box. No hydration mismatches. `'use client'` directives, deferred initialization, no browser APIs at module scope.
6. **Bundle size discipline:** Subpath exports isolate heavy dependencies (pako, heic2any). Tree-shakeable with `sideEffects: false`. CI-enforced size budgets via `size-limit`.
7. **Progressive complexity:** Simple things simple (3 options for basic upload), complex things possible (pipeline steps, plugins). Zero-plugin zero-config is the default.
8. **Web Workers:** Offload CPU-heavy work (hashing, gzip) to workers from within core.
9. **Two modes:** Client mode (no server beyond uploadEndpoint) and server mode (`@upup/server` handles OAuth + streaming).
10. **React-first UI:** `@upup/react` is a first-class React package, not a wrapper. `useUpupUpload()` hook returns reactive state natively.
11. **Managed service ready:** Architecture supports a hosted `@upup/server` as a paid managed service with zero code changes to core/react.
12. **Learn from Uppy's pain points:** 4 packages not 30+, embeddable server not standalone companion, Tailwind-native styling, typed errors, simple middleware API.

---

## 2. Package Structure

```
packages/
  shared/           @upup/shared      Types, i18n, constants, strategy interfaces
  core/             @upup/core        Engine, pipeline, workers, provider clients
  react/            @upup/react       React hook + UI components
  server/           @upup/server      Node.js route handlers (embeddable)
```

### Dependency Graph

```
@upup/shared       (zero dependencies)
       |
    @upup/core     (depends on shared)
       |
  +---------+
  |         |
@upup/react  @upup/server
  (depends on core + shared)
```

`@upup/server` depends on `@upup/core` because it reuses core's provider clients (Google Drive, Dropbox, OneDrive API calls) — no OAuth/provider logic duplication.

### Package Details

#### @upup/shared

Zero runtime dependencies. Contains everything that core, react, and server all need.

- **Types:** `UploadFile`, `CoreOptions`, `UploadStatus`, `FileSource`, `StorageProvider`, strategy interfaces, error classes
- **i18n:** `t()`, `plural()`, translation types, locale packs (en_US, ar_SA, etc.)
- **Constants:** Enums (`FileSource`, `StorageProvider`, `UploadStatus`), default values, MIME type mappings
- **Strategy interfaces:** `CredentialStrategy`, `OAuthStrategy`, `UploadStrategy`, `RuntimeAdapter`
- **Pipeline interfaces:** `PipelineStep`, `PipelineContext`
- **Error classes:** `UpupError`, `UpupAuthError`, `UpupNetworkError`, `UpupQuotaError`, `UpupValidationError`

#### @upup/core

Depends only on `@upup/shared`. Framework-agnostic. Runs in browser and Node.js.

- **UpupCore class:** State machine + event emitter + plugin host. The engine.
- **Plugin system:** `core.use(plugin)` for type-safe extensions. Plugins are plain objects with `{ name, setup(core) }`.
- **Middleware pipeline engine:** Executes pipeline steps in sequence on files.
- **Built-in pipeline steps (opt-in imports):** HEIC conversion, EXIF stripping, image compression, thumbnail generation, gzip compression, SHA-256 checksum. Each is a separate subpath export — only what you import gets bundled.
- **Web Worker manager:** Pool of workers for CPU-heavy pipeline steps (hash, gzip). Falls back to main thread when workers unavailable.
- **Provider API clients:** Google Drive, Dropbox, OneDrive file listing and OAuth helpers. Shared between client and server modes.
- **Built-in strategies:**
  - `TokenEndpointCredentials` — calls consumer's uploadEndpoint for presigned URLs
  - `ClientOAuth` — handles OAuth in the browser
  - `DirectUpload` — uploads from browser directly to cloud storage
- **Upload protocols:** Single PUT, S3 multipart, tus
- **Progress tracking:** Per-file and aggregate, rolling speed average, ETA
- **Crash recovery:** Serializable state, IndexedDB persistence
- **Browser runtime adapter:** Default `RuntimeAdapter` using Web Crypto, OffscreenCanvas, Web Workers, XHR

**Subpath exports** — one npm package, multiple entry points:
```json
{
  "exports": {
    ".":            { "import": "./dist/index.mjs", "types": "./dist/index.d.mts" },
    "./steps/hash": { "import": "./dist/steps/hash.mjs", "types": "./dist/steps/hash.d.mts" },
    "./steps/gzip": { "import": "./dist/steps/gzip.mjs", "types": "./dist/steps/gzip.d.mts" },
    "./steps/heic": { "import": "./dist/steps/heic.mjs", "types": "./dist/steps/heic.d.mts" },
    "./steps/exif": { "import": "./dist/steps/exif.mjs", "types": "./dist/steps/exif.d.mts" },
    "./steps/compress": { "import": "./dist/steps/compress.mjs", "types": "./dist/steps/compress.d.mts" },
    "./steps/thumbnail": { "import": "./dist/steps/thumbnail.mjs", "types": "./dist/steps/thumbnail.d.mts" },
    "./steps/deduplicate": { "import": "./dist/steps/deduplicate.mjs", "types": "./dist/steps/deduplicate.d.mts" },
    "./pipeline": { "import": "./dist/pipeline.mjs", "types": "./dist/pipeline.d.mts" }
  },
  "sideEffects": false
}
```

**Import patterns:**
```typescript
// Level 1: Core only (~8-10KB gzipped) — 90% of users
import { UpupCore } from '@upup/core'

// Level 2: Add specific steps (each ~1-3KB)
import { hashStep } from '@upup/core/steps/hash'
import { exifStep } from '@upup/core/steps/exif'

// Level 3: All steps re-exported for convenience (pulls in heavy deps)
import { hashStep, exifStep, heicStep, gzipStep } from '@upup/core/pipeline'
```

#### @upup/react

Depends on `@upup/core` and `@upup/shared`. The React package. **SSR-safe by design.**

- **`useUpupUpload()` hook:** Thin wrapper over `UpupCore`. Returns reactive state + methods. This IS headless mode. Defers `UpupCore` initialization to `useEffect` — safe for SSR.
- **`<UpupUploader>` component:** Uses `useUpupUpload()` internally. Ships the full UI.
- **`<PasteZone>` component:** Standalone headless component for clipboard paste upload. Also available as `enablePaste` prop on `UpupUploader`.
- **All UI components:** DropZone, FileList, FilePreview, FilePreviewPortal, SourceSelector, SourceView, ProgressBar, MainBoxHeader, Notifier, ImageEditorInline, ImageEditorModal, CameraUploader, AudioUploader, ScreenCaptureUploader
- **Tailwind CSS:** All classes prefixed `upup-`. `classNames` prop for overrides. `cn()` utility.
- **Source UIs:** Custom file browser for Google Drive, Dropbox, OneDrive (calls core's provider clients or server endpoints depending on mode)
- **SSR handling:** All components use `'use client'` directive. Browser-only APIs (`File`, `Blob`, `URL.createObjectURL`, `navigator.clipboard`) gated behind `useIsClient()`. No portals during SSR. Tested with Next.js App Router `next build` + `next start`.
- **Declarative sources shorthand:** `sources={['local', 'camera', 'url', 'google_drive']}` as sugar over individual adapter config

#### @upup/server

Depends on `@upup/core` and `@upup/shared`. Node.js server-side package.

- **Route handlers:** Not a standalone server. Embeds in your existing app.
- **Framework adapters:** Each is a thin wrapper (~20 lines) around a generic `Request → Response` handler:
  - `@upup/server` — Generic handler (works anywhere with Web Request/Response)
  - `@upup/server/next` — Next.js App Router handler
  - `@upup/server/express` — Express middleware
  - `@upup/server/hono` — Hono/Cloudflare Workers handler
  - `@upup/server/fastify` — Fastify plugin
- **OAuth proxy:** Handles OAuth flows server-side. Tokens never reach the browser.
- **File streaming:** Streams files from cloud drives directly to storage (Drive -> S3) without touching browser.
- **Presigned URL generation:** For S3, Azure, DigitalOcean, Backblaze.
- **Multipart orchestration:** Server-side multipart upload management.
- **Lifecycle hooks:** `onFileUploaded`, `onBeforeUpload`, `onUploadComplete` for custom server-side processing (virus scanning, transcoding, etc.)
- **Reuses core's provider clients** for OAuth and file listing logic (no duplication).

---

## 3. Two Modes

### Client Mode

No server required beyond consumer's existing uploadEndpoint. Everything runs in the browser.

```
Browser:
  @upup/core (UpupCore)
    ├── ClientOAuth → Google/Dropbox/OneDrive OAuth in browser
    ├── Pipeline → processes files in browser (with Web Workers)
    ├── TokenEndpointCredentials → calls consumer's /api/upload for presigned URLs
    └── DirectUpload → XHR PUT to S3/Azure presigned URL

Consumer's server:
  uploadEndpoint → generates presigned URLs using their own cloud credentials
```

**Consumer setup:**
```typescript
import { useUpupUpload } from '@upup/react'

const uploader = useUpupUpload({
  provider: 'aws',
  uploadEndpoint: '/api/upload',
  driveConfigs: {
    googleDrive: { clientId: '...', apiKey: '...', appId: '...' },
  },
})
```

### Server Mode

`@upup/server` handles OAuth, file streaming, and credential management. Files from cloud drives never touch the browser.

```
Browser:
  @upup/core (UpupCore)
    ├── ServerOAuth → redirects to server for OAuth
    ├── Pipeline → processes local files in browser (with Web Workers)
    ├── ServerCredentials → calls server for presigned URLs
    └── DirectUpload → XHR PUT to S3 (or ServerUpload for proxy mode)

Consumer's server (Next.js API route, Express, etc.):
  @upup/server
    ├── OAuth proxy → handles Google/Dropbox/OneDrive token exchange
    ├── File streaming → streams Drive files directly to S3
    ├── Presigned URLs → generates upload credentials
    └── Lifecycle hooks → virus scan, transcode, etc.
```

**Consumer setup:**
```typescript
// Frontend — same as client mode, just point to server
import { useUpupUpload } from '@upup/react'

const uploader = useUpupUpload({
  serverUrl: 'https://myapp.com/api/upup',
})

// Backend — one file in Next.js
// app/api/upup/[...path]/route.ts
import { createUpupHandler } from '@upup/server/next'

export const { GET, POST } = createUpupHandler({
  providers: {
    googleDrive: { clientId: '...', clientSecret: '...' },
    dropbox: { appKey: '...', appSecret: '...' },
  },
  storage: {
    type: 'aws',
    bucket: 'my-bucket',
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  hooks: {
    onFileUploaded: async (file) => {
      // Custom server-side processing
    },
  },
})
```

### Managed Mode (Future)

Same as server mode, but `serverUrl` points to upup's hosted service. Consumer provides only an API key.

```typescript
const uploader = useUpupUpload({
  apiKey: 'upup_live_xxx',  // That's it
})
```

---

## 4. UpupCore — The Engine

### Class Design

```typescript
class UpupCore<TExtensions = {}> {
  // --- State ---
  readonly files: Map<string, UploadFile>
  readonly status: UploadStatus
  readonly progress: UploadProgress
  readonly error: UpupError | null

  // --- Constructor ---
  constructor(options: CoreOptions)

  // --- Plugin System ---
  use<TPlugin extends UpupPlugin>(
    plugin: TPlugin
  ): UpupCore<TExtensions & ExtensionOf<TPlugin>>
  readonly ext: TExtensions                        // type-safe access to plugin extensions
  registerExtension(name: string, methods: Record<string, (...args: unknown[]) => unknown>): void
  getExtension(name: string): Record<string, (...args: unknown[]) => unknown> | undefined

  // --- File Management ---
  addFiles(files: File[]): Promise<void>                               // validates, runs onBeforeFileAdded (async)
  addFiles(files: File[], overrides: Partial<UploadOptions>): Promise<void>  // per-batch overrides
  removeFile(id: string): void
  removeAll(): void
  setFiles(files: File[]): Promise<void>          // replace all files
  reorderFiles(fromIndex: number, toIndex: number): void

  // --- Upload Lifecycle ---
  upload(): Promise<UploadFile[]>             // runs pipeline then uploads
  pause(): void
  resume(): void
  cancel(): void                              // respects fastAbortThreshold
  retry(fileId?: string): void                    // retry single file or all failed

  // --- Events ---
  on(event: UpupEvent, handler: Function): () => void   // returns unsubscribe fn
  off(event: UpupEvent, handler: Function): void

  // --- State Serialization (for crash recovery) ---
  getSnapshot(): SerializedState
  restore(snapshot: SerializedState): void

  // --- Destroy ---
  destroy(): void                                 // cleanup workers, revoke URLs, etc.
}
```

### Options

```typescript
type CoreOptions = {
  // --- Required (one of) ---
  uploadEndpoint?: string          // Client mode — shorthand
  serverUrl?: string              // Server mode — shorthand
  apiKey?: string                 // Managed mode — shorthand

  // --- OR explicit strategies ---
  credentials?: CredentialStrategy
  oauth?: OAuthStrategy
  uploadStrategy?: UploadStrategy

  // --- Storage ---
  provider?: StorageProvider         // 'aws' | 'azure' | 'backblaze' | 'digitalocean'

  // --- Plugins ---
  plugins?: UpupPlugin[]          // convenience — equivalent to calling core.use() for each

  // --- Pipeline ---
  pipeline?: PipelineStep[]       // Custom pipeline. If omitted, uses defaults based on enabled options.

  // --- Processing options (sugar for built-in pipeline steps) ---
  heicConversion?: boolean
  stripExifData?: boolean
  imageCompression?: boolean | ImageCompressionOptions
  thumbnailGenerator?: boolean | ThumbnailGeneratorOptions
  shouldCompress?: boolean        // gzip
  checksumVerification?: boolean

  // --- File restrictions ---
  accept?: string
  limit?: number
  minFiles?: number
  maxFileSize?: MaxFileSizeObject
  minFileSize?: MaxFileSizeObject
  maxTotalFileSize?: MaxFileSizeObject
  contentDeduplication?: boolean

  // --- Upload behavior ---
  maxRetries?: number
  maxConcurrentUploads?: number
  autoUpload?: boolean
  resumable?: ResumableUploadOptions
  fastAbortThreshold?: number      // default: 100 — skip individual abort() when cancelling more files than this

  // --- Upload response validation ---
  isSuccessfulCall?: (response: UploadResponse) => boolean | Promise<boolean>  // custom success detection beyond HTTP 2xx

  // --- Crash recovery ---
  crashRecovery?: boolean | CrashRecoveryOptions

  // --- Cloud drive configs (client mode) ---
  driveConfigs?: {
    googleDrive?: GoogleDriveConfigs
    oneDrive?: OneDriveConfigs
    dropbox?: DropboxConfigs
  }

  // --- Metadata ---
  meta?: Record<string, unknown>

  // --- i18n ---
  locale?: Translations
  translations?: Partial<Translations>

  // --- Runtime (advanced) ---
  runtime?: RuntimeAdapter        // Override browser defaults for React Native / Node.js

  // --- Callbacks (all async-safe) ---
  onBeforeFileAdded?: (file: File) => boolean | File | undefined | Promise<boolean | File | undefined>
  onBeforeUpload?: (files: Map<string, UploadFile>) => boolean | undefined
  onFileUploadStart?: (file: UploadFile) => void
  onFileUploadProgress?: (file: UploadFile, progress: ProgressInfo) => void
  onFileUploadComplete?: (file: UploadFile, key: string) => void
  onFilesUploadComplete?: (files: UploadFile[]) => void
  onFileRemove?: (file: UploadFile) => void
  onError?: (error: UpupError) => void
  onRestrictionFailed?: (file: File, error: RestrictionError) => void
  onRetry?: (file: UploadFile, attempt: number, maxRetries: number) => void
}

// Per-batch upload overrides (subset of CoreOptions relevant per-file)
type UploadOptions = {
  checksumVerification?: boolean
  imageCompression?: boolean | ImageCompressionOptions
  heicConversion?: boolean
  stripExifData?: boolean
  maxRetries?: number
  metadata?: Record<string, string>
}

// Upload response shape for isSuccessfulCall
type UploadResponse = {
  status: number
  headers: Record<string, string>
  body: unknown
}
```

### Event System

```typescript
type UpupEvent =
  | 'state-change'          // any state mutation
  | 'files-added'           // after validation + pipeline
  | 'file-removed'
  | 'file-rejected'         // file rejected by onBeforeFileAdded or validation (with reason)
  | 'upload-start'
  | 'upload-progress'       // per-file
  | 'upload-complete'       // per-file
  | 'upload-all-complete'   // all files done
  | 'upload-error'
  | 'upload-pause'
  | 'upload-resume'
  | 'upload-cancel'
  | 'pipeline-start'        // file entering pipeline
  | 'pipeline-step'         // individual step completed
  | 'pipeline-complete'     // file exited pipeline
  | 'plugin-registered'     // plugin initialized via .use()
  | 'restriction-failed'
  | 'retry'
  | 'error'
```

### State Shape

```typescript
type UploadProgress = {
  totalFiles: number
  completedFiles: number
  totalBytes: number
  uploadedBytes: number
  percentage: number          // 0-100
  speed: number               // bytes/sec (rolling 3-second average)
  eta: number                 // seconds remaining
  filesProgress: Map<string, {
    loaded: number
    total: number
    percentage: number
  }>
}

enum UploadStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',   // running pipeline
  READY = 'READY',             // files processed, awaiting upload
  UPLOADING = 'UPLOADING',
  PAUSED = 'PAUSED',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}
```

---

## 5. Plugin System

Inspired by Vite's plugin design: plain objects, factory functions, no classes, no inheritance.

### Plugin Interface

```typescript
interface UpupPlugin {
  /** Unique name — used for deduplication and debugging */
  name: string
  /** Called once when the plugin is registered via core.use() or plugins[] option */
  setup(core: UpupCore): void
}
```

### Creating Plugins

Plugins are factory functions that return a `UpupPlugin` object:

```typescript
// Third-party thumbnail plugin
function thumbnailPlugin(opts?: { size: number }): UpupPlugin {
  return {
    name: 'thumbnails',
    setup(core) {
      const thumbnails = new Map<string, string>()

      core.on('files-added', (files) => {
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            thumbnails.set(file.id, generateThumb(file, opts?.size ?? 200))
          }
        }
      })

      core.on('file-removed', (file) => thumbnails.delete(file.id))

      // Register extension methods accessible via core.ext
      core.registerExtension('thumbnails', {
        getThumbnail: (fileId: string) => thumbnails.get(fileId),
        hasThumbnail: (fileId: string) => thumbnails.has(fileId),
      })
    },
  }
}
```

### Using Plugins

**Chained `.use()` — full type inference:**

```typescript
const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
  .use(thumbnailPlugin({ size: 150 }))
  .use(analyticsPlugin())

// TypeScript knows about extensions:
core.ext.thumbnails.getThumbnail('file-1')  // ✅ typed
core.ext.analytics.getMetrics()              // ✅ typed
```

**`plugins` option — convenient but loses extension types:**

```typescript
const core = new UpupCore({
  provider: 'aws',
  uploadEndpoint: '/api/upload',
  plugins: [thumbnailPlugin(), analyticsPlugin()],
})

// Extensions exist at runtime but TypeScript doesn't know about them:
core.getExtension('thumbnails')?.getThumbnail('file-1')  // untyped
```

This is a TypeScript limitation — arrays of heterogeneous plugins can't propagate individual generic types. The `.use()` chain is recommended when type safety matters.

### Type-Safe Extension Inference

```typescript
// Plugin authors declare their extension type
interface ThumbnailExtension {
  thumbnails: {
    getThumbnail(fileId: string): string | undefined
    hasThumbnail(fileId: string): boolean
  }
}

// UpupCore tracks accumulated extensions via generic parameter
class UpupCore<TExtensions = {}> {
  use<TPlugin extends UpupPlugin>(
    plugin: TPlugin
  ): UpupCore<TExtensions & ExtensionOf<TPlugin>> {
    plugin.setup(this)
    return this as any  // safe — extensions are additive
  }

  get ext(): TExtensions {
    return this._extensions as TExtensions
  }
}

// ExtensionOf<T> is a conditional type that extracts the extension type from a plugin
type ExtensionOf<T> = T extends { __extensionType: infer E } ? E : {}
```

### Plugin Lifecycle

1. Plugins are initialized in order (either from `plugins[]` option or `.use()` calls).
2. Each plugin's `setup()` is called exactly once.
3. Plugins can listen to any core event, modify options, add pipeline steps, or register extensions.
4. Duplicate plugin names are rejected (throws error).
5. Plugins are destroyed when `core.destroy()` is called.

### Progressive Complexity

```typescript
// Level 1: 90% of users — zero plugins, zero config beyond essentials
const { files, upload } = useUpupUpload({
  provider: 'aws',
  uploadEndpoint: '/api/upload',
})

// Level 2: Add pipeline steps (opt-in imports, not plugins)
import { hashStep } from '@upup/core/steps/hash'
import { exifStep } from '@upup/core/steps/exif'

const { files, upload } = useUpupUpload({
  provider: 'aws',
  uploadEndpoint: '/api/upload',
  pipeline: [hashStep(), exifStep()],
})

// Level 3: Add plugins for cross-cutting concerns
const { files, upload } = useUpupUpload({
  provider: 'aws',
  uploadEndpoint: '/api/upload',
  plugins: [analyticsPlugin(), thumbnailPlugin()],
})
```

---

## 6. Middleware Pipeline

### Interface

```typescript
interface PipelineStep {
  /** Unique name for logging and event emission */
  name: string

  /**
   * Process a single file. Return the (possibly modified) file.
   * Throw to reject the file from the batch.
   */
  process(file: UploadFile, context: PipelineContext): Promise<UploadFile>

  /**
   * Optional: check if this step applies to the given file.
   * If omitted, the step runs for all files.
   */
  shouldProcess?(file: UploadFile): boolean
}

interface PipelineContext {
  /** All files in the current batch (read-only) */
  files: ReadonlyMap<string, UploadFile>
  /** Core options */
  options: Readonly<CoreOptions>
  /** Emit events */
  emit(event: string, data?: unknown): void
  /** i18n */
  t: TranslateFunction
  /** Worker pool (if available) */
  worker?: WorkerPool
}
```

### Built-in Steps

Each ships as a factory function. **Individual subpath imports** keep bundles small — only what you import gets bundled:

```typescript
// Individual imports (recommended — tree-shakeable, no heavy deps unless you import them)
import { hashStep } from '@upup/core/steps/hash'        // ~1KB, no deps
import { exifStep } from '@upup/core/steps/exif'        // ~2KB
import { heicStep } from '@upup/core/steps/heic'        // ~15KB (pulls heic2any)
import { gzipStep } from '@upup/core/steps/gzip'        // ~8KB (pulls pako)
import { compressStep } from '@upup/core/steps/compress' // ~2KB
import { thumbnailStep } from '@upup/core/steps/thumbnail' // ~2KB
import { deduplicateStep } from '@upup/core/steps/deduplicate' // ~1KB

// Convenience re-export (pulls ALL steps including heavy deps)
import { hashStep, exifStep, heicStep } from '@upup/core/pipeline'
```

### Default Pipeline

When no custom pipeline is provided and boolean options are set, `UpupCore` dynamically imports only the needed steps:

```typescript
// Internal — constructed from options, lazy-loaded
const defaultPipeline = [
  options.contentDeduplication && (await import('@upup/core/steps/deduplicate')).deduplicateStep(),
  options.heicConversion && (await import('@upup/core/steps/heic')).heicStep(),
  options.stripExifData && (await import('@upup/core/steps/exif')).exifStep(),
  options.imageCompression && (await import('@upup/core/steps/compress')).compressStep(normalizeCompressionOptions(options.imageCompression)),
  options.thumbnailGenerator && (await import('@upup/core/steps/thumbnail')).thumbnailStep(normalizeThumbnailOptions(options.thumbnailGenerator)),
  options.shouldCompress && (await import('@upup/core/steps/gzip')).gzipStep(),
  options.checksumVerification && (await import('@upup/core/steps/hash')).hashStep(),
].filter(Boolean)
```

When `pipeline` is provided explicitly, `UpupCore` uses it directly — no dynamic imports.

### Custom Pipeline

Consumers can compose their own:

```typescript
import { heicStep } from '@upup/core/steps/heic'
import { exifStep } from '@upup/core/steps/exif'
import { hashStep } from '@upup/core/steps/hash'

const core = new UpupCore({
  pipeline: [
    heicStep(),
    exifStep(),
    // Custom step — add watermark
    {
      name: 'watermark',
      shouldProcess: (file) => file.type.startsWith('image/'),
      process: async (file, ctx) => {
        const watermarked = await addWatermark(file, { text: '(c) 2026' })
        return watermarked
      },
    },
    hashStep(),
  ],
})
```

---

## 7. Web Workers (Feature #11)

### Scope: Option 1 — Hash + Gzip Only

Only offload CPU-bound, pure-data operations to workers:
- `computeFileHash()` — partial SHA-256 for deduplication
- `computeFullContentHash()` — full SHA-256 for checksum verification
- gzip compression via `pako`

Image processing (HEIC, EXIF, compression, thumbnails) stays on main thread because it depends on Canvas/OffscreenCanvas APIs with inconsistent worker support across browsers.

### Architecture

```typescript
class WorkerPool {
  constructor(options?: { maxWorkers?: number })

  /**
   * Execute a task in a worker. Falls back to main thread if workers unavailable.
   */
  execute<T>(task: WorkerTask): Promise<T>

  /** Terminate all workers */
  destroy(): void
}

type WorkerTask =
  | { type: 'hash-partial'; data: ArrayBuffer }
  | { type: 'hash-full'; data: ArrayBuffer }
  | { type: 'gzip'; data: ArrayBuffer }
```

### Worker Delivery

Since this is a distributed library built with tsup, workers are delivered as **inline Blob workers** — the worker code is bundled as a string and instantiated via `new Worker(URL.createObjectURL(new Blob([workerCode])))`.

Advantages:
- No separate worker file to serve or configure
- Works with any bundler (Webpack, Vite, esbuild, tsup)
- No CSP issues with `worker-src` (uses blob: URLs)
- Consumer doesn't need to configure anything

### Fallback

If `Worker` is unavailable (SSR, old browser, React Native), the same functions run synchronously on the main thread. The `WorkerPool` handles this transparently.

### Integration with Pipeline

Built-in pipeline steps that benefit from workers (`hashStep`, `gzipStep`) automatically use `context.worker` when available:

```typescript
// Inside hashStep pipeline step
async process(file, context) {
  const buffer = await file.arrayBuffer()
  const hash = context.worker
    ? await context.worker.execute({ type: 'hash-full', data: buffer })
    : await computeHashMainThread(buffer)
  return Object.assign(file, { checksumSHA256: hash })
}
```

---

## 8. Strategy Interfaces

### CredentialStrategy

Provides upload credentials (presigned URLs, multipart sessions).

```typescript
interface CredentialStrategy {
  getPresignedUrl(file: FileMetadata): Promise<PresignedUrlResponse>
  initMultipartUpload?(file: FileMetadata): Promise<MultipartInitResponse>
  signPart?(params: SignPartParams): Promise<MultipartSignPartResponse>
  completeMultipartUpload?(params: CompleteMultipartParams): Promise<MultipartCompleteResponse>
  abortMultipartUpload?(params: AbortMultipartParams): Promise<void>
  listParts?(params: ListPartsParams): Promise<MultipartListPartsResponse>
}
```

**Built-in implementations:**
- `TokenEndpointCredentials({ url })` — calls consumer's endpoint (client mode)
- `ServerCredentials({ serverUrl })` — calls @upup/server endpoints (server mode)
- `ManagedCredentials({ apiKey })` — calls upup.dev API (managed mode, future)

### OAuthStrategy

Handles cloud drive authentication.

```typescript
interface OAuthStrategy {
  getAuthUrl(provider: CloudProvider): Promise<string>
  handleCallback(provider: CloudProvider, params: Record<string, string>): Promise<OAuthTokens>
  listFiles(provider: CloudProvider, path: string, token: string): Promise<RemoteFile[]>
  getFileMetadata(provider: CloudProvider, fileId: string, token: string): Promise<RemoteFile>
}
```

**Built-in implementations:**
- `ClientOAuth(driveConfigs)` — handles OAuth in browser (client mode)
- `ServerOAuth({ serverUrl })` — delegates to @upup/server (server mode)

### UploadStrategy

How files get from client to storage.

```typescript
interface UploadStrategy {
  upload(
    file: File | Blob,
    credentials: UploadCredentials,
    options: {
      onProgress: (loaded: number, total: number) => void
      signal: AbortSignal
    },
  ): Promise<UploadResult>
}
```

**Built-in implementations:**
- `DirectUpload()` — XHR PUT from browser to presigned URL (client mode, most common)
- `ServerTransfer({ serverUrl })` — companion streams file to storage (server mode, for cloud drive files)

### RuntimeAdapter

Abstracts browser-specific APIs for future React Native / Node.js support.

```typescript
interface RuntimeAdapter {
  /** SHA-256 hash computation */
  computeHash(data: ArrayBuffer): Promise<string>

  /** Create image bitmap for processing (optional — not all runtimes support it) */
  createImageBitmap?(blob: Blob): Promise<ImageBitmap>

  /** Create a Web Worker from inline code (optional) */
  createWorker?(code: string): Worker | null

  /** HTTP upload with progress tracking */
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

  /** Read file as ArrayBuffer */
  readAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer>

  /** Create object URL for preview */
  createObjectURL?(blob: Blob): string

  /** Revoke object URL */
  revokeObjectURL?(url: string): void

  /** Persistent storage for crash recovery */
  storage?: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
    delete(key: string): Promise<void>
  }
}
```

`@upup/core` ships with `BrowserRuntime` as default. Future packages (`@upup/react-native`, `@upup/node`) would provide their own.

---

## 9. Error System

### Error Classes

All errors extend a base class in `@upup/shared`:

```typescript
class UpupError extends Error {
  code: string
  retryable: boolean
  constructor(message: string, code: string, retryable?: boolean)
}

class UpupAuthError extends UpupError {
  provider: string       // 'google_drive' | 'dropbox' | 'onedrive'
  constructor(message: string, provider: string)
}

class UpupNetworkError extends UpupError {
  status?: number
  retryable = true       // network errors are retryable by default
}

class UpupValidationError extends UpupError {
  reason: RestrictionFailedReason
  file: File
  retryable = false
}

class UpupQuotaError extends UpupError {
  limit: number
  used: number
  retryable = false
}

class UpupStorageError extends UpupError {
  provider: StorageProvider
  operation: 'presign' | 'upload' | 'multipart-init' | 'multipart-complete'
}
```

### Error Codes

```typescript
enum UpupErrorCode {
  // Auth
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_DENIED = 'AUTH_DENIED',
  AUTH_PROVIDER_ERROR = 'AUTH_PROVIDER_ERROR',

  // Validation
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TOO_SMALL = 'FILE_TOO_SMALL',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  TOTAL_SIZE_EXCEEDED = 'TOTAL_SIZE_EXCEEDED',
  DUPLICATE = 'DUPLICATE',
  MIN_FILES_NOT_MET = 'MIN_FILES_NOT_MET',

  // Upload
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  UPLOAD_ABORTED = 'UPLOAD_ABORTED',
  PRESIGN_FAILED = 'PRESIGN_FAILED',
  CORS_ERROR = 'CORS_ERROR',

  // Pipeline
  PIPELINE_STEP_FAILED = 'PIPELINE_STEP_FAILED',
  HEIC_CONVERSION_FAILED = 'HEIC_CONVERSION_FAILED',

  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Storage
  STORAGE_ERROR = 'STORAGE_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}
```

---

## 10. React Integration (@upup/react)

### useUpupUpload Hook

The primary headless API. Thin reactive wrapper over `UpupCore`. **SSR-safe** — defers `UpupCore` initialization to client side:

```typescript
'use client'

function useUpupUpload(options: CoreOptions): {
  // --- State (reactive) ---
  files: UploadFile[]
  status: UploadStatus
  progress: UploadProgress
  error: UpupError | null

  // --- File Management ---
  addFiles(files: File[]): Promise<void>
  removeFile(id: string): void
  removeAll(): void
  setFiles(files: File[]): Promise<void>
  reorderFiles(fromIndex: number, toIndex: number): void

  // --- Upload Lifecycle ---
  upload(): Promise<UploadFile[]>
  pause(): void
  resume(): void
  cancel(): void
  retry(fileId?: string): void

  // --- Core instance (escape hatch) ---
  core: UpupCore
}
```

**SSR implementation pattern:**

```typescript
function useUpupUpload(options: CoreOptions) {
  const coreRef = useRef<UpupCore | null>(null)

  // Lazy initialization — safe during SSR (typeof window check)
  if (typeof window !== 'undefined' && !coreRef.current) {
    coreRef.current = new UpupCore(options)
  }

  useEffect(() => {
    // Hydration fallback — if SSR skipped the ref init
    if (!coreRef.current) {
      coreRef.current = new UpupCore(options)
    }
    return () => {
      coreRef.current?.destroy()
      coreRef.current = null
    }
  }, [])

  // ... reactive state subscription via useSyncExternalStore
}
```

**Usage (headless — zero DOM from upup):**

```tsx
function MyCustomUploader() {
  const { files, upload, addFiles, progress, status } = useUpupUpload({
    provider: 'aws',
    uploadEndpoint: '/api/upload',
    checksumVerification: true,
  })

  return (
    <div>
      <input type="file" multiple onChange={e => addFiles([...e.target.files!])} />
      {files.map(f => <div key={f.id}>{f.name} - {f.size}</div>)}
      <progress value={progress.percentage} max={100} />
      <button onClick={upload} disabled={status === 'UPLOADING'}>Upload</button>
    </div>
  )
}
```

### UpupUploader Component

Uses `useUpupUpload()` internally. The full UI experience:

```tsx
import { UpupUploader } from '@upup/react'

function App() {
  return (
    <UpupUploader
      provider="aws"
      uploadEndpoint="/api/upload"
      sources={['local', 'google_drive', 'camera']}  // declarative source shorthand
      enablePaste                                      // clipboard paste support
      dark
    />
  )
}
```

**New props:**

```typescript
type UpupUploaderProps = CoreOptions & {
  // ... existing UI props ...
  sources?: UploadSource[]     // shorthand: ['local', 'camera', 'url', 'google_drive', 'onedrive', 'dropbox']
  enablePaste?: boolean        // listen for paste events on the drop zone
}

// UploadSource type
type UploadSource = 'local' | 'camera' | 'url' | 'google_drive' | 'onedrive' | 'dropbox' | 'microphone' | 'screen'
```

`sources` is sugar over `fileSources`. Source order in the array determines tab order in the UI. Default: `['local']`.
```

Internally:

```tsx
// Simplified — actual implementation preserves all current UI
const UpupUploader = forwardRef((props, ref) => {
  const uploader = useUpupUpload(extractCoreOptions(props))
  const uiState = useUploaderUI(uploader, props) // UI-specific state (activeAdapter, editing, etc.)

  useImperativeHandle(ref, () => ({
    useUpload: () => ({
      ...uploader,
      uploadFiles: uploader.upload,
      replaceFiles: uploader.setFiles,
    }),
  }))

  return (
    <UploaderContext.Provider value={{ ...uploader, ...uiState }}>
      <MotionConfig reducedMotion={props.reducedMotion}>
        {/* ... existing UI component tree ... */}
      </MotionConfig>
    </UploaderContext.Provider>
  )
})
```

### Backwards Compatibility

The `UpupUploader` component preserves the same props API. Consumers upgrading from v1 change their import:

```diff
- import { UpupUploader } from 'upup-react-file-uploader'
+ import { UpupUploader } from '@upup/react'
```

Props remain the same. The ref API remains the same. The `useUpupUpload()` hook is new/additional.

---

## 11. Server Integration (@upup/server)

### Handler Factory

```typescript
// @upup/server/next
function createUpupHandler(config: UpupServerConfig): {
  GET: NextRouteHandler
  POST: NextRouteHandler
}

// @upup/server/express
function createUpupMiddleware(config: UpupServerConfig): ExpressMiddleware

// @upup/server/hono
function createUpupRoutes(config: UpupServerConfig): HonoRoutes
```

### Server Config

```typescript
type UpupServerConfig = {
  // --- Storage ---
  storage: {
    type: StorageProvider
    bucket: string
    region: string
    accessKeyId?: string          // or use env vars
    secretAccessKey?: string
    // Azure-specific, Backblaze-specific, etc.
    [key: string]: unknown
  }

  // --- OAuth providers (optional — only needed for server mode) ---
  providers?: {
    googleDrive?: { clientId: string; clientSecret: string }
    dropbox?: { appKey: string; appSecret: string }
    oneDrive?: { clientId: string; clientSecret: string; tenantId?: string }
  }

  // --- Session / token storage ---
  tokenStore?: TokenStore         // Default: in-memory. Production: Redis, DB, etc.

  // --- Lifecycle hooks ---
  hooks?: {
    onBeforeUpload?: (file: FileMetadata, req: Request) => Promise<boolean>
    onFileUploaded?: (file: UploadedFile, req: Request) => Promise<void>
    onUploadComplete?: (files: UploadedFile[], req: Request) => Promise<void>
  }

  // --- Security ---
  auth?: (req: Request) => Promise<boolean>   // Verify the request is authorized
  maxFileSize?: number
  allowedTypes?: string[]
}
```

### API Routes

The handler exposes these routes (all under the mount point):

```
POST   /presign              — Generate presigned URL
POST   /multipart/init       — Initiate multipart upload
POST   /multipart/sign-part  — Sign a single part
POST   /multipart/complete   — Complete multipart upload
POST   /multipart/abort      — Abort multipart upload
GET    /multipart/list-parts — List uploaded parts

GET    /auth/:provider       — Start OAuth flow (redirect)
GET    /auth/:provider/cb    — OAuth callback
GET    /files/:provider      — List files from cloud drive
POST   /files/:provider/transfer — Stream file from drive to storage
```

---

## 12. Migration Path

### From packages/upup to 4 packages

Phase 1: Create new package structure, move code:

```
packages/upup/src/shared/         → packages/shared/src/
packages/upup/src/frontend/lib/   → packages/core/src/ (pipeline, file utils, storage)
packages/upup/src/frontend/hooks/useRootProvider.ts → packages/core/src/UpupCore.ts (renamed from useRootProvider)
packages/upup/src/frontend/       → packages/react/src/ (components, hooks, context)
packages/upup/src/backend/        → packages/server/src/
```

Phase 2: Wire up internal dependencies, update imports.

Phase 3: Update apps/playground and apps/landing to use new packages.

Phase 4: Build all packages, verify everything works.

Phase 5: Remove packages/upup.

### Breaking Changes

- Package name: `upup-react-file-uploader` → `@upup/react` (and `@upup/core`, `@upup/shared`, `@upup/server`)
- Import paths: all change
- `UploadStatus` enum values renamed: `PENDING` → `IDLE`, `ONGOING` → `UPLOADING`
- `UpupUploaderRef.useUpload()` — still works but `useUpupUpload()` hook is the preferred headless API
- Node.js backend utilities: `upup-react-file-uploader/node` → `@upup/server`
- All naming changes from Section 15 (Naming Conventions)

---

## 13. Build & Tooling

Each package uses tsup. All packages set `"sideEffects": false` for tree-shaking.

| Package | Formats | Entry points |
|---------|---------|-------------|
| `@upup/shared` | ESM + CJS | `src/index.ts` |
| `@upup/core` | ESM + CJS | `src/index.ts`, `src/pipeline/index.ts`, `src/steps/hash.ts`, `src/steps/gzip.ts`, `src/steps/heic.ts`, `src/steps/exif.ts`, `src/steps/compress.ts`, `src/steps/thumbnail.ts`, `src/steps/deduplicate.ts` |
| `@upup/react` | ESM + CJS | `src/index.ts` (includes CSS) |
| `@upup/server` | ESM + CJS | `src/index.ts`, `src/next.ts`, `src/express.ts`, `src/hono.ts`, `src/fastify.ts` |

DTS (declaration files) generated for all packages.

### Bundle Size Enforcement

CI-enforced size budgets via `size-limit`:

```json
{
  "size-limit": [
    { "path": "packages/core/dist/index.mjs", "limit": "12 KB", "name": "@upup/core (main)" },
    { "path": "packages/shared/dist/index.mjs", "limit": "5 KB", "name": "@upup/shared" },
    { "path": "packages/react/dist/index.mjs", "limit": "25 KB", "name": "@upup/react" },
    { "path": "packages/server/dist/index.mjs", "limit": "10 KB", "name": "@upup/server" },
    { "path": "packages/core/dist/steps/hash.mjs", "limit": "3 KB", "name": "@upup/core/steps/hash" },
    { "path": "packages/core/dist/steps/heic.mjs", "limit": "20 KB", "name": "@upup/core/steps/heic" },
    { "path": "packages/core/dist/steps/gzip.mjs", "limit": "12 KB", "name": "@upup/core/steps/gzip" }
  ]
}
```

Budgets are initial targets — adjust after baseline measurement. `@upup/core` main entry must stay lean (no heavy deps). Heavy deps (pako, heic2any) live behind subpath exports.

### pnpm workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

---

## 14. Testing Strategy

- **@upup/core:** Unit tests for UpupCore, pipeline steps, worker pool, strategies, plugin system. Vitest.
- **@upup/react:** Component tests for useUpupUpload hook and UpupUploader component. React Testing Library.
- **@upup/server:** Integration tests for route handlers. Supertest.
- **E2E:** Existing Playwright tests in packages/upup/e2e/ migrate to test the full @upup/react component.
- **Accessibility:** `axe-core` integration tests for all interactive components. WCAG AA compliance.
  - All interactive elements: proper ARIA roles and labels
  - File list: `role="list"` / `role="listitem"` with `aria-live="polite"` status announcements
  - Drop zone: drag state announced via ARIA attributes
  - Upload progress: `aria-valuenow` / `aria-valuemin` / `aria-valuemax`
  - Full keyboard navigation: Tab → Enter/Space → Tab through files → Delete to remove
  - Focus management: focus returns to sensible element after file removal, upload completion
  - Error messages associated with their file via `aria-describedby`
  - Color contrast compliance (WCAG AA minimum)
- **Bundle size:** `size-limit` CI check on every PR — fails if any package exceeds its budget.

---

## 15. What This Unlocks

| Capability | How |
|---|---|
| Headless React uploader | `useUpupUpload()` from `@upup/react` |
| Full UI uploader | `<UpupUploader>` from `@upup/react` (same as today) |
| Custom processing pipeline | `pipeline: [...]` in core options |
| Third-party plugins | `core.use(plugin)` — analytics, thumbnails, virus scanning, etc. |
| Type-safe plugin extensions | `.use()` chaining with generic inference |
| Minimal bundle by default | Core ~8-10KB gzip. Steps are opt-in subpath imports. |
| SSR / Next.js App Router | Works out of the box — `'use client'`, deferred init, no hydration issues |
| Clipboard paste upload | `enablePaste` prop or `<PasteZone>` component |
| Custom success detection | `isSuccessfulCall` for APIs that return 200 with error bodies |
| Async file validation | `onBeforeFileAdded` supports `Promise<boolean>` — server-side duplicate checks |
| Per-batch option overrides | `addFiles(files, { maxRetries: 5 })` |
| Web Workers for heavy compute | Automatic in `hashStep()` and `gzipStep()` |
| Server-side OAuth + streaming | `@upup/server` embedded in Next.js/Express |
| Declarative source config | `sources={['local', 'camera', 'url']}` shorthand |
| Vue/Svelte bindings (future) | Wrap `UpupCore` from `@upup/core` |
| React Native (future) | Provide `ReactNativeRuntime` adapter |
| Managed service (future) | Host `@upup/server`, add billing |
| Custom upload endpoint | Implement `CredentialStrategy` interface |
| Box/new providers | Add to core's provider clients |
| Virus scanning / transcoding | Server lifecycle hooks |
| Offline queue (future) | Core's serializable state + ServiceWorker |
| Virtual scrolling (future) | UI concern — stays in `@upup/react` |

---

## 16. Naming Conventions

All names were audited and standardized for v2. The principles:
- Names should describe what something **is** or **does**, not implementation details
- Avoid overloaded terms (`provider`, `adapter`, `params`)
- Match industry conventions (DropZone, not MainBox)
- Remove redundant prefixes inside scoped packages (`UploaderProps`, not `UpupUploaderProps`)

### Renames from v1

| v1 Name | v2 Name | Reason |
|---|---|---|
| **Types** | | |
| `FileWithParams` | `UploadFile` | "params" is vague; this is a file with upload metadata |
| `FileWithProgress` | `UploadFileWithProgress` | Follows `UploadFile` |
| `UploadAdapter` | `FileSource` | "adapter" = design pattern; these are file sources |
| `UpupProvider` | `StorageProvider` | Disambiguates from React Provider / strategy provider |
| `UpupUploaderProps` | `UploaderProps` | Redundant prefix inside `@upup/react` |
| `UpupUploaderPropsClassNames` | `UploaderClassNames` | Same |
| `UpupUploaderPropsIcons` | `UploaderIcons` | Same |
| `UpupUploaderRef` | `UploaderRef` | Same |
| `UpupCoreOptions` | `CoreOptions` | Same |
| `StorageSDK` / `ProviderSDK` | `StorageClient` | Not an SDK; it's a client |
| **Enum Values** | | |
| `UploadAdapter.INTERNAL` | `FileSource.LOCAL` | "local files from device" |
| `UploadAdapter.LINK` | `FileSource.URL` | Industry-standard term |
| `UploadAdapter.AUDIO` | `FileSource.MICROPHONE` | More specific — it's mic recording |
| `UploadAdapter.SCREEN_CAPTURE` | `FileSource.SCREEN` | Shorter, still clear |
| `UploadAdapter.CAMERA` | `FileSource.CAMERA` | Unchanged |
| `UploadAdapter.GOOGLE_DRIVE` | `FileSource.GOOGLE_DRIVE` | Unchanged |
| `UploadAdapter.ONE_DRIVE` | `FileSource.ONE_DRIVE` | Unchanged |
| `UploadAdapter.DROPBOX` | `FileSource.DROPBOX` | Unchanged |
| **Components** | | |
| `MainBox` | `DropZone` | Industry-standard term |
| `AdapterSelector` | `SourceSelector` | Follows `FileSource` |
| `AdapterView` | `SourceView` | Same |
| `Informer` | `Notifier` | Standard term for toast/notification |
| `ShouldRender` | Removed | Use inline `{condition && <X/>}` |
| **Hooks / Internals** | | |
| `useRootProvider` | `useUploaderEngine` | Describes what it does |
| `RootContext` | `UploaderContext` | Matches component name |
| `proceedUpload` | `startUpload` | Standard verb |
| `dynamicUpload` | `uploadFiles` | Describes the action |
| `dynamicallyReplaceFiles` | `replaceFiles` | Simpler |
| `handlePrepareFiles` | `preprocessFiles` | Clearer |
| `handleSetSelectedFiles` | `processSelectedFiles` | Describes the action |
| **Props** | | |
| `tokenEndpoint` | `uploadEndpoint` | More general — works for any credential strategy |
| `uploadAdapters` | `fileSources` | Follows `FileSource` enum |
| **Google types** | | |
| `User` | `GoogleUser` | Consistency with `MicrosoftUser`, `DropboxUser` |
| `Root` | `GoogleRoot` | Consistency with `OneDriveRoot`, `DropboxRoot` |

### Names Kept As-Is

These names are clear and follow conventions — no changes needed:

- Component names: `FileList`, `FilePreview`, `FilePreviewPortal`, `ProgressBar`, `CameraUploader`, etc.
- Hook names: `useUpload`, `useCameraUploader`, `useGoogleDrive`, etc.
- i18n: `t()`, `plural()`, translation keys
- CSS prefix: `upup-`
- Utility: `cn()`
- Callbacks: `onFileUploadComplete`, `onError`, `onRestrictionFailed`, etc.
- `classNames` prop
- `UpupCore` class name (reads naturally with scoped import: `import { UpupCore } from '@upup/core'`)
- `UpupUploader` component name (keeps brand identity in consumer code)
