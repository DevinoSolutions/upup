# upup v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite upup as 4 packages (`@upup/shared`, `@upup/core`, `@upup/react`, `@upup/server`) with headless-first architecture, composable strategies, middleware pipeline, and Web Workers.

**Architecture:** Extract the monolithic `packages/upup` into 4 scoped packages. `@upup/shared` holds types/i18n/constants. `@upup/core` is a framework-agnostic engine (UpupCore class) extracted from `useRootProvider`. `@upup/react` wraps core with `useUpupUpload()` hook + all UI components. `@upup/server` provides embeddable route handlers for OAuth proxy and presigned URL generation.

**Tech Stack:** TypeScript, tsup (build), pnpm workspaces, React 18+, framer-motion, tus-js-client, pako, heic2any, Vitest (new tests), Playwright (E2E)

**Spec:** `docs/superpowers/specs/2026-03-28-upup-v2-architecture-design.md`

---

## Phase Overview

| Phase | What | Depends On |
|-------|------|------------|
| 1 | Package scaffold + @upup/shared | Nothing |
| 2 | @upup/core (UpupCore class, pipeline, strategies, workers) | Phase 1 |
| 3 | @upup/react (useUpupUpload hook, UI components) | Phase 2 |
| 4 | @upup/server (route handlers, OAuth proxy) | Phase 1 |
| 5 | Integration, migration, cleanup | Phases 2-4 |

---

## Phase 1: Package Scaffold + @upup/shared

### Task 1.1: Create package directory structure

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/tsup.config.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/react/package.json`
- Create: `packages/react/tsconfig.json`
- Create: `packages/react/tsup.config.ts`
- Create: `packages/react/src/index.ts`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/tsup.config.ts`
- Create: `packages/server/src/index.ts`

- [ ] **Step 1: Create packages/shared scaffold**

```json
// packages/shared/package.json
{
  "name": "@upup/shared",
  "version": "2.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.4.0",
    "typescript": "^5.3.2"
  }
}
```

```typescript
// packages/shared/tsup.config.ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2019',
})
```

```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

```typescript
// packages/shared/src/index.ts
// Placeholder — will be populated in Task 1.2
export {}
```

- [ ] **Step 2: Create packages/core scaffold**

```json
// packages/core/package.json
{
  "name": "@upup/core",
  "version": "2.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./pipeline": {
      "types": "./dist/pipeline/index.d.ts",
      "import": "./dist/pipeline/index.mjs",
      "require": "./dist/pipeline/index.js"
    }
  },
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@upup/shared": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.4.0",
    "typescript": "^5.3.2",
    "vitest": "^3.0.0"
  }
}
```

```typescript
// packages/core/tsup.config.ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts', 'src/pipeline/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  external: ['@upup/shared'],
})
```

```json
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

```typescript
// packages/core/src/index.ts
export {}
// packages/core/src/pipeline/index.ts
export {}
```

- [ ] **Step 3: Create packages/react scaffold**

```json
// packages/react/package.json
{
  "name": "@upup/react",
  "version": "2.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./locales": {
      "types": "./dist/locales/index.d.ts",
      "import": "./dist/locales/index.mjs",
      "require": "./dist/locales/index.js"
    },
    "./styles": "./dist/tailwind-prefixed.css"
  },
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup && pnpm run build:css",
    "build:css": "postcss src/tailwind.css -o ./dist/tailwind-prefixed.css",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@upup/core": "workspace:*",
    "@upup/shared": "workspace:*",
    "clsx": "^2.1.1",
    "framer-motion": "^12.0.6",
    "react-icons": "^5.5.0",
    "react-webcam": "^7.2.0",
    "tailwind-merge": "^2.6.0",
    "truncate": "^3.0.0",
    "use-debounce": "^10.0.4"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "filerobot-image-editor": ">=4.0.0",
    "react-filerobot-image-editor": ">=4.0.0",
    "konva": ">=9.0.0",
    "react-konva": ">=18.0.0",
    "styled-components": ">=5.0.0"
  },
  "peerDependenciesMeta": {
    "react-filerobot-image-editor": { "optional": true },
    "filerobot-image-editor": { "optional": true },
    "react-konva": { "optional": true },
    "konva": { "optional": true },
    "styled-components": { "optional": true }
  },
  "devDependencies": {
    "@types/react": ">=18.0.0",
    "@types/react-dom": ">=18.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.2",
    "postcss-cli": "^11.0.1",
    "postcss-prefix-selector": "^2.1.1",
    "tailwindcss": "^3.4.17",
    "tsup": "^8.4.0",
    "typescript": "^5.3.2",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.1"
  }
}
```

```typescript
// packages/react/tsup.config.ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts', 'src/locales/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  external: [
    '@upup/core',
    '@upup/shared',
    'react',
    'react-dom',
    'react-filerobot-image-editor',
    'filerobot-image-editor',
    'react-konva',
    'konva',
    'styled-components',
  ],
})
```

```typescript
// packages/react/src/index.ts
export {}
```

- [ ] **Step 4: Create packages/server scaffold**

```json
// packages/server/package.json
{
  "name": "@upup/server",
  "version": "2.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./next": {
      "types": "./dist/next.d.ts",
      "import": "./dist/next.mjs",
      "require": "./dist/next.js"
    },
    "./express": {
      "types": "./dist/express.d.ts",
      "import": "./dist/express.mjs",
      "require": "./dist/express.js"
    },
    "./hono": {
      "types": "./dist/hono.d.ts",
      "import": "./dist/hono.mjs",
      "require": "./dist/hono.js"
    },
    "./fastify": {
      "types": "./dist/fastify.d.ts",
      "import": "./dist/fastify.mjs",
      "require": "./dist/fastify.js"
    }
  },
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@upup/core": "workspace:*",
    "@upup/shared": "workspace:*",
    "@aws-sdk/client-s3": "^3.689.0",
    "@aws-sdk/s3-request-presigner": "^3.689.0"
  },
  "devDependencies": {
    "tsup": "^8.4.0",
    "typescript": "^5.3.2",
    "vitest": "^3.0.0",
    "@types/node": "^20.10.0"
  }
}
```

```typescript
// packages/server/tsup.config.ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: [
    'src/index.ts',
    'src/next.ts',
    'src/express.ts',
    'src/hono.ts',
    'src/fastify.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  platform: 'node',
  external: ['@upup/core', '@upup/shared'],
})
```

```typescript
// packages/server/src/index.ts
export {}
// packages/server/src/next.ts
export {}
// packages/server/src/express.ts
export {}
// packages/server/src/hono.ts
export {}
// packages/server/src/fastify.ts
export {}
```

- [ ] **Step 5: Verify all 4 packages build**

Run:
```bash
cd packages/shared && pnpm install && pnpm build
cd ../core && pnpm install && pnpm build
cd ../react && pnpm install && pnpm build
cd ../server && pnpm install && pnpm build
```

Expected: All 4 build with zero errors (they export `{}` for now).

- [ ] **Step 6: Commit**

```bash
git add packages/shared packages/core packages/react packages/server
git commit -m "chore: scaffold @upup/shared, @upup/core, @upup/react, @upup/server packages"
```

---

### Task 1.2: Move types and enums to @upup/shared (with renames)

**Files:**
- Create: `packages/shared/src/types/upload-file.ts`
- Create: `packages/shared/src/types/file-source.ts`
- Create: `packages/shared/src/types/storage-provider.ts`
- Create: `packages/shared/src/types/upload-status.ts`
- Create: `packages/shared/src/types/options.ts`
- Create: `packages/shared/src/types/upload-protocols.ts`
- Create: `packages/shared/src/types/callbacks.ts`
- Create: `packages/shared/src/types/class-names.ts`
- Create: `packages/shared/src/types/icons.ts`
- Create: `packages/shared/src/types/image-editor.ts`
- Create: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts`
- Reference: `packages/upup/src/shared/types.ts` (source of truth)

- [ ] **Step 1: Create FileSource enum (renamed from UploadAdapter)**

```typescript
// packages/shared/src/types/file-source.ts
export enum FileSource {
  LOCAL = 'LOCAL',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  ONE_DRIVE = 'ONE_DRIVE',
  DROPBOX = 'DROPBOX',
  URL = 'URL',
  CAMERA = 'CAMERA',
  MICROPHONE = 'MICROPHONE',
  SCREEN = 'SCREEN',
}
```

- [ ] **Step 2: Create StorageProvider enum (renamed from UpupProvider)**

```typescript
// packages/shared/src/types/storage-provider.ts
export enum StorageProvider {
  AWS = 'aws',
  Azure = 'azure',
  BackBlaze = 'backblaze',
  DigitalOcean = 'digitalocean',
}
```

- [ ] **Step 3: Create UploadStatus enum (updated values)**

```typescript
// packages/shared/src/types/upload-status.ts
export enum UploadStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  UPLOADING = 'UPLOADING',
  PAUSED = 'PAUSED',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}
```

- [ ] **Step 4: Create UploadFile type (renamed from FileWithParams)**

```typescript
// packages/shared/src/types/upload-file.ts
export type UploadFile = File & {
  id: string
  url: string
  relativePath?: string
  key?: string
  fileHash?: string | undefined
  checksumSHA256?: string
  etag?: string
  thumbnail?: {
    file: File
    key?: string
  }
}

export type UploadFileWithProgress = UploadFile & { progress: number }
```

- [ ] **Step 5: Create upload protocol types**

```typescript
// packages/shared/src/types/upload-protocols.ts
export type PresignedUrlResponse = {
  key: string
  publicUrl: string
  uploadUrl: string
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
  publicUrl: string
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
      mode: 'multipart'
      chunkSizeBytes?: number
      persist?: boolean
    }
  | {
      mode: 'tus'
      endpoint: string
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
```

- [ ] **Step 6: Create image editor, class names, icons types**

Copy from `packages/upup/src/shared/types.ts` — these types are unchanged except for the rename of `UpupUploaderPropsClassNames` → `UploaderClassNames`, `UpupUploaderPropsIcons` → `UploaderIcons`. These are large type definitions; copy them verbatim from the source file with only the type name changed.

```typescript
// packages/shared/src/types/image-editor.ts
import type { UploadFile } from './upload-file'

export type ImageEditorOptions = {
  enabled?: boolean
  display?: 'inline' | 'modal'
  autoOpen?: 'never' | 'single' | 'always'
  output?: {
    mimeType?: string
    quality?: number
    fileName?: (original: File) => string
  }
  tabs?: ('Adjust' | 'Annotate' | 'Filters' | 'Finetune' | 'Resize' | 'Watermark')[]
  tools?: ('Crop' | 'Rotate' | 'Flip' | 'Brightness' | 'Contrast' | 'HSV' | 'Blur' | 'Text' | 'Line' | 'Rect' | 'Ellipse' | 'Polygon' | 'Pen' | 'Arrow' | 'Image')[]
  onOpen?: (file: UploadFile) => void
  onCancel?: (file: UploadFile) => void
  onSave?: (editedFile: UploadFile, originalFile: UploadFile) => void
}

export type ResolvedImageEditorOptions = Required<
  Pick<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>
> &
  Omit<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>

export type ImageCompressionOptions = {
  quality?: number
  maxWidth?: number
  maxHeight?: number
  mimeType?: string
  convertSize?: number
}

export type ThumbnailGeneratorOptions = {
  thumbnailWidth?: number
  thumbnailHeight?: number
  thumbnailType?: string
  waitForThumbnailsBeforeUpload?: boolean
}
```

```typescript
// packages/shared/src/types/class-names.ts
export type UploaderClassNames = {
  fileIcon?: string
  containerMini?: string
  containerFull?: string
  containerHeader?: string
  containerCancelButton?: string
  containerAddMoreButton?: string
  adapterButtonList?: string
  adapterButton?: string
  adapterButtonIcon?: string
  adapterButtonText?: string
  adapterViewHeader?: string
  adapterViewCancelButton?: string
  adapterView?: string
  driveLoading?: string
  driveHeader?: string
  driveLogoutButton?: string
  driveSearchContainer?: string
  driveSearchInput?: string
  driveBody?: string
  driveItemContainerDefault?: string
  driveItemContainerSelected?: string
  driveItemContainerInner?: string
  driveItemInnerText?: string
  driveFooter?: string
  driveAddFilesButton?: string
  driveCancelFilesButton?: string
  urlInput?: string
  urlFetchButton?: string
  cameraPreviewContainer?: string
  cameraDeleteButton?: string
  cameraCaptureButton?: string
  cameraRotateButton?: string
  cameraMirrorButton?: string
  cameraAddButton?: string
  cameraModeToggle?: string
  cameraVideoRecordButton?: string
  cameraVideoStopButton?: string
  cameraVideoPreview?: string
  cameraVideoAddButton?: string
  cameraVideoDeleteButton?: string
  audioRecordButton?: string
  audioStopButton?: string
  audioPlaybackContainer?: string
  audioWaveform?: string
  audioAddButton?: string
  audioDeleteButton?: string
  screenCaptureContainer?: string
  screenCaptureStartButton?: string
  screenCaptureStopButton?: string
  screenCapturePreview?: string
  screenCaptureAddButton?: string
  screenCaptureDeleteButton?: string
  fileListContainer?: string
  fileListContainerInnerSingle?: string
  fileListContainerInnerMultiple?: string
  fileListFooter?: string
  filePreviewPortal?: string
  fileItemSingle?: string
  fileItemMultiple?: string
  fileThumbnailSingle?: string
  fileThumbnailMultiple?: string
  fileInfo?: string
  fileName?: string
  fileSize?: string
  filePreviewButton?: string
  fileDeleteButton?: string
  uploadButton?: string
  uploadDoneButton?: string
  progressBarContainer?: string
  progressBar?: string
  progressBarInner?: string
  progressBarText?: string
}
```

```typescript
// packages/shared/src/types/icons.ts
import type { FC } from 'react'

export type UploaderIcons = {
  ContainerAddMoreIcon?: FC<{ className?: string }>
  FileDeleteIcon?: FC<{ className?: string }>
  CameraDeleteIcon?: FC<{ className?: string }>
  CameraCaptureIcon?: FC<{ className?: string }>
  CameraRotateIcon?: FC<{ className?: string }>
  CameraMirrorIcon?: FC<{ className?: string }>
  CameraVideoRecordIcon?: FC<{ className?: string }>
  CameraVideoStopIcon?: FC<{ className?: string }>
  CameraVideoDeleteIcon?: FC<{ className?: string }>
  AudioRecordIcon?: FC<{ className?: string }>
  AudioStopIcon?: FC<{ className?: string }>
  AudioDeleteIcon?: FC<{ className?: string }>
  ScreenCaptureStartIcon?: FC<{ className?: string }>
  ScreenCaptureStopIcon?: FC<{ className?: string }>
  ScreenCaptureDeleteIcon?: FC<{ className?: string }>
  LoaderIcon?: FC<{ className?: string }>
}
```

Note: `UploaderIcons` references `FC` from React. Add `react` as an optional peerDependency in `@upup/shared` for the type import only:

```json
// Add to packages/shared/package.json
"peerDependencies": {
  "react": ">=18.0.0"
},
"peerDependenciesMeta": {
  "react": { "optional": true }
}
```

- [ ] **Step 7: Create error classes**

```typescript
// packages/shared/src/errors.ts
export enum UpupErrorCode {
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_DENIED = 'AUTH_DENIED',
  AUTH_PROVIDER_ERROR = 'AUTH_PROVIDER_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TOO_SMALL = 'FILE_TOO_SMALL',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  TOTAL_SIZE_EXCEEDED = 'TOTAL_SIZE_EXCEEDED',
  DUPLICATE = 'DUPLICATE',
  MIN_FILES_NOT_MET = 'MIN_FILES_NOT_MET',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  UPLOAD_ABORTED = 'UPLOAD_ABORTED',
  PRESIGN_FAILED = 'PRESIGN_FAILED',
  CORS_ERROR = 'CORS_ERROR',
  PIPELINE_STEP_FAILED = 'PIPELINE_STEP_FAILED',
  HEIC_CONVERSION_FAILED = 'HEIC_CONVERSION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  STORAGE_ERROR = 'STORAGE_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

export type RestrictionFailedReason =
  | 'TYPE_MISMATCH'
  | 'FILE_TOO_LARGE'
  | 'FILE_TOO_SMALL'
  | 'LIMIT_EXCEEDED'
  | 'TOTAL_SIZE_EXCEEDED'
  | 'DUPLICATE'
  | 'BEFORE_FILE_ADDED_REJECTED'

export class UpupError extends Error {
  code: string
  retryable: boolean
  constructor(message: string, code: string, retryable = false) {
    super(message)
    this.name = 'UpupError'
    this.code = code
    this.retryable = retryable
  }
}

export class UpupAuthError extends UpupError {
  provider: string
  constructor(message: string, provider: string) {
    super(message, UpupErrorCode.AUTH_PROVIDER_ERROR, false)
    this.name = 'UpupAuthError'
    this.provider = provider
  }
}

export class UpupNetworkError extends UpupError {
  status?: number
  constructor(message: string, status?: number) {
    super(message, UpupErrorCode.NETWORK_ERROR, true)
    this.name = 'UpupNetworkError'
    this.status = status
  }
}

export class UpupValidationError extends UpupError {
  reason: RestrictionFailedReason
  file: File
  constructor(message: string, reason: RestrictionFailedReason, file: File) {
    super(message, reason, false)
    this.name = 'UpupValidationError'
    this.reason = reason
    this.file = file
  }
}

export class UpupQuotaError extends UpupError {
  limit: number
  used: number
  constructor(message: string, limit: number, used: number) {
    super(message, UpupErrorCode.QUOTA_EXCEEDED, false)
    this.name = 'UpupQuotaError'
    this.limit = limit
    this.used = used
  }
}

export class UpupStorageError extends UpupError {
  provider: string
  operation: 'presign' | 'upload' | 'multipart-init' | 'multipart-complete'
  constructor(message: string, provider: string, operation: UpupStorageError['operation']) {
    super(message, UpupErrorCode.STORAGE_ERROR, false)
    this.name = 'UpupStorageError'
    this.provider = provider
    this.operation = operation
  }
}
```

- [ ] **Step 8: Create strategy interfaces**

```typescript
// packages/shared/src/strategies.ts
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
}

export type UploadCredentials = PresignedUrlResponse

export type UploadResult = {
  key: string
  publicUrl?: string
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

export type CloudProvider = 'google_drive' | 'dropbox' | 'onedrive'

export interface CredentialStrategy {
  getPresignedUrl(file: FileMetadata): Promise<PresignedUrlResponse>
  initMultipartUpload?(file: FileMetadata): Promise<MultipartInitResponse>
  signPart?(params: { key: string; uploadId: string; partNumber: number }): Promise<MultipartSignPartResponse>
  completeMultipartUpload?(params: { key: string; uploadId: string; parts: { partNumber: number; eTag: string }[] }): Promise<MultipartCompleteResponse>
  abortMultipartUpload?(params: { key: string; uploadId: string }): Promise<void>
  listParts?(params: { key: string; uploadId: string }): Promise<MultipartListPartsResponse>
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
```

- [ ] **Step 9: Create pipeline interfaces**

```typescript
// packages/shared/src/pipeline.ts
import type { UploadFile } from './types/upload-file'

export interface PipelineStep {
  name: string
  process(file: UploadFile, context: PipelineContext): Promise<UploadFile>
  shouldProcess?(file: UploadFile): boolean
}

export interface PipelineContext {
  files: ReadonlyMap<string, UploadFile>
  options: Record<string, unknown>
  emit(event: string, data?: unknown): void
  t: (template: string, vars?: Record<string, unknown>) => string
  worker?: {
    execute<T>(task: { type: string; data: ArrayBuffer }): Promise<T>
  }
}
```

- [ ] **Step 10: Create types barrel export**

```typescript
// packages/shared/src/types/index.ts
export * from './upload-file'
export * from './file-source'
export * from './storage-provider'
export * from './upload-status'
export * from './upload-protocols'
export * from './image-editor'
export * from './class-names'
export * from './icons'
```

- [ ] **Step 11: Update shared index to export everything**

```typescript
// packages/shared/src/index.ts
export * from './types'
export * from './errors'
export * from './strategies'
export * from './pipeline'
```

- [ ] **Step 12: Build @upup/shared and verify**

Run:
```bash
cd packages/shared && pnpm install && pnpm build
```

Expected: Build succeeds, `dist/` contains `index.js`, `index.mjs`, `index.d.ts` with all exports.

- [ ] **Step 13: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add types, enums, errors, strategy and pipeline interfaces

Renames: FileWithParams→UploadFile, UploadAdapter→FileSource,
UpupProvider→StorageProvider, UpupUploaderPropsClassNames→UploaderClassNames"
```

---

### Task 1.3: Move i18n to @upup/shared

**Files:**
- Create: `packages/shared/src/i18n/index.ts`
- Create: `packages/shared/src/i18n/types.ts`
- Create: `packages/shared/src/i18n/en_US.ts`
- Create: `packages/shared/src/i18n/locales/` (all locale files)
- Reference: `packages/upup/src/shared/i18n/` (source)

- [ ] **Step 1: Copy i18n system from packages/upup/src/shared/i18n/**

Copy the entire `packages/upup/src/shared/i18n/` directory to `packages/shared/src/i18n/`. Files to copy:
- `index.ts` (exports `t`, `plural`, `en_US`)
- `types.ts` (Translations type)
- `en_US.ts` (default locale)
- `locales/` directory (ar_SA, de_DE, es_ES, fr_FR, ja_JP, ko_KR, zh_CN, zh_TW)

No renames needed — `t()`, `plural()`, and translation keys are kept as-is.

- [ ] **Step 2: Update packages/shared/src/index.ts to re-export i18n**

```typescript
// packages/shared/src/index.ts
export * from './types'
export * from './errors'
export * from './strategies'
export * from './pipeline'
export { t, plural, en_US } from './i18n'
export type { Translations } from './i18n/types'
```

- [ ] **Step 3: Build and verify**

Run:
```bash
cd packages/shared && pnpm build
```

Expected: Build succeeds with i18n exports included.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/i18n/
git commit -m "feat(shared): add i18n system with all locale packs"
```

---

## Phase 2: @upup/core

### Task 2.1: Event emitter and state management

**Files:**
- Create: `packages/core/src/events.ts`
- Create: `packages/core/src/state.ts`
- Create: `packages/core/tests/events.test.ts`
- Create: `packages/core/tests/state.test.ts`

- [ ] **Step 1: Write failing test for event emitter**

```typescript
// packages/core/tests/events.test.ts
import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../src/events'

describe('EventEmitter', () => {
  it('calls handler when event is emitted', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()
    emitter.on('test', handler)
    emitter.emit('test', { value: 42 })
    expect(handler).toHaveBeenCalledWith({ value: 42 })
  })

  it('returns unsubscribe function from on()', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()
    const unsub = emitter.on('test', handler)
    unsub()
    emitter.emit('test', {})
    expect(handler).not.toHaveBeenCalled()
  })

  it('off() removes handler', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()
    emitter.on('test', handler)
    emitter.off('test', handler)
    emitter.emit('test', {})
    expect(handler).not.toHaveBeenCalled()
  })

  it('supports multiple handlers for same event', () => {
    const emitter = new EventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()
    emitter.on('test', h1)
    emitter.on('test', h2)
    emitter.emit('test', 'data')
    expect(h1).toHaveBeenCalledWith('data')
    expect(h2).toHaveBeenCalledWith('data')
  })

  it('does not throw when emitting with no handlers', () => {
    const emitter = new EventEmitter()
    expect(() => emitter.emit('test', {})).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement EventEmitter**

```typescript
// packages/core/src/events.ts
type Handler = (data: unknown) => void

export class EventEmitter {
  private handlers = new Map<string, Set<Handler>>()

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit(event: string, data?: unknown): void {
    this.handlers.get(event)?.forEach(handler => handler(data))
  }

  removeAllListeners(): void {
    this.handlers.clear()
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd packages/core && pnpm test`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add EventEmitter with subscribe/unsubscribe"
```

---

### Task 2.2: Pipeline engine

**Files:**
- Create: `packages/core/src/pipeline/engine.ts`
- Create: `packages/core/src/pipeline/index.ts`
- Create: `packages/core/tests/pipeline.test.ts`

- [ ] **Step 1: Write failing test for pipeline engine**

```typescript
// packages/core/tests/pipeline.test.ts
import { describe, it, expect, vi } from 'vitest'
import { runPipeline } from '../src/pipeline/engine'
import type { PipelineStep, PipelineContext } from '@upup/shared'
import type { UploadFile } from '@upup/shared'

const mockFile = (name: string): UploadFile => {
  const file = new File(['content'], name, { type: 'image/png' })
  return Object.assign(file, { id: '1', url: 'blob:test' })
}

const mockContext: PipelineContext = {
  files: new Map(),
  options: {},
  emit: vi.fn(),
  t: (s: string) => s,
}

describe('runPipeline', () => {
  it('runs steps in sequence', async () => {
    const order: string[] = []
    const step1: PipelineStep = {
      name: 'step1',
      process: async (file) => { order.push('step1'); return file },
    }
    const step2: PipelineStep = {
      name: 'step2',
      process: async (file) => { order.push('step2'); return file },
    }

    const file = mockFile('test.png')
    await runPipeline(file, [step1, step2], mockContext)
    expect(order).toEqual(['step1', 'step2'])
  })

  it('passes modified file to next step', async () => {
    const step1: PipelineStep = {
      name: 'rename',
      process: async (file) => {
        return Object.assign(file, { checksumSHA256: 'abc123' })
      },
    }
    const step2: PipelineStep = {
      name: 'verify',
      process: async (file) => {
        expect(file.checksumSHA256).toBe('abc123')
        return file
      },
    }

    const file = mockFile('test.png')
    await runPipeline(file, [step1, step2], mockContext)
  })

  it('skips step when shouldProcess returns false', async () => {
    const step: PipelineStep = {
      name: 'images-only',
      shouldProcess: (file) => file.type.startsWith('image/'),
      process: async (file) => Object.assign(file, { checksumSHA256: 'processed' }),
    }

    const textFile = new File(['text'], 'readme.txt', { type: 'text/plain' })
    const uploadTextFile = Object.assign(textFile, { id: '2', url: 'blob:test' }) as UploadFile
    const result = await runPipeline(uploadTextFile, [step], mockContext)
    expect(result.checksumSHA256).toBeUndefined()
  })

  it('emits pipeline events', async () => {
    const emitFn = vi.fn()
    const ctx = { ...mockContext, emit: emitFn }
    const step: PipelineStep = {
      name: 'test-step',
      process: async (file) => file,
    }

    const file = mockFile('test.png')
    await runPipeline(file, [step], ctx)
    expect(emitFn).toHaveBeenCalledWith('pipeline-step', expect.objectContaining({ step: 'test-step' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement pipeline engine**

```typescript
// packages/core/src/pipeline/engine.ts
import type { PipelineStep, PipelineContext } from '@upup/shared'
import type { UploadFile } from '@upup/shared'

export async function runPipeline(
  file: UploadFile,
  steps: PipelineStep[],
  context: PipelineContext,
): Promise<UploadFile> {
  let current = file
  for (const step of steps) {
    if (step.shouldProcess && !step.shouldProcess(current)) {
      continue
    }
    current = await step.process(current, context)
    context.emit('pipeline-step', { step: step.name, file: current })
  }
  return current
}
```

- [ ] **Step 4: Update pipeline barrel export**

```typescript
// packages/core/src/pipeline/index.ts
export { runPipeline } from './engine'
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd packages/core && pnpm test`
Expected: All 4 pipeline tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add pipeline engine with step sequencing and shouldProcess filtering"
```

---

### Task 2.3: Built-in pipeline steps (hash + gzip)

**Files:**
- Create: `packages/core/src/pipeline/steps/checksum-sha256.ts`
- Create: `packages/core/src/pipeline/steps/gzip-compress.ts`
- Create: `packages/core/src/pipeline/steps/deduplicate.ts`
- Create: `packages/core/tests/pipeline-steps.test.ts`
- Modify: `packages/core/src/pipeline/index.ts`

These are the worker-eligible steps (Feature #11). Implement with main-thread fallback first, then add worker support in Task 2.5.

- [ ] **Step 1: Write failing tests for checksum step**
- [ ] **Step 2: Implement checksumSHA256 pipeline step**
- [ ] **Step 3: Write failing tests for gzip step**
- [ ] **Step 4: Implement gzipCompress pipeline step**
- [ ] **Step 5: Write failing tests for deduplicate step**
- [ ] **Step 6: Implement deduplicateFiles pipeline step**
- [ ] **Step 7: Run all tests, verify pass**
- [ ] **Step 8: Commit**

---

### Task 2.4: Built-in pipeline steps (image processing)

**Files:**
- Create: `packages/core/src/pipeline/steps/heic-convert.ts`
- Create: `packages/core/src/pipeline/steps/exif-strip.ts`
- Create: `packages/core/src/pipeline/steps/image-compress.ts`
- Create: `packages/core/src/pipeline/steps/thumbnail-generate.ts`
- Modify: `packages/core/src/pipeline/index.ts`
- Reference: `packages/upup/src/frontend/lib/file.ts` (source implementations)

Move existing implementations from `file.ts` into pipeline step factories. These stay main-thread only (Canvas API dependencies).

- [ ] **Step 1: Move heic conversion logic into heicConvert step**
- [ ] **Step 2: Move EXIF stripping logic into exifStrip step**
- [ ] **Step 3: Move image compression logic into imageCompress step**
- [ ] **Step 4: Move thumbnail generation logic into thumbnailGenerate step**
- [ ] **Step 5: Update pipeline barrel to export all built-in steps**

```typescript
// packages/core/src/pipeline/index.ts
export { runPipeline } from './engine'
export { checksumSHA256 } from './steps/checksum-sha256'
export { gzipCompress } from './steps/gzip-compress'
export { deduplicateFiles } from './steps/deduplicate'
export { heicConvert } from './steps/heic-convert'
export { exifStrip } from './steps/exif-strip'
export { imageCompress } from './steps/image-compress'
export { thumbnailGenerate } from './steps/thumbnail-generate'
```

- [ ] **Step 6: Run all tests, verify pass**
- [ ] **Step 7: Commit**

---

### Task 2.5: Web Worker pool (Feature #11)

**Files:**
- Create: `packages/core/src/workers/pool.ts`
- Create: `packages/core/src/workers/worker-code.ts`
- Create: `packages/core/tests/worker-pool.test.ts`

- [ ] **Step 1: Write failing tests for WorkerPool**
- [ ] **Step 2: Implement worker code (hash + gzip functions as string)**
- [ ] **Step 3: Implement WorkerPool class with inline Blob worker and main-thread fallback**
- [ ] **Step 4: Update checksumSHA256 and gzipCompress steps to use context.worker when available**
- [ ] **Step 5: Run all tests, verify pass**
- [ ] **Step 6: Commit**

---

### Task 2.6: StorageClient (upload protocols)

**Files:**
- Create: `packages/core/src/storage/client.ts`
- Create: `packages/core/src/storage/direct-upload.ts`
- Create: `packages/core/src/storage/multipart-upload.ts`
- Create: `packages/core/src/storage/tus-upload.ts`
- Create: `packages/core/src/storage/token-endpoint-credentials.ts`
- Reference: `packages/upup/src/frontend/lib/storage/provider.ts` (source)

Move existing upload implementations from `provider.ts` into strategy implementations.

- [ ] **Step 1: Create DirectUpload strategy (single presigned PUT)**
- [ ] **Step 2: Create MultipartUpload strategy (S3 multipart flow)**
- [ ] **Step 3: Create TusUpload strategy (tus-js-client wrapper)**
- [ ] **Step 4: Create TokenEndpointCredentials strategy**
- [ ] **Step 5: Test and commit**

---

### Task 2.7: UpupCore class

**Files:**
- Create: `packages/core/src/core.ts`
- Create: `packages/core/tests/core.test.ts`
- Modify: `packages/core/src/index.ts`
- Reference: `packages/upup/src/frontend/hooks/useRootProvider.ts` (source of all logic)

This is the big extraction. Convert `useRootProvider` state management from React hooks to class properties + event emission. The file processing pipeline, upload orchestration, progress tracking, and retry logic all move here.

- [ ] **Step 1: Write failing test for UpupCore basic lifecycle**

```typescript
// packages/core/tests/core.test.ts
import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('UpupCore', () => {
  it('starts in IDLE status', () => {
    const core = new UpupCore({ uploadEndpoint: '/api/upload', provider: 'aws' })
    expect(core.status).toBe('IDLE')
    expect(core.files.size).toBe(0)
    core.destroy()
  })

  it('adds files and emits state-change', async () => {
    const core = new UpupCore({ uploadEndpoint: '/api/upload', provider: 'aws' })
    const handler = vi.fn()
    core.on('state-change', handler)

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([file])

    expect(core.files.size).toBe(1)
    expect(handler).toHaveBeenCalled()
    core.destroy()
  })

  it('removes a file by id', async () => {
    const core = new UpupCore({ uploadEndpoint: '/api/upload', provider: 'aws' })
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([file])

    const id = [...core.files.keys()][0]
    core.removeFile(id)
    expect(core.files.size).toBe(0)
    core.destroy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement UpupCore class skeleton (state, addFiles, removeFile, events)**
- [ ] **Step 4: Run tests, verify pass**
- [ ] **Step 5: Add pipeline integration (UpupCore runs pipeline on addFiles)**
- [ ] **Step 6: Add upload orchestration (upload method with concurrency, progress, retry)**
- [ ] **Step 7: Add pause/resume/cancel lifecycle methods**
- [ ] **Step 8: Add crash recovery (serializable state)**
- [ ] **Step 9: Update core barrel export**

```typescript
// packages/core/src/index.ts
export { UpupCore } from './core'
export type { CoreOptions } from './core'
export { EventEmitter } from './events'
export { WorkerPool } from './workers/pool'
```

- [ ] **Step 10: Run all core tests, verify pass**
- [ ] **Step 11: Build @upup/core, verify zero errors**

Run: `cd packages/core && pnpm build`

- [ ] **Step 12: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add UpupCore class with pipeline, upload orchestration, and Web Workers"
```

---

## Phase 3: @upup/react

### Task 3.1: useUpupUpload hook

**Files:**
- Create: `packages/react/src/hooks/useUpupUpload.ts`
- Create: `packages/react/tests/useUpupUpload.test.ts`

- [ ] **Step 1: Write failing test for useUpupUpload hook**

```typescript
// packages/react/tests/useUpupUpload.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/hooks/useUpupUpload'

describe('useUpupUpload', () => {
  it('returns initial idle state', () => {
    const { result } = renderHook(() =>
      useUpupUpload({ uploadEndpoint: '/api/upload', provider: 'aws' })
    )
    expect(result.current.status).toBe('IDLE')
    expect(result.current.files).toEqual([])
    expect(result.current.progress.percentage).toBe(0)
  })

  it('addFiles updates files state', async () => {
    const { result } = renderHook(() =>
      useUpupUpload({ uploadEndpoint: '/api/upload', provider: 'aws' })
    )
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await act(async () => {
      await result.current.addFiles([file])
    })
    expect(result.current.files.length).toBe(1)
    expect(result.current.files[0].name).toBe('test.txt')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement useUpupUpload hook**

```typescript
// packages/react/src/hooks/useUpupUpload.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { UpupCore } from '@upup/core'
import type { CoreOptions } from '@upup/core'
import type { UploadFile, UploadStatus } from '@upup/shared'
import type { UpupError } from '@upup/shared'

type UploadProgress = {
  totalFiles: number
  completedFiles: number
  totalBytes: number
  uploadedBytes: number
  percentage: number
  speed: number
  eta: number
}

export function useUpupUpload(options: CoreOptions) {
  const coreRef = useRef<UpupCore | null>(null)
  if (!coreRef.current) {
    coreRef.current = new UpupCore(options)
  }
  const core = coreRef.current

  const [files, setFiles] = useState<UploadFile[]>([])
  const [status, setStatus] = useState<UploadStatus>(core.status)
  const [progress, setProgress] = useState<UploadProgress>({
    totalFiles: 0, completedFiles: 0, totalBytes: 0,
    uploadedBytes: 0, percentage: 0, speed: 0, eta: 0,
  })
  const [error, setError] = useState<UpupError | null>(null)

  useEffect(() => {
    const unsub = core.on('state-change', () => {
      setFiles([...core.files.values()])
      setStatus(core.status)
      setProgress({ ...core.progress })
      setError(core.error)
    })
    return () => {
      unsub()
      core.destroy()
    }
  }, [core])

  return {
    files,
    status,
    progress,
    error,
    addFiles: useCallback((f: File[]) => core.addFiles(f), [core]),
    removeFile: useCallback((id: string) => core.removeFile(id), [core]),
    removeAll: useCallback(() => core.removeAll(), [core]),
    setFiles: useCallback((f: File[]) => core.setFiles(f), [core]),
    reorderFiles: useCallback((from: number, to: number) => core.reorderFiles(from, to), [core]),
    upload: useCallback(() => core.upload(), [core]),
    pause: useCallback(() => core.pause(), [core]),
    resume: useCallback(() => core.resume(), [core]),
    cancel: useCallback(() => core.cancel(), [core]),
    retry: useCallback((id?: string) => core.retry(id), [core]),
    core,
  }
}
```

- [ ] **Step 4: Run tests, verify pass**
- [ ] **Step 5: Commit**

```bash
git add packages/react/
git commit -m "feat(react): add useUpupUpload headless hook wrapping UpupCore"
```

---

### Task 3.2: Move UI components to @upup/react

**Files:**
- Move: `packages/upup/src/frontend/components/` → `packages/react/src/components/`
- Move: `packages/upup/src/frontend/hooks/` → `packages/react/src/hooks/` (UI-specific hooks only)
- Move: `packages/upup/src/frontend/context/` → `packages/react/src/context/`
- Move: `packages/upup/src/frontend/lib/tailwind.ts` → `packages/react/src/lib/tailwind.ts`
- Move: `packages/upup/src/frontend/tailwind.css` → `packages/react/src/tailwind.css`
- Move: `packages/upup/src/assets/` → `packages/react/src/assets/`

Apply component renames during move:
- `MainBox.tsx` → `DropZone.tsx`, rename component inside
- `AdapterSelector.tsx` → `SourceSelector.tsx`, rename component + update `FileSource` enum
- `AdapterView.tsx` → `SourceView.tsx`, rename component
- `Informer.tsx` → `Notifier.tsx`, rename component
- Remove `ShouldRender.tsx` — replace usages with inline conditionals
- `RootContext.ts` → `UploaderContext.ts`

- [ ] **Step 1: Copy component files with renames applied**
- [ ] **Step 2: Update all internal imports to use @upup/shared and @upup/core**
- [ ] **Step 3: Replace all `UploadAdapter` references with `FileSource`**
- [ ] **Step 4: Replace all `FileWithParams` references with `UploadFile`**
- [ ] **Step 5: Replace all `ShouldRender` usages with inline conditionals**
- [ ] **Step 6: Rename `useRootProvider` → `useUploaderEngine` (internal to @upup/react)**
- [ ] **Step 7: Refactor UpupUploader to use useUpupUpload internally**
- [ ] **Step 8: Build @upup/react, verify zero errors**
- [ ] **Step 9: Commit**

---

### Task 3.3: Update @upup/react barrel exports

**Files:**
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1: Set up exports matching current public API + new headless API**

```typescript
// packages/react/src/index.ts
import './tailwind.css'

// Headless hook (new)
export { useUpupUpload } from './hooks/useUpupUpload'

// Full UI component (preserved)
export { default as UpupUploader } from './UpupUploader'
export type { UploaderRef } from './UpupUploader'

// Re-export types consumers commonly need
export {
  FileSource,
  StorageProvider,
  UploadStatus,
  type UploadFile,
  type UploadFileWithProgress,
  type UploaderClassNames,
  type UploaderIcons,
  type ImageEditorOptions,
  type ImageCompressionOptions,
  type ThumbnailGeneratorOptions,
  type ResumableUploadOptions,
  type CrashRecoveryOptions,
  type RestrictionFailedReason,
  type Translations,
  en_US,
} from '@upup/shared'
```

- [ ] **Step 2: Build, verify**
- [ ] **Step 3: Commit**

---

## Phase 4: @upup/server

### Task 4.1: Generic request handler

**Files:**
- Create: `packages/server/src/handler.ts`
- Create: `packages/server/src/routes/presign.ts`
- Create: `packages/server/src/routes/multipart.ts`
- Create: `packages/server/src/routes/oauth.ts`
- Create: `packages/server/src/routes/files.ts`
- Modify: `packages/server/src/index.ts`
- Reference: `packages/upup/src/backend/` (existing S3/Azure utils)

- [ ] **Step 1: Create generic Request→Response handler**
- [ ] **Step 2: Move S3 presigned URL generation from packages/upup/src/backend/**
- [ ] **Step 3: Move multipart orchestration endpoints**
- [ ] **Step 4: Create OAuth proxy routes (placeholder — full implementation later)**
- [ ] **Step 5: Create file listing/transfer routes (placeholder)**
- [ ] **Step 6: Test and commit**

---

### Task 4.2: Framework adapters

**Files:**
- Create: `packages/server/src/next.ts`
- Create: `packages/server/src/express.ts`
- Create: `packages/server/src/hono.ts`
- Create: `packages/server/src/fastify.ts`

- [ ] **Step 1: Create Next.js App Router adapter**

```typescript
// packages/server/src/next.ts
import { createHandler, type UpupServerConfig } from './handler'

export function createUpupHandler(config: UpupServerConfig) {
  const handler = createHandler(config)

  return {
    GET: async (req: Request) => handler(req),
    POST: async (req: Request) => handler(req),
  }
}
```

- [ ] **Step 2: Create Express adapter**

```typescript
// packages/server/src/express.ts
import { createHandler, type UpupServerConfig } from './handler'

export function createUpupMiddleware(config: UpupServerConfig) {
  const handler = createHandler(config)

  return async (req: any, res: any) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method !== 'GET' ? req : undefined,
    })
    const response = await handler(request)
    res.status(response.status)
    response.headers.forEach((value, key) => res.setHeader(key, value))
    res.send(await response.text())
  }
}
```

- [ ] **Step 3: Create Hono adapter**

```typescript
// packages/server/src/hono.ts
import { createHandler, type UpupServerConfig } from './handler'

export function createUpupRoutes(config: UpupServerConfig) {
  const handler = createHandler(config)
  return { fetch: handler }
}
```

- [ ] **Step 4: Create Fastify adapter**

```typescript
// packages/server/src/fastify.ts
import { createHandler, type UpupServerConfig } from './handler'

export function createUpupPlugin(config: UpupServerConfig) {
  const handler = createHandler(config)

  return async (fastify: any) => {
    fastify.all('/upup/*', async (request: any, reply: any) => {
      const response = await handler(request.raw)
      reply.status(response.status).send(await response.text())
    })
  }
}
```

- [ ] **Step 5: Build @upup/server, verify zero errors**
- [ ] **Step 6: Commit**

---

## Phase 5: Integration + Cleanup

### Task 5.1: Update playground app

**Files:**
- Modify: `apps/playground/package.json`
- Modify: `apps/playground/src/` (update imports)

- [ ] **Step 1: Update playground dependencies to use @upup/react**
- [ ] **Step 2: Update all imports from 'upup-react-file-uploader' to '@upup/react'**
- [ ] **Step 3: Apply enum renames (UploadAdapter→FileSource, etc.)**
- [ ] **Step 4: Build and run playground, verify it works**
- [ ] **Step 5: Commit**

---

### Task 5.2: Update landing app

**Files:**
- Modify: `apps/landing/package.json`
- Modify: `apps/landing/src/` (update imports)

- [ ] **Step 1: Same process as playground**
- [ ] **Step 2: Commit**

---

### Task 5.3: Migrate E2E tests

**Files:**
- Move: `packages/upup/e2e/` → `packages/react/e2e/`
- Modify: Playwright config for new package location

- [ ] **Step 1: Move E2E tests**
- [ ] **Step 2: Update test config**
- [ ] **Step 3: Run E2E tests, verify pass**
- [ ] **Step 4: Commit**

---

### Task 5.4: Remove packages/upup

- [ ] **Step 1: Verify all 4 new packages build successfully**

```bash
pnpm --filter @upup/shared build
pnpm --filter @upup/core build
pnpm --filter @upup/react build
pnpm --filter @upup/server build
```

- [ ] **Step 2: Verify playground and landing apps build and run**
- [ ] **Step 3: Verify E2E tests pass**
- [ ] **Step 4: Remove packages/upup directory**
- [ ] **Step 5: Update root package.json scripts to reference new package names**
- [ ] **Step 6: Final build of entire monorepo**

```bash
pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove packages/upup, migration to @upup/* complete"
```

---

## Summary

| Phase | Tasks | Key Deliverable |
|-------|-------|-----------------|
| 1 | 1.1–1.3 | @upup/shared building with all types, enums, i18n, interfaces |
| 2 | 2.1–2.7 | @upup/core building with UpupCore, pipeline, workers, strategies |
| 3 | 3.1–3.3 | @upup/react building with useUpupUpload + all UI components |
| 4 | 4.1–4.2 | @upup/server building with handlers + framework adapters |
| 5 | 5.1–5.4 | Everything integrated, packages/upup removed, E2E passing |
