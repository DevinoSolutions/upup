# Plan 4: Server Completion & Missing Upload Strategies

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete `@upup/server` with OAuth and file-transfer routes for cloud drives (Google Drive, OneDrive, Dropbox), implement two missing `@upup/core` strategies (`ServerCredentials`, `MultipartUpload`), and wire the `apiKey` option for managed-service auto-configuration.

**Branch:** `huge-refactor`
**Build:** tsup, vitest
**No legacy migration needed.**

---

## Existing Code Summary

### @upup/server (packages/server/src/)
- **handler.ts** — `createHandler(config)` returns a Web-API `RouteHandler = (req: Request) => Promise<Response>`. Routes: `POST /presign`, `POST /multipart/init`, `POST /multipart/sign-part`, `POST /multipart/complete`, `POST /multipart/abort`. Uses `json()` helper. Auth via `config.auth`.
- **config.ts** — `UpupServerConfig` has `storage`, `providers?` (googleDrive, dropbox, oneDrive with clientId/clientSecret), `tokenStore?` (get/set/delete), `hooks?`, `auth?`, `maxFileSize?`, `allowedTypes?`.
- **providers/aws.ts** — S3 presign + multipart helpers using `@aws-sdk/client-s3`.
- **next.ts / express.ts / hono.ts / fastify.ts** — Framework adapters that wrap `createHandler`.
- **index.ts** — Barrel exports.

### @upup/shared (packages/shared/src/)
- **strategies.ts** — `CredentialStrategy` (getPresignedUrl + optional multipart methods), `OAuthStrategy` (getAuthUrl, handleCallback, listFiles, getFileMetadata), `UploadStrategy` (upload), `RuntimeAdapter`. Also exports `OAuthTokens`, `RemoteFile`, `CloudProvider`, `FileMetadata`, `UploadCredentials`, `UploadResult`, `ProgressInfo`.
- **types/upload-protocols.ts** — `PresignedUrlResponse`, `MultipartInitResponse`, `MultipartSignPartResponse`, `MultipartCompleteResponse`, `MultipartAbortResponse`, `MultipartListPartsResponse`, `MultipartPart`, `ResumableUploadOptions`.

### @upup/core (packages/core/src/)
- **core.ts** — `UpupCore` class with `CoreOptions` including `uploadEndpoint?`, `serverUrl?`, `apiKey?`. The `upload()` method currently creates `TokenEndpointCredentials` + `DirectUpload` when `uploadEndpoint` or `serverUrl` is set.
- **strategies/token-endpoint.ts** — `TokenEndpointCredentials` implements `CredentialStrategy.getPresignedUrl` by POSTing to a URL.
- **strategies/direct-upload.ts** — `DirectUpload` implements `UploadStrategy.upload` using XHR with progress.
- **upload-manager.ts** — `UploadManager` with concurrent queue, retry with exponential backoff, abort/pause support.

---

## Task Overview

| Task | What | Files | Depends On |
|------|------|-------|------------|
| 4.1 | ServerCredentials strategy | core strategy | — |
| 4.2 | MultipartUpload strategy | core strategy | — |
| 4.3 | Wire apiKey option | core.ts | 4.1 |
| 4.4 | OAuth routes (Google Drive reference) | server oauth.ts, handler.ts | — |
| 4.5 | OAuth routes (OneDrive + Dropbox) | server oauth.ts | 4.4 |
| 4.6 | File transfer routes (Google Drive reference) | server file-transfer.ts, handler.ts | 4.4 |
| 4.7 | File transfer routes (OneDrive + Dropbox) | server file-transfer.ts | 4.6 |
| 4.8 | Integration wiring + exports | server index.ts, core index.ts | All above |
| 4.9 | ServerOAuth strategy (client-side, deferred) | core strategy | 4.4 |
| 4.10 | ServerTransfer strategy (client-side, deferred) | core strategy | 4.6 |

---

## Task 4.1 — ServerCredentials Strategy

> A `CredentialStrategy` that fetches presigned URLs (and multipart endpoints) from a `serverUrl` — the full-featured cousin of `TokenEndpointCredentials`.

### 4.1.1 Write Tests

- [ ] Create `packages/core/tests/strategies/server-credentials.test.ts`

```typescript
// packages/core/tests/strategies/server-credentials.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServerCredentials } from '../../src/strategies/server-credentials'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ServerCredentials', () => {
  const baseUrl = 'https://api.example.com/upup'
  let strategy: ServerCredentials

  beforeEach(() => {
    vi.clearAllMocks()
    strategy = new ServerCredentials({ serverUrl: baseUrl })
  })

  describe('getPresignedUrl', () => {
    it('POSTs to /presign with file metadata', async () => {
      const presigned = {
        key: 'uploads/test.png',
        publicUrl: 'https://cdn.example.com/test.png',
        uploadUrl: 'https://s3.amazonaws.com/bucket/test.png?signed',
        expiresIn: 3600,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(presigned),
      })

      const result = await strategy.getPresignedUrl({
        name: 'test.png',
        size: 1024,
        type: 'image/png',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/presign`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'test.png', size: 1024, type: 'image/png' }),
        }),
      )
      expect(result).toEqual(presigned)
    })

    it('includes custom headers when provided', async () => {
      strategy = new ServerCredentials({
        serverUrl: baseUrl,
        headers: { Authorization: 'Bearer tok_123' },
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ key: 'k', publicUrl: '', uploadUrl: '', expiresIn: 0 }),
      })

      await strategy.getPresignedUrl({ name: 'f', size: 1, type: 't' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer tok_123',
          }),
        }),
      )
    })

    it('includes apiKey as x-api-key header when provided', async () => {
      strategy = new ServerCredentials({
        serverUrl: baseUrl,
        apiKey: 'key_abc',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ key: 'k', publicUrl: '', uploadUrl: '', expiresIn: 0 }),
      })

      await strategy.getPresignedUrl({ name: 'f', size: 1, type: 't' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'key_abc',
          }),
        }),
      )
    })

    it('throws UpupNetworkError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(
        strategy.getPresignedUrl({ name: 'f', size: 1, type: 't' }),
      ).rejects.toThrow('Presign request failed: 401 Unauthorized')
    })
  })

  describe('initMultipartUpload', () => {
    it('POSTs to /multipart/init with file metadata', async () => {
      const initResult = {
        key: 'uploads/big.zip',
        uploadId: 'upload-123',
        partSize: 5242880,
        expiresIn: 3600,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initResult),
      })

      const result = await strategy.initMultipartUpload({
        name: 'big.zip',
        size: 100_000_000,
        type: 'application/zip',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/multipart/init`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'big.zip', size: 100_000_000, type: 'application/zip' }),
        }),
      )
      expect(result).toEqual(initResult)
    })
  })

  describe('signPart', () => {
    it('POSTs to /multipart/sign-part', async () => {
      const signResult = { uploadUrl: 'https://s3/part?signed', expiresIn: 3600 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(signResult),
      })

      const result = await strategy.signPart({
        key: 'uploads/big.zip',
        uploadId: 'upload-123',
        partNumber: 1,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/multipart/sign-part`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            key: 'uploads/big.zip',
            uploadId: 'upload-123',
            partNumber: 1,
          }),
        }),
      )
      expect(result).toEqual(signResult)
    })
  })

  describe('completeMultipartUpload', () => {
    it('POSTs to /multipart/complete', async () => {
      const completeResult = {
        key: 'uploads/big.zip',
        publicUrl: 'https://cdn.example.com/big.zip',
        etag: '"abc123"',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(completeResult),
      })

      const parts = [{ partNumber: 1, eTag: '"aaa"' }, { partNumber: 2, eTag: '"bbb"' }]
      const result = await strategy.completeMultipartUpload({
        key: 'uploads/big.zip',
        uploadId: 'upload-123',
        parts,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/multipart/complete`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            key: 'uploads/big.zip',
            uploadId: 'upload-123',
            parts,
          }),
        }),
      )
      expect(result).toEqual(completeResult)
    })
  })

  describe('abortMultipartUpload', () => {
    it('POSTs to /multipart/abort', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })

      await strategy.abortMultipartUpload({
        key: 'uploads/big.zip',
        uploadId: 'upload-123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/multipart/abort`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            key: 'uploads/big.zip',
            uploadId: 'upload-123',
          }),
        }),
      )
    })
  })
})
```

### 4.1.2 Implement ServerCredentials

- [ ] Create `packages/core/src/strategies/server-credentials.ts`

```typescript
// packages/core/src/strategies/server-credentials.ts
import {
  UpupNetworkError,
  type CredentialStrategy,
  type FileMetadata,
  type PresignedUrlResponse,
  type MultipartInitResponse,
  type MultipartSignPartResponse,
  type MultipartCompleteResponse,
} from '@upup/shared'

export interface ServerCredentialsOptions {
  serverUrl: string
  headers?: Record<string, string>
  apiKey?: string
}

export class ServerCredentials implements CredentialStrategy {
  private serverUrl: string
  private headers: Record<string, string>

  constructor(options: ServerCredentialsOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, '')
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    if (options.apiKey) {
      this.headers['x-api-key'] = options.apiKey
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.serverUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new UpupNetworkError(
        `Presign request failed: ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    return response.json()
  }

  async getPresignedUrl(file: FileMetadata): Promise<PresignedUrlResponse> {
    return this.post<PresignedUrlResponse>('/presign', {
      name: file.name,
      size: file.size,
      type: file.type,
    })
  }

  async initMultipartUpload(file: FileMetadata): Promise<MultipartInitResponse> {
    return this.post<MultipartInitResponse>('/multipart/init', {
      name: file.name,
      size: file.size,
      type: file.type,
    })
  }

  async signPart(params: {
    key: string
    uploadId: string
    partNumber: number
  }): Promise<MultipartSignPartResponse> {
    return this.post<MultipartSignPartResponse>('/multipart/sign-part', params)
  }

  async completeMultipartUpload(params: {
    key: string
    uploadId: string
    parts: { partNumber: number; eTag: string }[]
  }): Promise<MultipartCompleteResponse> {
    return this.post<MultipartCompleteResponse>('/multipart/complete', params)
  }

  async abortMultipartUpload(params: {
    key: string
    uploadId: string
  }): Promise<void> {
    await this.post('/multipart/abort', params)
  }
}
```

### 4.1.3 Export

- [ ] Add to `packages/core/src/strategies/index.ts`:

```typescript
export { ServerCredentials } from './server-credentials'
```

### 4.1.4 Verify

- [ ] Run `pnpm --filter @upup/core test -- --run tests/strategies/server-credentials.test.ts` — all tests pass.

---

## Task 4.2 — MultipartUpload Strategy

> An `UploadStrategy` that chunks large files and uploads each part via presigned URLs obtained from a `CredentialStrategy`. Falls back to `DirectUpload` for small files.

### 4.2.1 Write Tests

- [ ] Create `packages/core/tests/strategies/multipart-upload.test.ts`

```typescript
// packages/core/tests/strategies/multipart-upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultipartUpload } from '../../src/strategies/multipart-upload'
import type {
  CredentialStrategy,
  MultipartInitResponse,
  MultipartSignPartResponse,
  MultipartCompleteResponse,
} from '@upup/shared'

describe('MultipartUpload', () => {
  const mockCredentials: CredentialStrategy = {
    getPresignedUrl: vi.fn(),
    initMultipartUpload: vi.fn(),
    signPart: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
  }

  const mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)

  let strategy: MultipartUpload

  beforeEach(() => {
    vi.clearAllMocks()
    strategy = new MultipartUpload({
      credentials: mockCredentials,
      chunkSizeBytes: 5 * 1024 * 1024, // 5 MiB
      maxConcurrentParts: 3,
    })
  })

  it('uploads a file in multiple parts', async () => {
    const fileSize = 12 * 1024 * 1024 // 12 MiB => 3 parts at 5 MiB chunk
    const file = new File([new ArrayBuffer(fileSize)], 'big.zip', {
      type: 'application/zip',
    })

    const initResponse: MultipartInitResponse = {
      key: 'uploads/big.zip',
      uploadId: 'upload-123',
      partSize: 5 * 1024 * 1024,
      expiresIn: 3600,
    }
    vi.mocked(mockCredentials.initMultipartUpload!).mockResolvedValue(initResponse)

    vi.mocked(mockCredentials.signPart!).mockImplementation(async ({ partNumber }) => ({
      uploadUrl: `https://s3/part${partNumber}?signed`,
      expiresIn: 3600,
    }))

    mockFetch.mockImplementation(async (url: string, init: RequestInit) => ({
      ok: true,
      status: 200,
      headers: new Headers({ ETag: `"etag-${url.match(/part(\d)/)?.[1]}"` }),
    }))

    const completeResponse: MultipartCompleteResponse = {
      key: 'uploads/big.zip',
      publicUrl: 'https://cdn.example.com/big.zip',
      etag: '"final-etag"',
    }
    vi.mocked(mockCredentials.completeMultipartUpload!).mockResolvedValue(completeResponse)

    const onProgress = vi.fn()
    const result = await strategy.upload(file, {} as any, {
      onProgress,
      signal: new AbortController().signal,
    })

    expect(mockCredentials.initMultipartUpload).toHaveBeenCalledWith({
      name: 'big.zip',
      size: fileSize,
      type: 'application/zip',
    })
    expect(mockCredentials.signPart).toHaveBeenCalledTimes(3)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockCredentials.completeMultipartUpload).toHaveBeenCalledWith({
      key: 'uploads/big.zip',
      uploadId: 'upload-123',
      parts: expect.arrayContaining([
        expect.objectContaining({ partNumber: 1 }),
        expect.objectContaining({ partNumber: 2 }),
        expect.objectContaining({ partNumber: 3 }),
      ]),
    })
    expect(result).toEqual({
      key: 'uploads/big.zip',
      publicUrl: 'https://cdn.example.com/big.zip',
      etag: '"final-etag"',
    })
    expect(onProgress).toHaveBeenCalled()
  })

  it('aborts multipart upload on signal abort', async () => {
    const file = new File([new ArrayBuffer(12 * 1024 * 1024)], 'big.zip', {
      type: 'application/zip',
    })
    const controller = new AbortController()

    vi.mocked(mockCredentials.initMultipartUpload!).mockResolvedValue({
      key: 'uploads/big.zip',
      uploadId: 'upload-123',
      partSize: 5 * 1024 * 1024,
      expiresIn: 3600,
    })

    vi.mocked(mockCredentials.signPart!).mockImplementation(async () => {
      controller.abort()
      return { uploadUrl: 'https://s3/part?signed', expiresIn: 3600 }
    })

    mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'))

    await expect(
      strategy.upload(file, {} as any, {
        onProgress: vi.fn(),
        signal: controller.signal,
      }),
    ).rejects.toThrow()

    expect(mockCredentials.abortMultipartUpload).toHaveBeenCalledWith({
      key: 'uploads/big.zip',
      uploadId: 'upload-123',
    })
  })

  it('throws if credentials lack multipart methods', () => {
    const bareCredentials: CredentialStrategy = {
      getPresignedUrl: vi.fn(),
    }

    expect(
      () =>
        new MultipartUpload({
          credentials: bareCredentials,
          chunkSizeBytes: 5 * 1024 * 1024,
          maxConcurrentParts: 3,
        }),
    ).toThrow('CredentialStrategy must implement multipart methods')
  })
})
```

### 4.2.2 Implement MultipartUpload

- [ ] Create `packages/core/src/strategies/multipart-upload.ts`

```typescript
// packages/core/src/strategies/multipart-upload.ts
import {
  UpupNetworkError,
  type UploadStrategy,
  type UploadCredentials,
  type UploadResult,
  type CredentialStrategy,
  type MultipartPart,
} from '@upup/shared'

export interface MultipartUploadOptions {
  credentials: CredentialStrategy
  chunkSizeBytes?: number
  maxConcurrentParts?: number
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5 MiB
const DEFAULT_MAX_CONCURRENT = 3

export class MultipartUpload implements UploadStrategy {
  private credentials: CredentialStrategy
  private chunkSizeBytes: number
  private maxConcurrentParts: number

  constructor(options: MultipartUploadOptions) {
    if (
      !options.credentials.initMultipartUpload ||
      !options.credentials.signPart ||
      !options.credentials.completeMultipartUpload
    ) {
      throw new Error(
        'CredentialStrategy must implement multipart methods (initMultipartUpload, signPart, completeMultipartUpload)',
      )
    }
    this.credentials = options.credentials
    this.chunkSizeBytes = options.chunkSizeBytes ?? DEFAULT_CHUNK_SIZE
    this.maxConcurrentParts = options.maxConcurrentParts ?? DEFAULT_MAX_CONCURRENT
  }

  async upload(
    file: File | Blob,
    _credentials: UploadCredentials,
    options: {
      onProgress: (loaded: number, total: number) => void
      signal: AbortSignal
    },
  ): Promise<UploadResult> {
    const fileSize = file.size
    const fileName = file instanceof File ? file.name : 'blob'
    const fileType = file.type || 'application/octet-stream'

    // 1. Initiate multipart upload
    const init = await this.credentials.initMultipartUpload!({
      name: fileName,
      size: fileSize,
      type: fileType,
    })

    const partSize = init.partSize || this.chunkSizeBytes
    const totalParts = Math.ceil(fileSize / partSize)
    const completedParts: MultipartPart[] = []
    let totalUploaded = 0

    try {
      // 2. Upload parts with concurrency control
      const partQueue = Array.from({ length: totalParts }, (_, i) => i + 1)
      const activeParts: Promise<void>[] = []

      const uploadPart = async (partNumber: number): Promise<void> => {
        if (options.signal.aborted) {
          throw new UpupNetworkError('Upload aborted')
        }

        const start = (partNumber - 1) * partSize
        const end = Math.min(start + partSize, fileSize)
        const chunk = file.slice(start, end)

        // Sign the part
        const signed = await this.credentials.signPart!({
          key: init.key,
          uploadId: init.uploadId,
          partNumber,
        })

        if (options.signal.aborted) {
          throw new UpupNetworkError('Upload aborted')
        }

        // Upload the chunk
        const response = await fetch(signed.uploadUrl, {
          method: 'PUT',
          body: chunk,
          signal: options.signal,
        })

        if (!response.ok) {
          throw new UpupNetworkError(
            `Part ${partNumber} upload failed: ${response.status}`,
            response.status,
          )
        }

        const eTag = response.headers.get('ETag') ?? `"part-${partNumber}"`
        completedParts.push({ partNumber, eTag })

        totalUploaded += end - start
        options.onProgress(totalUploaded, fileSize)
      }

      // Process parts with concurrency limit
      for (const partNumber of partQueue) {
        if (options.signal.aborted) break

        const partPromise = uploadPart(partNumber).then(() => {
          const idx = activeParts.indexOf(partPromise)
          if (idx !== -1) activeParts.splice(idx, 1)
        })
        activeParts.push(partPromise)

        if (activeParts.length >= this.maxConcurrentParts) {
          await Promise.race(activeParts)
        }
      }

      // Wait for remaining parts
      await Promise.all(activeParts)

      // 3. Complete multipart upload
      completedParts.sort((a, b) => a.partNumber - b.partNumber)

      const result = await this.credentials.completeMultipartUpload!({
        key: init.key,
        uploadId: init.uploadId,
        parts: completedParts,
      })

      return {
        key: result.key,
        publicUrl: result.publicUrl,
        etag: result.etag,
      }
    } catch (error) {
      // Abort on failure
      if (this.credentials.abortMultipartUpload) {
        await this.credentials
          .abortMultipartUpload({ key: init.key, uploadId: init.uploadId })
          .catch(() => {}) // Best-effort abort
      }
      throw error
    }
  }
}
```

### 4.2.3 Export

- [ ] Add to `packages/core/src/strategies/index.ts`:

```typescript
export { MultipartUpload } from './multipart-upload'
```

### 4.2.4 Verify

- [ ] Run `pnpm --filter @upup/core test -- --run tests/strategies/multipart-upload.test.ts` — all tests pass.

---

## Task 4.3 — Wire apiKey Option in Core

**Note:** The `apiKey` field already exists in `CoreOptions` (packages/core/src/core.ts). This task only needs to wire the logic — no need to add the field to the interface.

> When `apiKey` is set on `CoreOptions`, auto-configure `serverUrl` to point to the managed service endpoint and use `ServerCredentials`. When `serverUrl` is set, use `ServerCredentials` with full multipart support. Auto-select `MultipartUpload` strategy for large files.

### 4.3.1 Write Tests

- [ ] Create `packages/core/tests/core-api-key.test.ts`

```typescript
// packages/core/tests/core-api-key.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpupCore } from '../src/core'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('UpupCore apiKey wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets serverUrl to managed endpoint when apiKey is provided', () => {
    const core = new UpupCore({ apiKey: 'key_abc123' })
    expect(core.options.serverUrl).toBe('https://api.upup.dev/v1')
  })

  it('does not override explicit serverUrl when apiKey is also provided', () => {
    const core = new UpupCore({
      apiKey: 'key_abc123',
      serverUrl: 'https://custom.example.com/upload',
    })
    expect(core.options.serverUrl).toBe('https://custom.example.com/upload')
  })

  it('upload() uses ServerCredentials with apiKey header when apiKey is set', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          key: 'test.png',
          publicUrl: 'https://cdn/test.png',
          uploadUrl: 'https://s3/test.png?signed',
          expiresIn: 3600,
        }),
    })

    const core = new UpupCore({ apiKey: 'key_abc123' })
    const file = new File(['data'], 'test.png', { type: 'image/png' })
    await core.addFiles([file])

    // Trigger upload - it should use ServerCredentials
    // We verify the fetch was called with the managed URL + api key header
    await core.upload()

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.upup.dev/v1/presign',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'key_abc123',
        }),
      }),
    )
  })
})
```

### 4.3.2 Modify core.ts

- [ ] Edit `packages/core/src/core.ts` — update constructor and `upload()` method:

**In the constructor, after options assignment:**

```typescript
// Auto-configure serverUrl for managed service when apiKey is provided
if (options.apiKey && !options.serverUrl) {
  this.options = { ...this.options, serverUrl: 'https://api.upup.dev/v1' }
}
```

**In the `upload()` method, replace the credentials/strategy creation block (lines ~194-197):**

Replace:
```typescript
if (this.options.uploadEndpoint || this.options.serverUrl) {
  const credentialUrl = this.options.uploadEndpoint ?? `${this.options.serverUrl}/presign`
  const credentials = new TokenEndpointCredentials({ url: credentialUrl })
  const uploadStrategy = new DirectUpload()
```

With:
```typescript
if (this.options.uploadEndpoint || this.options.serverUrl) {
  const credentials = this.options.serverUrl
    ? new ServerCredentials({
        serverUrl: this.options.serverUrl,
        apiKey: this.options.apiKey,
      })
    : new TokenEndpointCredentials({
        url: this.options.uploadEndpoint!,
      })

  // Use multipart strategy for large files (>100MB) when server supports it
  const MULTIPART_THRESHOLD = 100 * 1024 * 1024
  const hasLargeFiles = [...this.files.values()].some(f => f.size > MULTIPART_THRESHOLD)
  const canMultipart = 'initMultipartUpload' in credentials && !!credentials.initMultipartUpload

  const uploadStrategy =
    hasLargeFiles && canMultipart
      ? new MultipartUpload({ credentials })
      : new DirectUpload()
```

**Add imports at top of core.ts:**

```typescript
import { ServerCredentials } from './strategies/server-credentials'
import { MultipartUpload } from './strategies/multipart-upload'
```

### 4.3.3 Verify

- [ ] Run `pnpm --filter @upup/core test -- --run tests/core-api-key.test.ts` — all tests pass.
- [ ] Run `pnpm --filter @upup/core test` — all existing tests still pass.

---

## Task 4.4 — OAuth Routes (Google Drive Reference)

> Add OAuth start + callback routes to `@upup/server`. Google Drive is the reference implementation; OneDrive and Dropbox follow the same pattern in Task 4.5.

### 4.4.1 Write Tests

- [ ] Create `packages/server/tests/oauth.test.ts`

```typescript
// packages/server/tests/oauth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOAuthHandler, type OAuthProviderAdapter } from '../src/oauth'
import type { UpupServerConfig, TokenStore } from '../src/config'

describe('OAuth Handler', () => {
  const mockTokenStore: TokenStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }

  const baseConfig: UpupServerConfig = {
    storage: { type: 'aws', bucket: 'test', region: 'us-east-1' },
    providers: {
      googleDrive: { clientId: 'goog-id', clientSecret: 'goog-secret' },
    },
    tokenStore: mockTokenStore,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /auth/google_drive', () => {
    it('redirects to Google OAuth consent URL', async () => {
      const handler = createOAuthHandler(baseConfig)
      const req = new Request('https://api.example.com/auth/google_drive')
      const res = await handler(req, 'google_drive', 'start')

      expect(res.status).toBe(302)
      const location = res.headers.get('Location')!
      expect(location).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(location).toContain('client_id=goog-id')
      expect(location).toContain('scope=')
    })

    it('returns 400 for unconfigured provider', async () => {
      const handler = createOAuthHandler({
        ...baseConfig,
        providers: {},
      })
      const req = new Request('https://api.example.com/auth/google_drive')
      const res = await handler(req, 'google_drive', 'start')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('not configured')
    })
  })

  describe('GET /auth/google_drive/cb', () => {
    it('exchanges code for tokens and stores them', async () => {
      // Mock the global fetch for token exchange
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'access-tok',
            refresh_token: 'refresh-tok',
            expires_in: 3600,
          }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const handler = createOAuthHandler(baseConfig)
      const req = new Request(
        'https://api.example.com/auth/google_drive/cb?code=auth-code-123&state=sess_abc',
      )
      const res = await handler(req, 'google_drive', 'callback')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        }),
      )
      expect(mockTokenStore.set).toHaveBeenCalledWith(
        expect.stringContaining('sess_abc'),
        expect.stringContaining('access-tok'),
        expect.any(Number),
      )
      expect(res.status).toBe(200)

      vi.unstubAllGlobals()
    })

    it('returns 400 when code is missing', async () => {
      const handler = createOAuthHandler(baseConfig)
      const req = new Request('https://api.example.com/auth/google_drive/cb')
      const res = await handler(req, 'google_drive', 'callback')

      expect(res.status).toBe(400)
    })
  })

  describe('unknown provider', () => {
    it('returns 400 for invalid provider name', async () => {
      const handler = createOAuthHandler(baseConfig)
      const req = new Request('https://api.example.com/auth/invalid')
      const res = await handler(req, 'invalid' as any, 'start')

      expect(res.status).toBe(400)
    })
  })
})
```

### 4.4.2 Implement OAuth Handler

- [ ] Create `packages/server/src/oauth.ts`

```typescript
// packages/server/src/oauth.ts
import type { UpupServerConfig } from './config'
import type { CloudProvider, OAuthTokens } from '@upup/shared'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function redirect(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  })
}

// --- Provider-specific adapters ---

export interface OAuthProviderAdapter {
  buildAuthUrl(clientId: string, redirectUri: string, state: string): string
  exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<OAuthTokens>
}

const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

const googleDriveAdapter: OAuthProviderAdapter = {
  buildAuthUrl(clientId, redirectUri, state) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_DRIVE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  },

  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Google token exchange failed: ${err}`)
    }

    const data = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  },
}

const oneDriveAdapter: OAuthProviderAdapter = {
  buildAuthUrl(clientId, redirectUri, state) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'Files.Read.All offline_access',
      state,
    })
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  },

  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      },
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OneDrive token exchange failed: ${err}`)
    }

    const data = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  },
}

const dropboxAdapter: OAuthProviderAdapter = {
  buildAuthUrl(clientId, redirectUri, state) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      token_access_type: 'offline',
      state,
    })
    return `https://www.dropbox.com/oauth2/authorize?${params}`
  },

  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Dropbox token exchange failed: ${err}`)
    }

    const data = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  },
}

const PROVIDER_ADAPTERS: Record<string, OAuthProviderAdapter> = {
  google_drive: googleDriveAdapter,
  onedrive: oneDriveAdapter,
  dropbox: dropboxAdapter,
}

const PROVIDER_CONFIG_MAP: Record<string, keyof NonNullable<UpupServerConfig['providers']>> = {
  google_drive: 'googleDrive',
  onedrive: 'oneDrive',
  dropbox: 'dropbox',
}

// --- Main handler ---

export type OAuthAction = 'start' | 'callback'

export function createOAuthHandler(
  config: UpupServerConfig,
): (req: Request, provider: CloudProvider | string, action: OAuthAction) => Promise<Response> {
  return async (req, provider, action) => {
    const adapter = PROVIDER_ADAPTERS[provider]
    if (!adapter) {
      return json({ error: `Unknown provider: ${provider}` }, 400)
    }

    const configKey = PROVIDER_CONFIG_MAP[provider]
    const providerConfig = configKey ? config.providers?.[configKey] : undefined
    if (!providerConfig) {
      return json({ error: `Provider ${provider} not configured` }, 400)
    }

    // Extract clientId/clientSecret from the provider config
    const clientId = 'clientId' in providerConfig ? providerConfig.clientId : (providerConfig as any).appKey
    const clientSecret =
      'clientSecret' in providerConfig ? providerConfig.clientSecret : (providerConfig as any).appSecret

    // Build redirect URI from the request URL
    const url = new URL(req.url)
    const basePath = url.pathname.replace(/\/cb$/, '').replace(/\/$/, '')
    const redirectUri = `${url.origin}${basePath}/cb`

    if (action === 'start') {
      // Generate a state token for CSRF protection
      const state = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
      if (config.tokenStore) {
        await config.tokenStore.set(`oauth_state:${state}`, state, 600) // 10 min TTL
      }
      const authUrl = adapter.buildAuthUrl(clientId, redirectUri, state)
      return redirect(authUrl)
    }

    if (action === 'callback') {
      // --- TokenStore Wiring Flow ---
      // The OAuth callback completes this sequence:
      //   1. Provider redirects to /auth/:provider/cb?code=AUTH_CODE&state=SESSION_ID
      //   2. Extract `code` and `state` from query params
      //   3. Exchange `code` for tokens via provider's token endpoint
      //   4. Store tokens via tokenStore.set(sessionId, serializedTokens, ttl)
      //   5. Return success response (tokens available for subsequent API calls)
      //
      // The `state` parameter serves dual purpose:
      //   - CSRF protection (validated against stored state from /auth/:provider start)
      //   - Session identifier for token storage (used by file-transfer routes to retrieve tokens)

      const code = url.searchParams.get('code')
      if (!code) {
        return json({ error: 'Missing authorization code' }, 400)
      }

      const state = url.searchParams.get('state')

      // Validate CSRF state token if tokenStore is configured
      if (config.tokenStore && state) {
        const storedState = await config.tokenStore.get(`oauth_state:${state}`)
        if (!storedState) {
          return json({ error: 'Invalid or expired OAuth state' }, 400)
        }
        // Clean up the used state token
        await config.tokenStore.delete(`oauth_state:${state}`)
      }

      try {
        // Step 3: Exchange authorization code for OAuth tokens
        const tokens = await adapter.exchangeCode(code, clientId, clientSecret, redirectUri)

        // Step 4: Store tokens via TokenStore interface from config
        // Key format: oauth_tokens:{provider}:{sessionId}
        // This allows file-transfer routes to retrieve tokens later via:
        //   const stored = await config.tokenStore.get(`oauth_tokens:${provider}:${session}`)
        //   const tokens = JSON.parse(stored) as OAuthTokens
        if (config.tokenStore && state) {
          const ttl = tokens.expiresAt
            ? Math.floor((tokens.expiresAt - Date.now()) / 1000)
            : 3600
          await config.tokenStore.set(
            `oauth_tokens:${provider}:${state}`,
            JSON.stringify(tokens),
            ttl,
          )
        }

        // Step 5: Return success — client can now use `state` as session ID
        // for file listing and transfer operations
        return json({
          ok: true,
          accessToken: tokens.accessToken,
          expiresAt: tokens.expiresAt,
          session: state, // Echo back so client knows the session ID for file operations
        })
      } catch (error) {
        return json({ error: (error as Error).message }, 500)
      }
    }

    return json({ error: 'Invalid action' }, 400)
  }
}
```

### 4.4.3 Wire into handler.ts

- [ ] Edit `packages/server/src/handler.ts` — add OAuth route matching after the existing multipart routes:

Add import at top:
```typescript
import { createOAuthHandler, type OAuthAction } from './oauth'
```

Add routes before the 404 return (inside `createHandler`):
```typescript
    // OAuth routes
    const oauthStartMatch = path.match(/\/auth\/([^/]+)$/)
    if (req.method === 'GET' && oauthStartMatch) {
      const oauthHandler = createOAuthHandler(config)
      return oauthHandler(req, oauthStartMatch[1], 'start')
    }

    const oauthCallbackMatch = path.match(/\/auth\/([^/]+)\/cb$/)
    if (req.method === 'GET' && oauthCallbackMatch) {
      const oauthHandler = createOAuthHandler(config)
      return oauthHandler(req, oauthCallbackMatch[1], 'callback')
    }
```

### 4.4.4 Verify

- [ ] Run `pnpm --filter @upup/server test -- --run tests/oauth.test.ts` — all tests pass.

---

## Task 4.5 — OAuth Routes (OneDrive + Dropbox)

> OneDrive and Dropbox adapters are already implemented in Task 4.4's `oauth.ts` via the adapter pattern. This task verifies they work correctly.

### 4.5.1 Write Tests

- [ ] Add to `packages/server/tests/oauth.test.ts` — additional describe blocks:

```typescript
describe('OneDrive OAuth', () => {
  const config: UpupServerConfig = {
    storage: { type: 'aws', bucket: 'test', region: 'us-east-1' },
    providers: {
      oneDrive: { clientId: 'ms-id', clientSecret: 'ms-secret' },
    },
    tokenStore: mockTokenStore,
  }

  it('redirects to Microsoft OAuth URL', async () => {
    const handler = createOAuthHandler(config)
    const req = new Request('https://api.example.com/auth/onedrive')
    const res = await handler(req, 'onedrive', 'start')

    expect(res.status).toBe(302)
    const location = res.headers.get('Location')!
    expect(location).toContain('login.microsoftonline.com')
    expect(location).toContain('client_id=ms-id')
  })
})

describe('Dropbox OAuth', () => {
  const config: UpupServerConfig = {
    storage: { type: 'aws', bucket: 'test', region: 'us-east-1' },
    providers: {
      dropbox: { appKey: 'dbx-key', appSecret: 'dbx-secret' },
    },
    tokenStore: mockTokenStore,
  }

  it('redirects to Dropbox OAuth URL', async () => {
    const handler = createOAuthHandler(config)
    const req = new Request('https://api.example.com/auth/dropbox')
    const res = await handler(req, 'dropbox', 'start')

    expect(res.status).toBe(302)
    const location = res.headers.get('Location')!
    expect(location).toContain('dropbox.com/oauth2/authorize')
    expect(location).toContain('client_id=dbx-key')
  })
})
```

### 4.5.2 Verify

- [ ] Run `pnpm --filter @upup/server test -- --run tests/oauth.test.ts` — all provider tests pass.

---

## Task 4.6 — File Transfer Routes (Google Drive Reference)

> Stream files from Google Drive to S3 via the server. The client sends a POST with the cloud file ID, and the server streams the file from the cloud provider directly into S3 without buffering the whole file in memory.

### 4.6.1 Write Tests

- [ ] Create `packages/server/tests/file-transfer.test.ts`

```typescript
// packages/server/tests/file-transfer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFileTransferHandler } from '../src/file-transfer'
import type { UpupServerConfig, TokenStore } from '../src/config'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('File Transfer Handler', () => {
  const mockTokenStore: TokenStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }

  const baseConfig: UpupServerConfig = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    providers: {
      googleDrive: { clientId: 'goog-id', clientSecret: 'goog-secret' },
    },
    tokenStore: mockTokenStore,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /files/google_drive (list files)', () => {
    it('returns file list from Google Drive API', async () => {
      vi.mocked(mockTokenStore.get).mockResolvedValueOnce(
        JSON.stringify({ accessToken: 'access-tok' }),
      )

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: 'file-1',
                name: 'photo.jpg',
                mimeType: 'image/jpeg',
                size: '1024',
                modifiedTime: '2026-01-01T00:00:00Z',
              },
              {
                id: 'folder-1',
                name: 'My Folder',
                mimeType: 'application/vnd.google-apps.folder',
                modifiedTime: '2026-01-01T00:00:00Z',
              },
            ],
          }),
      })

      const handler = createFileTransferHandler(baseConfig)
      const req = new Request(
        'https://api.example.com/files/google_drive?path=root&session=sess_abc',
      )
      const res = await handler(req, 'google_drive', 'list')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.files).toHaveLength(2)
      expect(body.files[0]).toMatchObject({
        id: 'file-1',
        name: 'photo.jpg',
        isFolder: false,
      })
      expect(body.files[1]).toMatchObject({
        id: 'folder-1',
        name: 'My Folder',
        isFolder: true,
      })
    })

    it('returns 401 when no token found', async () => {
      vi.mocked(mockTokenStore.get).mockResolvedValueOnce(null)

      const handler = createFileTransferHandler(baseConfig)
      const req = new Request(
        'https://api.example.com/files/google_drive?session=sess_missing',
      )
      const res = await handler(req, 'google_drive', 'list')

      expect(res.status).toBe(401)
    })
  })

  describe('POST /files/google_drive/transfer', () => {
    it('streams file from Google Drive to S3 via presigned URL', async () => {
      vi.mocked(mockTokenStore.get).mockResolvedValueOnce(
        JSON.stringify({ accessToken: 'access-tok' }),
      )

      // Mock Google Drive file metadata fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'file-1',
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: '1024',
          }),
      })

      // Mock Google Drive file download (streaming)
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]))
          controller.close()
        },
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
        headers: new Headers({ 'Content-Length': '4' }),
      })

      // Mock S3 presigned upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const handler = createFileTransferHandler(baseConfig)
      const req = new Request(
        'https://api.example.com/files/google_drive/transfer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: 'file-1',
            session: 'sess_abc',
            uploadUrl: 'https://s3.amazonaws.com/bucket/photo.jpg?signed',
            key: 'uploads/photo.jpg',
          }),
        },
      )
      const res = await handler(req, 'google_drive', 'transfer')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.key).toBe('uploads/photo.jpg')

      // Verify Google Drive API was called with Bearer token
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com/drive/v3/files/file-1'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access-tok',
          }),
        }),
      )
    })

    it('returns 401 when no token found', async () => {
      vi.mocked(mockTokenStore.get).mockResolvedValueOnce(null)

      const handler = createFileTransferHandler(baseConfig)
      const req = new Request(
        'https://api.example.com/files/google_drive/transfer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: 'file-1', session: 'sess_missing' }),
        },
      )
      const res = await handler(req, 'google_drive', 'transfer')

      expect(res.status).toBe(401)
    })
  })
})
```

### 4.6.2 Implement File Transfer Handler

- [ ] Create `packages/server/src/file-transfer.ts`

```typescript
// packages/server/src/file-transfer.ts
import type { UpupServerConfig } from './config'
import type { CloudProvider, OAuthTokens, RemoteFile } from '@upup/shared'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// --- Provider-specific file adapters ---

export interface FileProviderAdapter {
  listFiles(accessToken: string, path: string): Promise<RemoteFile[]>
  getFileMetadata(accessToken: string, fileId: string): Promise<RemoteFile>
  getFileStream(
    accessToken: string,
    fileId: string,
  ): Promise<{ body: ReadableStream; contentLength: number; mimeType: string }>
}

const googleDriveFileAdapter: FileProviderAdapter = {
  async listFiles(accessToken, path) {
    const folderId = path === 'root' || !path ? 'root' : path
    const query = `'${folderId}' in parents and trashed = false`
    const fields = 'files(id,name,mimeType,size,modifiedTime,thumbnailLink)'
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=folder,name`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Google Drive list failed: ${response.status}`)
    }

    const data = (await response.json()) as {
      files: Array<{
        id: string
        name: string
        mimeType: string
        size?: string
        modifiedTime?: string
        thumbnailLink?: string
      }>
    }

    return data.files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size, 10) : 0,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      thumbnailUrl: f.thumbnailLink,
      modifiedAt: f.modifiedTime,
    }))
  },

  async getFileMetadata(accessToken, fileId) {
    const fields = 'id,name,mimeType,size,modifiedTime'
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Google Drive metadata fetch failed: ${response.status}`)
    }

    const f = (await response.json()) as {
      id: string
      name: string
      mimeType: string
      size?: string
      modifiedTime?: string
    }

    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size, 10) : 0,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      modifiedAt: f.modifiedTime,
    }
  },

  async getFileStream(accessToken, fileId) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Google Drive download failed: ${response.status}`)
    }

    const contentLength = parseInt(response.headers.get('Content-Length') ?? '0', 10)
    const mimeType = response.headers.get('Content-Type') ?? 'application/octet-stream'

    return {
      body: response.body!,
      contentLength,
      mimeType,
    }
  },
}

const oneDriveFileAdapter: FileProviderAdapter = {
  async listFiles(accessToken, path) {
    const endpoint =
      path === 'root' || !path
        ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
        : `https://graph.microsoft.com/v1.0/me/drive/items/${path}/children`

    const response = await fetch(
      `${endpoint}?$select=id,name,size,file,folder,lastModifiedDateTime,thumbnails`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      throw new Error(`OneDrive list failed: ${response.status}`)
    }

    const data = (await response.json()) as {
      value: Array<{
        id: string
        name: string
        size: number
        file?: { mimeType: string }
        folder?: object
        lastModifiedDateTime?: string
      }>
    }

    return data.value.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.file?.mimeType ?? 'application/octet-stream',
      size: f.size,
      isFolder: !!f.folder,
      modifiedAt: f.lastModifiedDateTime,
    }))
  },

  async getFileMetadata(accessToken, fileId) {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      throw new Error(`OneDrive metadata fetch failed: ${response.status}`)
    }

    const f = (await response.json()) as {
      id: string
      name: string
      size: number
      file?: { mimeType: string }
      folder?: object
      lastModifiedDateTime?: string
    }

    return {
      id: f.id,
      name: f.name,
      mimeType: f.file?.mimeType ?? 'application/octet-stream',
      size: f.size,
      isFolder: !!f.folder,
      modifiedAt: f.lastModifiedDateTime,
    }
  },

  async getFileStream(accessToken, fileId) {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      throw new Error(`OneDrive download failed: ${response.status}`)
    }

    return {
      body: response.body!,
      contentLength: parseInt(response.headers.get('Content-Length') ?? '0', 10),
      mimeType: response.headers.get('Content-Type') ?? 'application/octet-stream',
    }
  },
}

const dropboxFileAdapter: FileProviderAdapter = {
  async listFiles(accessToken, path) {
    const folderPath = path === 'root' || !path ? '' : path

    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: folderPath,
        include_media_info: false,
        include_deleted: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Dropbox list failed: ${response.status}`)
    }

    const data = (await response.json()) as {
      entries: Array<{
        '.tag': 'file' | 'folder'
        id: string
        name: string
        size?: number
        server_modified?: string
      }>
    }

    return data.entries.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: 'application/octet-stream', // Dropbox doesn't return mime types in list
      size: f.size ?? 0,
      isFolder: f['.tag'] === 'folder',
      modifiedAt: f.server_modified,
    }))
  },

  async getFileMetadata(accessToken, fileId) {
    const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: fileId }),
    })

    if (!response.ok) {
      throw new Error(`Dropbox metadata fetch failed: ${response.status}`)
    }

    const f = (await response.json()) as {
      '.tag': 'file' | 'folder'
      id: string
      name: string
      size?: number
      server_modified?: string
    }

    return {
      id: f.id,
      name: f.name,
      mimeType: 'application/octet-stream',
      size: f.size ?? 0,
      isFolder: f['.tag'] === 'folder',
      modifiedAt: f.server_modified,
    }
  },

  async getFileStream(accessToken, fileId) {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: fileId }),
      },
    })

    if (!response.ok) {
      throw new Error(`Dropbox download failed: ${response.status}`)
    }

    return {
      body: response.body!,
      contentLength: parseInt(response.headers.get('Content-Length') ?? '0', 10),
      mimeType:
        response.headers.get('Content-Type') ?? 'application/octet-stream',
    }
  },
}

const FILE_ADAPTERS: Record<string, FileProviderAdapter> = {
  google_drive: googleDriveFileAdapter,
  onedrive: oneDriveFileAdapter,
  dropbox: dropboxFileAdapter,
}

// --- Token retrieval helper ---

async function getAccessToken(
  config: UpupServerConfig,
  provider: string,
  session: string,
): Promise<string | null> {
  if (!config.tokenStore) return null
  const stored = await config.tokenStore.get(`oauth_tokens:${provider}:${session}`)
  if (!stored) return null

  try {
    const tokens = JSON.parse(stored) as OAuthTokens
    return tokens.accessToken
  } catch {
    return null
  }
}

// --- Main handler ---

export type FileTransferAction = 'list' | 'transfer'

export function createFileTransferHandler(
  config: UpupServerConfig,
): (
  req: Request,
  provider: CloudProvider | string,
  action: FileTransferAction,
) => Promise<Response> {
  return async (req, provider, action) => {
    const adapter = FILE_ADAPTERS[provider]
    if (!adapter) {
      return json({ error: `Unknown provider: ${provider}` }, 400)
    }

    const url = new URL(req.url)

    if (action === 'list') {
      const session = url.searchParams.get('session') ?? ''
      const path = url.searchParams.get('path') ?? 'root'

      const accessToken = await getAccessToken(config, provider, session)
      if (!accessToken) {
        return json({ error: 'Not authenticated. Complete OAuth flow first.' }, 401)
      }

      try {
        const files = await adapter.listFiles(accessToken, path)
        return json({ files })
      } catch (error) {
        return json({ error: (error as Error).message }, 500)
      }
    }

    if (action === 'transfer') {
      const body = (await req.json()) as {
        fileId: string
        session: string
        uploadUrl: string
        key: string
      }

      const accessToken = await getAccessToken(config, provider, body.session)
      if (!accessToken) {
        return json({ error: 'Not authenticated. Complete OAuth flow first.' }, 401)
      }

      try {
        // 1. Get file metadata
        const metadata = await adapter.getFileMetadata(accessToken, body.fileId)

        // 2. Stream file from cloud provider
        const { body: fileStream, contentLength, mimeType } = await adapter.getFileStream(
          accessToken,
          body.fileId,
        )

        // 3. Pipe stream to S3 via presigned URL
        const uploadResponse = await fetch(body.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
            ...(contentLength > 0 ? { 'Content-Length': String(contentLength) } : {}),
          },
          body: fileStream,
          // @ts-expect-error -- duplex required for streaming uploads in Node 18+
          duplex: 'half',
        })

        if (!uploadResponse.ok) {
          throw new Error(`S3 upload failed: ${uploadResponse.status}`)
        }

        // 4. Notify hooks
        if (config.hooks?.onFileUploaded) {
          await config.hooks.onFileUploaded(
            {
              key: body.key,
              name: metadata.name,
              size: metadata.size,
              type: mimeType,
              url: body.uploadUrl.split('?')[0], // Strip query params for clean URL
            },
            req,
          )
        }

        return json({
          key: body.key,
          name: metadata.name,
          size: metadata.size,
          type: mimeType,
        })
      } catch (error) {
        return json({ error: (error as Error).message }, 500)
      }
    }

    return json({ error: 'Invalid action' }, 400)
  }
}
```

### 4.6.3 Wire into handler.ts

- [ ] Edit `packages/server/src/handler.ts` — add file transfer route matching after OAuth routes:

Add import at top:
```typescript
import { createFileTransferHandler, type FileTransferAction } from './file-transfer'
```

Add routes before the 404 return:
```typescript
    // File transfer routes
    const fileListMatch = path.match(/\/files\/([^/]+)$/)
    if (req.method === 'GET' && fileListMatch) {
      const transferHandler = createFileTransferHandler(config)
      return transferHandler(req, fileListMatch[1], 'list')
    }

    const fileTransferMatch = path.match(/\/files\/([^/]+)\/transfer$/)
    if (req.method === 'POST' && fileTransferMatch) {
      const transferHandler = createFileTransferHandler(config)
      return transferHandler(req, fileTransferMatch[1], 'transfer')
    }
```

### 4.6.4 Verify

- [ ] Run `pnpm --filter @upup/server test -- --run tests/file-transfer.test.ts` — all tests pass.

### 4.6.5 Cloud Drive Adapter Implementation Details

> The adapter pattern in `file-transfer.ts` abstracts provider-specific API calls behind `FileProviderAdapter`. Here are the key implementation details for each provider.

#### Google Drive — API Details

**List files:** `GET https://www.googleapis.com/drive/v3/files` with query `'<folderId>' in parents and trashed = false`. Uses `fields` parameter to limit response fields. Returns `files[]` array with `id`, `name`, `mimeType`, `size` (string), `modifiedTime`, `thumbnailLink`.

**Download file and pipe to S3:** `GET https://www.googleapis.com/drive/v3/files/<fileId>?alt=media` returns the raw file bytes as a `ReadableStream`. The stream is piped directly to S3 without buffering in memory.

Two approaches for the S3 upload leg:

1. **Presigned URL (used in Task 4.6.2):** The client provides a presigned PUT URL. The server streams the Google Drive response body directly into a `fetch(uploadUrl, { method: 'PUT', body: fileStream })`. Simple, no SDK needed on the server.

2. **Direct S3 PutObject via SDK (alternative for server-initiated transfers):**

```typescript
// Alternative: Direct S3 SDK streaming (no presigned URL needed)
// Use this when the server initiates the transfer without client involvement
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

async function streamToS3Direct(
  config: UpupServerConfig,
  fileStream: ReadableStream,
  key: string,
  mimeType: string,
  contentLength: number,
): Promise<{ key: string; etag?: string }> {
  const s3 = new S3Client({
    region: config.storage.region,
    credentials: config.storage.credentials,
  })

  // For files with known size under 5GB, use PutObject directly
  if (contentLength > 0 && contentLength < 5 * 1024 * 1024 * 1024) {
    const result = await s3.send(
      new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
        Body: fileStream,
        ContentType: mimeType,
        ContentLength: contentLength,
      }),
    )
    return { key, etag: result.ETag }
  }

  // For large or unknown-size files, use multipart Upload from @aws-sdk/lib-storage
  // This automatically chunks the stream and uploads parts concurrently
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: config.storage.bucket,
      Key: key,
      Body: fileStream,
      ContentType: mimeType,
    },
    queueSize: 3, // concurrent part uploads
    partSize: 10 * 1024 * 1024, // 10 MiB per part
  })

  const result = await upload.done()
  return { key, etag: result.ETag }
}
```

> **Note:** The presigned URL approach (Task 4.6.2) is preferred because it keeps `@upup/server` lightweight — no `@aws-sdk/lib-storage` dependency. The direct SDK approach above is documented for use cases where the server must initiate transfers autonomously (e.g., background jobs, webhooks).

#### OneDrive — API Details

**List files:** `GET https://graph.microsoft.com/v1.0/me/drive/root/children` (for root) or `.../items/<itemId>/children`. Returns `value[]` array with `id`, `name`, `size`, `file.mimeType`, `folder` (present if folder), `lastModifiedDateTime`.

**Download file:** `GET https://graph.microsoft.com/v1.0/me/drive/items/<itemId>/content` returns a 302 redirect to the actual download URL. The `fetch` API follows this automatically, returning the file as a `ReadableStream`.

#### Dropbox — API Details

**List files:** `POST https://api.dropboxapi.com/2/files/list_folder` with JSON body `{ "path": "" }` (for root) or `{ "path": "/folder/path" }`. Returns `entries[]` with `.tag` ("file" or "folder"), `id`, `name`, `size`, `server_modified`. Note: Dropbox does not return MIME types in list responses — these must be inferred from the file extension.

**Download file:** `POST https://content.dropboxapi.com/2/files/download` with the file path passed in the `Dropbox-API-Arg` header as JSON: `{ "path": "<fileId>" }`. Returns file bytes as a `ReadableStream`. Note the unusual POST method for downloads — this is Dropbox-specific.

---

## Task 4.7 — File Transfer Routes (OneDrive + Dropbox)

> OneDrive and Dropbox adapters are already implemented in Task 4.6's `file-transfer.ts`. This task adds verification tests.

### 4.7.1 Write Tests

- [ ] Add to `packages/server/tests/file-transfer.test.ts` — additional describe blocks:

```typescript
describe('OneDrive file transfer', () => {
  const config: UpupServerConfig = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    providers: {
      oneDrive: { clientId: 'ms-id', clientSecret: 'ms-secret' },
    },
    tokenStore: mockTokenStore,
  }

  it('lists files from OneDrive', async () => {
    vi.mocked(mockTokenStore.get).mockResolvedValueOnce(
      JSON.stringify({ accessToken: 'ms-tok' }),
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          value: [
            {
              id: 'od-1',
              name: 'doc.docx',
              size: 2048,
              file: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
              lastModifiedDateTime: '2026-01-01T00:00:00Z',
            },
          ],
        }),
    })

    const handler = createFileTransferHandler(config)
    const req = new Request('https://api.example.com/files/onedrive?session=sess_od')
    const res = await handler(req, 'onedrive', 'list')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.files[0]).toMatchObject({ id: 'od-1', name: 'doc.docx', isFolder: false })
  })
})

describe('Dropbox file transfer', () => {
  const config: UpupServerConfig = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    providers: {
      dropbox: { appKey: 'dbx-key', appSecret: 'dbx-secret' },
    },
    tokenStore: mockTokenStore,
  }

  it('lists files from Dropbox', async () => {
    vi.mocked(mockTokenStore.get).mockResolvedValueOnce(
      JSON.stringify({ accessToken: 'dbx-tok' }),
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          entries: [
            {
              '.tag': 'file',
              id: 'id:dbx-1',
              name: 'readme.txt',
              size: 512,
              server_modified: '2026-01-01T00:00:00Z',
            },
          ],
        }),
    })

    const handler = createFileTransferHandler(config)
    const req = new Request('https://api.example.com/files/dropbox?session=sess_dbx')
    const res = await handler(req, 'dropbox', 'list')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.files[0]).toMatchObject({ id: 'id:dbx-1', name: 'readme.txt', isFolder: false })
  })
})
```

### 4.7.2 Verify

- [ ] Run `pnpm --filter @upup/server test -- --run tests/file-transfer.test.ts` — all provider tests pass.

---

## Task 4.8 — Integration Wiring + Exports

> Update barrel exports and verify the full build.

### 4.8.1 Update @upup/server exports

- [ ] Edit `packages/server/src/index.ts` to include new exports:

```typescript
export { createHandler, type RouteHandler } from './handler'
export { createOAuthHandler, type OAuthProviderAdapter, type OAuthAction } from './oauth'
export { createFileTransferHandler, type FileProviderAdapter, type FileTransferAction } from './file-transfer'
export type { UpupServerConfig, TokenStore, FileMetadata, UploadedFile } from './config'

// Framework adapters
export { createUpupHandler } from './next'
```

### 4.8.2 Update @upup/core strategy exports

- [ ] Verify `packages/core/src/strategies/index.ts` has all exports:

```typescript
export { DirectUpload } from './direct-upload'
export { TokenEndpointCredentials } from './token-endpoint'
export { ServerCredentials } from './server-credentials'
export { MultipartUpload } from './multipart-upload'
```

### 4.8.3 Full Build + Test Verification

- [ ] Run `pnpm build` — all packages build successfully.
- [ ] Run `pnpm --filter @upup/core test` — all tests pass.
- [ ] Run `pnpm --filter @upup/server test` — all tests pass.
- [ ] Run `pnpm test` — full test suite passes.

---

## Route Summary

After all tasks, `@upup/server` handles these routes:

| Method | Route | Handler | Task |
|--------|-------|---------|------|
| POST | `/presign` | handlePresign | Existing |
| POST | `/multipart/init` | handleMultipartInit | Existing |
| POST | `/multipart/sign-part` | handleMultipartSignPart | Existing |
| POST | `/multipart/complete` | handleMultipartComplete | Existing |
| POST | `/multipart/abort` | handleMultipartAbort | Existing |
| GET | `/auth/:provider` | createOAuthHandler (start) | 4.4 |
| GET | `/auth/:provider/cb` | createOAuthHandler (callback) | 4.4 |
| GET | `/files/:provider` | createFileTransferHandler (list) | 4.6 |
| POST | `/files/:provider/transfer` | createFileTransferHandler (transfer) | 4.6 |

## Strategy Summary

After all tasks, `@upup/core` has these strategies:

| Strategy | Interface | Purpose | Task |
|----------|-----------|---------|------|
| `TokenEndpointCredentials` | `CredentialStrategy` | Fetch presigned URL from any endpoint | Existing |
| `ServerCredentials` | `CredentialStrategy` | Full server integration (presign + multipart) | 4.1 |
| `DirectUpload` | `UploadStrategy` | Single PUT upload via XHR | Existing |
| `MultipartUpload` | `UploadStrategy` | Chunked upload with concurrent parts | 4.2 |

## Remaining Architecture Strategies — Status & Deferred Tasks

The architecture spec (`strategies.ts`) defines 7 strategy interfaces. This plan covers `ServerCredentials` (CredentialStrategy) and `MultipartUpload` (UploadStrategy). The remaining 3 strategy concepts are addressed below:

### ClientOAuth — Browser-Side OAuth for Cloud Drives

**Status: Partially covered by existing React drive adapters.**

The `@upup/react` package already implements client-side OAuth for Google Drive (via GIS), OneDrive (via MSAL), and Dropbox (via their JS SDK). These adapters handle the full browser-side OAuth flow — redirect, token acquisition, and file picker UI — without involving `@upup/server`.

ClientOAuth as a standalone `@upup/core` strategy is therefore unnecessary for the current architecture. The React drive adapters serve this role.

> **No separate task needed.** If a non-React client (e.g., Vue, Svelte) is added later, a framework-agnostic `ClientOAuth` strategy can be extracted from the React adapters at that time.

### ServerOAuth — Delegate OAuth to @upup/server

**Status: Deferred — add as Task 4.9.**

The `OAuthStrategy` interface in `strategies.ts` defines `getAuthUrl()`, `handleCallback()`, `listFiles()`, and `getFileMetadata()`. The server-side OAuth routes (Tasks 4.4-4.5) implement the server half. What's missing is a client-side strategy class that redirects the browser to the server's `/auth/:provider` routes and polls/receives the resulting tokens.

- [ ] **Task 4.9 — ServerOAuth Strategy (client-side)**

  Create `packages/core/src/strategies/server-oauth.ts`:

  ```typescript
  // packages/core/src/strategies/server-oauth.ts
  import type { OAuthStrategy, CloudProvider, OAuthTokens, RemoteFile } from '@upup/shared'

  export interface ServerOAuthOptions {
    serverUrl: string
    headers?: Record<string, string>
    apiKey?: string
  }

  /**
   * OAuthStrategy that delegates OAuth to @upup/server.
   *
   * Flow:
   * 1. getAuthUrl() → returns `${serverUrl}/auth/${provider}` (server redirects to provider)
   * 2. Server handles callback at /auth/${provider}/cb → stores tokens via TokenStore
   * 3. listFiles() / getFileMetadata() → proxy calls to /files/${provider} on the server
   */
  export class ServerOAuth implements OAuthStrategy {
    private serverUrl: string
    private headers: Record<string, string>

    constructor(options: ServerOAuthOptions) {
      this.serverUrl = options.serverUrl.replace(/\/$/, '')
      this.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      }
      if (options.apiKey) {
        this.headers['x-api-key'] = options.apiKey
      }
    }

    async getAuthUrl(provider: CloudProvider): Promise<string> {
      // Return the server's OAuth start URL — the browser navigates here,
      // server redirects to the provider's consent screen
      return `${this.serverUrl}/auth/${provider}`
    }

    async handleCallback(
      provider: CloudProvider,
      params: Record<string, string>,
    ): Promise<OAuthTokens> {
      // The server handles the callback at /auth/:provider/cb.
      // This method is called by the client after redirect-back to retrieve
      // the tokens the server stored during the callback.
      const response = await fetch(
        `${this.serverUrl}/auth/${provider}/token?state=${params.state}`,
        { headers: this.headers },
      )
      if (!response.ok) {
        throw new Error(`Token retrieval failed: ${response.status}`)
      }
      return response.json()
    }

    async listFiles(
      provider: CloudProvider,
      path: string,
      token: string,
    ): Promise<RemoteFile[]> {
      const params = new URLSearchParams({ path, session: token })
      const response = await fetch(
        `${this.serverUrl}/files/${provider}?${params}`,
        { headers: this.headers },
      )
      if (!response.ok) {
        throw new Error(`List files failed: ${response.status}`)
      }
      const data = await response.json()
      return data.files
    }

    async getFileMetadata(
      provider: CloudProvider,
      fileId: string,
      token: string,
    ): Promise<RemoteFile> {
      const params = new URLSearchParams({ fileId, session: token })
      const response = await fetch(
        `${this.serverUrl}/files/${provider}/metadata?${params}`,
        { headers: this.headers },
      )
      if (!response.ok) {
        throw new Error(`Get metadata failed: ${response.status}`)
      }
      return response.json()
    }
  }
  ```

  - [ ] Add export to `packages/core/src/strategies/index.ts`:
    ```typescript
    export { ServerOAuth } from './server-oauth'
    ```
  - [ ] Write tests in `packages/core/tests/strategies/server-oauth.test.ts`
  - [ ] Verify: `pnpm --filter @upup/core test -- --run tests/strategies/server-oauth.test.ts`

### ServerTransfer — Stream Cloud Drive Files to Storage via Server

**Status: Deferred — add as Task 4.10.**

The file transfer routes (Tasks 4.6-4.7) handle the server side. What's missing is a client-side strategy class that triggers the server-side transfer by POSTing to `/files/:provider/transfer`.

- [ ] **Task 4.10 — ServerTransfer Strategy (client-side)**

  Create `packages/core/src/strategies/server-transfer.ts`:

  ```typescript
  // packages/core/src/strategies/server-transfer.ts
  import type { CloudProvider, UploadResult } from '@upup/shared'

  export interface ServerTransferOptions {
    serverUrl: string
    headers?: Record<string, string>
    apiKey?: string
  }

  /**
   * Transfers a file from a cloud drive to storage entirely via the server.
   * The browser never downloads the file — the server streams it from the
   * cloud provider directly to S3.
   *
   * Flow:
   * 1. Client calls transfer() with the cloud provider, file ID, and session
   * 2. POST /files/:provider/transfer on the server
   * 3. Server fetches file from cloud API → pipes ReadableStream to S3 PutObject
   * 4. Server returns { key, name, size, type }
   */
  export class ServerTransfer {
    private serverUrl: string
    private headers: Record<string, string>

    constructor(options: ServerTransferOptions) {
      this.serverUrl = options.serverUrl.replace(/\/$/, '')
      this.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      }
      if (options.apiKey) {
        this.headers['x-api-key'] = options.apiKey
      }
    }

    async transfer(params: {
      provider: CloudProvider
      fileId: string
      session: string
      key: string
    }): Promise<UploadResult & { name: string; size: number; type: string }> {
      // First, get a presigned URL from the server for the destination
      const presignResponse = await fetch(`${this.serverUrl}/presign`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          name: params.key.split('/').pop() ?? params.fileId,
          size: 0, // Size unknown until server fetches metadata
          type: 'application/octet-stream',
        }),
      })

      if (!presignResponse.ok) {
        throw new Error(`Presign failed: ${presignResponse.status}`)
      }

      const { uploadUrl, key } = await presignResponse.json()

      // Trigger server-side transfer: cloud drive → S3
      const response = await fetch(
        `${this.serverUrl}/files/${params.provider}/transfer`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            fileId: params.fileId,
            session: params.session,
            uploadUrl,
            key: key ?? params.key,
          }),
        },
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Transfer failed' }))
        throw new Error(err.error ?? `Transfer failed: ${response.status}`)
      }

      return response.json()
    }
  }
  ```

  - [ ] Add export to `packages/core/src/strategies/index.ts`:
    ```typescript
    export { ServerTransfer } from './server-transfer'
    ```
  - [ ] Write tests in `packages/core/tests/strategies/server-transfer.test.ts`
  - [ ] Verify: `pnpm --filter @upup/core test -- --run tests/strategies/server-transfer.test.ts`

### Updated Strategy Table (with deferred strategies)

| Strategy | Interface | Purpose | Task |
|----------|-----------|---------|------|
| `TokenEndpointCredentials` | `CredentialStrategy` | Fetch presigned URL from any endpoint | Existing |
| `ServerCredentials` | `CredentialStrategy` | Full server integration (presign + multipart) | 4.1 |
| `DirectUpload` | `UploadStrategy` | Single PUT upload via XHR | Existing |
| `MultipartUpload` | `UploadStrategy` | Chunked upload with concurrent parts | 4.2 |
| _ClientOAuth_ | `OAuthStrategy` | Browser-side OAuth via GIS/MSAL/Dropbox SDK | Existing (React adapters) |
| `ServerOAuth` | `OAuthStrategy` | Delegate OAuth to @upup/server routes | 4.9 (deferred) |
| `ServerTransfer` | — | Stream cloud files to S3 via server | 4.10 (deferred) |

## Files Created

| File | Package | Task |
|------|---------|------|
| `packages/core/src/strategies/server-credentials.ts` | @upup/core | 4.1 |
| `packages/core/tests/strategies/server-credentials.test.ts` | @upup/core | 4.1 |
| `packages/core/src/strategies/multipart-upload.ts` | @upup/core | 4.2 |
| `packages/core/tests/strategies/multipart-upload.test.ts` | @upup/core | 4.2 |
| `packages/core/tests/core-api-key.test.ts` | @upup/core | 4.3 |
| `packages/server/src/oauth.ts` | @upup/server | 4.4 |
| `packages/server/tests/oauth.test.ts` | @upup/server | 4.4 |
| `packages/server/src/file-transfer.ts` | @upup/server | 4.6 |
| `packages/server/tests/file-transfer.test.ts` | @upup/server | 4.6 |
| `packages/core/src/strategies/server-oauth.ts` | @upup/core | 4.9 (deferred) |
| `packages/core/tests/strategies/server-oauth.test.ts` | @upup/core | 4.9 (deferred) |
| `packages/core/src/strategies/server-transfer.ts` | @upup/core | 4.10 (deferred) |
| `packages/core/tests/strategies/server-transfer.test.ts` | @upup/core | 4.10 (deferred) |

## Files Modified

| File | Package | Task |
|------|---------|------|
| `packages/core/src/core.ts` | @upup/core | 4.3 |
| `packages/core/src/strategies/index.ts` | @upup/core | 4.1, 4.2 |
| `packages/server/src/handler.ts` | @upup/server | 4.4, 4.6 |
| `packages/server/src/index.ts` | @upup/server | 4.8 |
