# Plan 1: API & Type Corrections

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Align types and APIs with v2 architecture spec -- zero dependencies on i18n or styling work.

**Architecture:** Fix type shapes in @upup/shared, update core APIs to match spec, propagate changes through @upup/react hook.

**Tech Stack:** TypeScript, vitest

**Branch:** `huge-refactor`

**Test commands:**
- `pnpm --filter @upup/shared test`
- `pnpm --filter @upup/core test`
- `pnpm --filter @upup/react test`

**Build commands:**
- `pnpm --filter @upup/shared build`
- `pnpm --filter @upup/core build`
- `pnpm --filter @upup/react build`

**Note on test infrastructure:** The `@upup/core` package has `vitest.config.ts` configured to look for `tests/**/*.test.ts` but no test files exist yet. The `@upup/shared` package has no vitest config -- one must be added. Each task below creates test files in the appropriate location.

---

## Phase 1: @upup/shared Type Corrections (Tasks 1-4)

These four tasks are **fully independent** and can be executed in parallel.

---

### Task 1: Add `source: FileSource` field to UploadFile (#79)
**Files:**
- Modify: `packages/shared/src/types/upload-file.ts`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/tests/upload-file.test.ts`
- Modify: `packages/core/src/file-manager.ts` (set default source)

**Steps:**

- [ ] Step 1: Create vitest config for @upup/shared (needed for all shared tests)

Create `packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] Step 2: Write failing test

Create `packages/shared/tests/upload-file.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { UploadFile } from '../src/types/upload-file'
import { FileSource } from '../src/types/file-source'

describe('UploadFile type', () => {
  it('should include a source field of type FileSource', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const uploadFile: UploadFile = Object.assign(file, {
      id: 'test-1',
      source: FileSource.LOCAL,
    })
    expect(uploadFile.source).toBe(FileSource.LOCAL)
  })

  it('should accept all FileSource values', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    for (const source of Object.values(FileSource)) {
      const uploadFile: UploadFile = Object.assign(file, {
        id: 'test-1',
        source,
      })
      expect(uploadFile.source).toBe(source)
    }
  })
})
```

- [ ] Step 3: Verify test fails (TypeScript compilation error -- `source` not in UploadFile type)
```bash
pnpm --filter @upup/shared test
```

- [ ] Step 4: Implement -- add `source` to UploadFile type

In `packages/shared/src/types/upload-file.ts`, change:
```ts
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
```
to:
```ts
import { FileSource } from './file-source'

export type UploadFile = File & {
  id: string
  source: FileSource
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
```

- [ ] Step 5: Update `nativeToUploadFile` in `packages/core/src/file-manager.ts` to set default source

Change:
```ts
function nativeToUploadFile(file: File): UploadFile {
  return Object.assign(file, {
    id: generateFileId(),
    url: undefined,
    relativePath: undefined,
    key: undefined,
    fileHash: undefined,
    checksumSHA256: undefined,
    etag: undefined,
    thumbnail: undefined,
  }) as UploadFile
}
```
to:
```ts
import { FileSource } from '@upup/shared'

function nativeToUploadFile(file: File, source: FileSource = FileSource.LOCAL): UploadFile {
  return Object.assign(file, {
    id: generateFileId(),
    source,
    url: undefined,
    relativePath: undefined,
    key: undefined,
    fileHash: undefined,
    checksumSHA256: undefined,
    etag: undefined,
    thumbnail: undefined,
  }) as UploadFile
}
```

- [ ] Step 6: Verify test passes
```bash
pnpm --filter @upup/shared test
```

- [ ] Step 7: Verify build
```bash
pnpm --filter @upup/shared build && pnpm --filter @upup/core build
```

- [ ] Step 8: Commit
```
feat(shared): add source: FileSource field to UploadFile type (#79)
```

---

### Task 2: Add per-file `status: UploadStatus` field to UploadFile (#44)
**Files:**
- Modify: `packages/shared/src/types/upload-file.ts`
- Create (or append): `packages/shared/tests/upload-file.test.ts`
- Modify: `packages/core/src/file-manager.ts` (set default status)

**Steps:**

- [ ] Step 1: Write failing test

Append to `packages/shared/tests/upload-file.test.ts`:
```ts
import { UploadStatus } from '../src/types/upload-status'

describe('UploadFile status field', () => {
  it('should include a status field defaulting to IDLE', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const uploadFile: UploadFile = Object.assign(file, {
      id: 'test-1',
      source: FileSource.LOCAL,
      status: UploadStatus.IDLE,
    })
    expect(uploadFile.status).toBe(UploadStatus.IDLE)
  })

  it('should accept all UploadStatus values', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    for (const status of Object.values(UploadStatus)) {
      const uploadFile: UploadFile = Object.assign(file, {
        id: 'test-1',
        source: FileSource.LOCAL,
        status,
      })
      expect(uploadFile.status).toBe(status)
    }
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/shared test
```

- [ ] Step 3: Implement -- add `status` to UploadFile type

In `packages/shared/src/types/upload-file.ts`, add after `source: FileSource`:
```ts
  status: UploadStatus
```

And add the import:
```ts
import { UploadStatus } from './upload-status'
```

Full type becomes:
```ts
import { FileSource } from './file-source'
import { UploadStatus } from './upload-status'

export type UploadFile = File & {
  id: string
  source: FileSource
  status: UploadStatus
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
```

- [ ] Step 4: Update `nativeToUploadFile` in `packages/core/src/file-manager.ts`

Add `status: UploadStatus.IDLE` to the assigned properties (import `UploadStatus` from `@upup/shared`):
```ts
function nativeToUploadFile(file: File, source: FileSource = FileSource.LOCAL): UploadFile {
  return Object.assign(file, {
    id: generateFileId(),
    source,
    status: UploadStatus.IDLE,
    url: undefined,
    relativePath: undefined,
    key: undefined,
    fileHash: undefined,
    checksumSHA256: undefined,
    etag: undefined,
    thumbnail: undefined,
  }) as UploadFile
}
```

- [ ] Step 5: Verify test passes
```bash
pnpm --filter @upup/shared test
```

- [ ] Step 6: Verify build
```bash
pnpm --filter @upup/shared build && pnpm --filter @upup/core build
```

- [ ] Step 7: Commit
```
feat(shared): add per-file status: UploadStatus field to UploadFile (#44)
```

---

### Task 3: Restructure UploadFile metadata into nested object (#53)
**Files:**
- Modify: `packages/shared/src/types/upload-file.ts`
- Create (or append): `packages/shared/tests/upload-file-metadata.test.ts`
- Modify: `packages/core/src/file-manager.ts` (update nativeToUploadFile)
- Modify: `packages/core/src/core.ts` (update any references to flat fields)
- Modify: `packages/core/src/steps/hash.ts` (if it writes fileHash)
- Modify: `packages/core/src/steps/thumbnail.ts` (if it writes thumbnail)

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/shared/tests/upload-file-metadata.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { UploadFile, UploadFileMetadata } from '../src/types/upload-file'
import { FileSource } from '../src/types/file-source'
import { UploadStatus } from '../src/types/upload-status'

describe('UploadFile metadata', () => {
  function makeUploadFile(metadataOverrides: Partial<UploadFileMetadata> = {}): UploadFile {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    return Object.assign(file, {
      id: 'test-1',
      source: FileSource.LOCAL,
      status: UploadStatus.IDLE,
      metadata: {
        width: undefined,
        height: undefined,
        duration: undefined,
        thumbnailUrl: undefined,
        checksum: undefined,
        originalContentHash: undefined,
        ...metadataOverrides,
      },
    }) as UploadFile
  }

  it('should have a metadata object with optional fields', () => {
    const uploadFile = makeUploadFile()
    expect(uploadFile.metadata).toBeDefined()
    expect(uploadFile.metadata.width).toBeUndefined()
    expect(uploadFile.metadata.height).toBeUndefined()
    expect(uploadFile.metadata.duration).toBeUndefined()
    expect(uploadFile.metadata.thumbnailUrl).toBeUndefined()
    expect(uploadFile.metadata.checksum).toBeUndefined()
    expect(uploadFile.metadata.originalContentHash).toBeUndefined()
  })

  it('should accept populated metadata', () => {
    const uploadFile = makeUploadFile({
      width: 1920,
      height: 1080,
      duration: 120.5,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      checksum: 'abc123',
      originalContentHash: 'def456',
    })
    expect(uploadFile.metadata.width).toBe(1920)
    expect(uploadFile.metadata.height).toBe(1080)
    expect(uploadFile.metadata.duration).toBe(120.5)
    expect(uploadFile.metadata.thumbnailUrl).toBe('https://example.com/thumb.jpg')
    expect(uploadFile.metadata.checksum).toBe('abc123')
    expect(uploadFile.metadata.originalContentHash).toBe('def456')
  })

  it('should still have legacy flat fields as deprecated optional', () => {
    const uploadFile = makeUploadFile()
    // Legacy fields should still be accessible but optional
    expect(uploadFile.fileHash).toBeUndefined()
    expect(uploadFile.checksumSHA256).toBeUndefined()
    expect(uploadFile.thumbnail).toBeUndefined()
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/shared test
```

- [ ] Step 3: Implement -- add metadata type and field to UploadFile

In `packages/shared/src/types/upload-file.ts`:
```ts
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
```

- [ ] Step 4: Update `nativeToUploadFile` in `packages/core/src/file-manager.ts`

```ts
function nativeToUploadFile(file: File, source: FileSource = FileSource.LOCAL): UploadFile {
  return Object.assign(file, {
    id: generateFileId(),
    source,
    status: UploadStatus.IDLE,
    metadata: {},
    url: undefined,
    relativePath: undefined,
    key: undefined,
    etag: undefined,
    fileHash: undefined,
    checksumSHA256: undefined,
    thumbnail: undefined,
  }) as UploadFile
}
```

- [ ] Step 5: Update `packages/core/src/steps/hash.ts` -- write to both `metadata.checksum` and legacy `checksumSHA256` / `metadata.originalContentHash` and legacy `fileHash`

Read the file first to understand current implementation, then ensure any writes to `file.fileHash` also set `file.metadata.originalContentHash`, and any writes to `file.checksumSHA256` also set `file.metadata.checksum`.

- [ ] Step 6: Update `packages/core/src/steps/thumbnail.ts` -- write to both `metadata.thumbnailUrl` and legacy `thumbnail`

Read the file first, then ensure any writes to `file.thumbnail` also populate `file.metadata.thumbnailUrl` if a URL is generated.

- [ ] Step 7: Verify test passes
```bash
pnpm --filter @upup/shared test
```

- [ ] Step 8: Verify build
```bash
pnpm --filter @upup/shared build && pnpm --filter @upup/core build
```

- [ ] Step 9: Commit
```
feat(shared): restructure UploadFile metadata into nested object (#53)
```

---

### Task 4: Expand UploadResult type (#45)
**Files:**
- Create: `packages/shared/src/types/upload-result.ts`
- Modify: `packages/shared/src/types/index.ts` (add export)
- Create: `packages/shared/tests/upload-result.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/shared/tests/upload-result.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { UploadResult } from '../src/types/upload-result'
import type { UploadFile } from '../src/types/upload-file'
import { FileSource } from '../src/types/file-source'
import { UploadStatus } from '../src/types/upload-status'
import { UpupError } from '../src/errors'

describe('UploadResult type', () => {
  function makeMockUploadFile(): UploadFile {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    return Object.assign(file, {
      id: 'test-1',
      source: FileSource.LOCAL,
      status: UploadStatus.SUCCESSFUL,
      metadata: {},
    }) as UploadFile
  }

  it('should represent a successful upload', () => {
    const result: UploadResult = {
      file: makeMockUploadFile(),
      url: 'https://cdn.example.com/test.txt',
      status: 'success',
    }
    expect(result.status).toBe('success')
    expect(result.url).toBe('https://cdn.example.com/test.txt')
    expect(result.error).toBeUndefined()
  })

  it('should represent a failed upload with error', () => {
    const error = new UpupError('Upload failed', 'UPLOAD_FAILED', true)
    const result: UploadResult = {
      file: makeMockUploadFile(),
      url: '',
      status: 'failed',
      error,
    }
    expect(result.status).toBe('failed')
    expect(result.error).toBe(error)
    expect(result.error?.retryable).toBe(true)
  })

  it('should represent a skipped upload', () => {
    const result: UploadResult = {
      file: makeMockUploadFile(),
      url: '',
      status: 'skipped',
    }
    expect(result.status).toBe('skipped')
  })
})
```

- [ ] Step 2: Verify test fails (import resolution error -- file doesn't exist)
```bash
pnpm --filter @upup/shared test
```

- [ ] Step 3: Implement -- create UploadResult type

Create `packages/shared/src/types/upload-result.ts`:
```ts
import type { UploadFile } from './upload-file'
import type { UpupError } from '../errors'

export type UploadResult = {
  file: UploadFile
  url: string
  status: 'success' | 'failed' | 'skipped'
  error?: UpupError
}
```

- [ ] Step 4: Export from types index

In `packages/shared/src/types/index.ts`, add:
```ts
export * from './upload-result'
```

- [ ] Step 5: Verify test passes
```bash
pnpm --filter @upup/shared test
```

- [ ] Step 6: Verify build
```bash
pnpm --filter @upup/shared build
```

- [ ] Step 7: Commit
```
feat(shared): expand UploadResult type with file, url, status, error (#45)
```

---

## Phase 2: @upup/core API Corrections (Tasks 5-12)

Tasks 5-8 are independent. Tasks 9-12 are independent. All can run after Phase 1 is complete (they depend on the updated UploadFile type).

---

### Task 5: Change `reorderFiles(fromIndex, toIndex)` to `reorderFiles(fileIds: string[])` (#54)
**Files:**
- Modify: `packages/core/src/file-manager.ts`
- Modify: `packages/core/src/core.ts`
- Modify: `packages/react/src/use-upup-upload.ts`
- Modify: `packages/react/src/components/file-list.tsx` (update drag-drop handler to use new reorderFiles signature)
- Create: `packages/core/tests/file-manager-reorder.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/core/tests/file-manager-reorder.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { FileManager } from '../src/file-manager'

describe('FileManager.reorderFiles', () => {
  let fm: FileManager

  beforeEach(() => {
    fm = new FileManager({})
  })

  it('should reorder files by array of IDs', async () => {
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
    const f3 = new File(['c'], 'c.txt', { type: 'text/plain' })
    const added = await fm.addFiles([f1, f2, f3])
    const ids = added.map(f => f.id)

    // Reverse order
    fm.reorderFiles([ids[2], ids[0], ids[1]])

    const reordered = [...fm.getFiles().values()]
    expect(reordered[0].id).toBe(ids[2])
    expect(reordered[1].id).toBe(ids[0])
    expect(reordered[2].id).toBe(ids[1])
  })

  it('should throw if fileIds array length does not match files count', async () => {
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    await fm.addFiles([f1])

    expect(() => fm.reorderFiles([])).toThrow()
  })

  it('should throw if fileIds contain unknown IDs', async () => {
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    await fm.addFiles([f1])

    expect(() => fm.reorderFiles(['unknown-id'])).toThrow()
  })

  it('should be a no-op when order is the same', async () => {
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
    const added = await fm.addFiles([f1, f2])
    const ids = added.map(f => f.id)

    fm.reorderFiles(ids)

    const files = [...fm.getFiles().values()]
    expect(files[0].id).toBe(ids[0])
    expect(files[1].id).toBe(ids[1])
  })
})
```

- [ ] Step 2: Verify test fails (signature mismatch -- current signature is `(fromIndex, toIndex)`)
```bash
pnpm --filter @upup/core test
```

- [ ] Step 3: Implement new signature in FileManager

In `packages/core/src/file-manager.ts`, replace:
```ts
  reorderFiles(fromIndex: number, toIndex: number): void {
    const entries = [...this.files.entries()]
    const [moved] = entries.splice(fromIndex, 1)
    entries.splice(toIndex, 0, moved)
    this.files = new Map(entries)
  }
```
with:
```ts
  reorderFiles(fileIds: string[]): void {
    if (fileIds.length !== this.files.size) {
      throw new Error(
        `reorderFiles: expected ${this.files.size} IDs but received ${fileIds.length}`,
      )
    }

    const newMap = new Map<string, UploadFile>()
    for (const id of fileIds) {
      const file = this.files.get(id)
      if (!file) {
        throw new Error(`reorderFiles: unknown file ID "${id}"`)
      }
      newMap.set(id, file)
    }
    this.files = newMap
  }
```

- [ ] Step 4: Update UpupCore in `packages/core/src/core.ts`

Replace:
```ts
  reorderFiles(fromIndex: number, toIndex: number): void {
    this.fileManager.reorderFiles(fromIndex, toIndex)
    this.emitter.emit('state-change', { files: this.files })
  }
```
with:
```ts
  reorderFiles(fileIds: string[]): void {
    this.fileManager.reorderFiles(fileIds)
    this.emitter.emit('state-change', { files: this.files })
  }
```

- [ ] Step 5: Update React hook in `packages/react/src/use-upup-upload.ts`

In the `UseUpupUploadReturn` interface, replace:
```ts
  reorderFiles(fromIndex: number, toIndex: number): void
```
with:
```ts
  reorderFiles(fileIds: string[]): void
```

In the SSR fallback return, replace:
```ts
      reorderFiles: () => {},
```
with:
```ts
      reorderFiles: () => {},
```
(no change needed for the no-op)

In the main return, replace:
```ts
    reorderFiles: (from, to) => core.reorderFiles(from, to),
```
with:
```ts
    reorderFiles: (fileIds) => core.reorderFiles(fileIds),
```

- [ ] Step 6: Update drag-drop handler in `packages/react/src/components/file-list.tsx`

The `handleDrop` callback currently resolves indices and calls `reorderFiles(fromIndex, toIndex)`. Replace:
```ts
const handleDrop = useCallback(
    (e: React.DragEvent, targetFileId: string) => {
        e.preventDefault()
        if (!draggedFileId || draggedFileId === targetFileId) {
            clearDragState()
            return
        }
        const fromIndex = files.findIndex(f => f.id === draggedFileId)
        const toIndex = files.findIndex(f => f.id === targetFileId)
        if (fromIndex !== -1 && toIndex !== -1) {
            reorderFiles(fromIndex, toIndex)
        }
        clearDragState()
    },
    [draggedFileId, files, reorderFiles, clearDragState],
)
```
with:
```ts
const handleDrop = useCallback(
    (e: React.DragEvent, targetFileId: string) => {
        e.preventDefault()
        if (!draggedFileId || draggedFileId === targetFileId) {
            clearDragState()
            return
        }
        const ids = files.map(f => f.id)
        const fromIdx = ids.indexOf(draggedFileId)
        const toIdx = ids.indexOf(targetFileId)
        if (fromIdx !== -1 && toIdx !== -1) {
            ids.splice(fromIdx, 1)
            ids.splice(toIdx, 0, draggedFileId)
            reorderFiles(ids)
        }
        clearDragState()
    },
    [draggedFileId, files, reorderFiles, clearDragState],
)
```

- [ ] Step 7: Verify test passes
```bash
pnpm --filter @upup/core test
```

- [ ] Step 8: Verify build
```bash
pnpm --filter @upup/shared build && pnpm --filter @upup/core build && pnpm --filter @upup/react build
```

- [ ] Step 9: Commit
```
feat(core): change reorderFiles to accept fileIds array (#54)
```

---

### Task 6: Add `restrictions` nested object to CoreOptions (#51)
**Files:**
- Modify: `packages/core/src/core.ts`
- Modify: `packages/core/src/file-manager.ts`
- Create: `packages/core/tests/restrictions.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/core/tests/restrictions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('CoreOptions.restrictions', () => {
  it('should accept a restrictions nested object', () => {
    const core = new UpupCore({
      restrictions: {
        maxFileSize: { size: 10, unit: 'MB' },
        minFileSize: { size: 1, unit: 'KB' },
        maxTotalFileSize: { size: 100, unit: 'MB' },
        maxNumberOfFiles: 5,
        minNumberOfFiles: 1,
        allowedFileTypes: ['image/*', '.pdf'],
      },
    })
    expect(core.files.size).toBe(0)
    core.destroy()
  })

  it('should merge restrictions with flat options (flat takes precedence)', () => {
    const core = new UpupCore({
      restrictions: {
        maxNumberOfFiles: 10,
      },
      limit: 5, // flat option takes precedence
    })
    // Internally limit should be 5, not 10
    expect(core.options.limit).toBe(5)
    core.destroy()
  })

  it('should use restrictions values when flat options are not set', async () => {
    const core = new UpupCore({
      restrictions: {
        maxNumberOfFiles: 2,
        allowedFileTypes: ['text/plain'],
      },
    })

    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
    await core.addFiles([f1, f2])
    expect(core.files.size).toBe(2)

    const f3 = new File(['c'], 'c.txt', { type: 'text/plain' })
    await expect(core.addFiles([f3])).rejects.toThrow()

    core.destroy()
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/core test
```

- [ ] Step 3: Implement -- add Restrictions type and merge logic

In `packages/core/src/core.ts`, add the type and merge in constructor:

Add before `CoreOptions`:
```ts
export interface Restrictions {
  maxFileSize?: MaxFileSizeObject
  minFileSize?: MaxFileSizeObject
  maxTotalFileSize?: MaxFileSizeObject
  maxNumberOfFiles?: number
  minNumberOfFiles?: number
  allowedFileTypes?: string[]
}
```

Add to `CoreOptions`:
```ts
  restrictions?: Restrictions
```

In the constructor, after `this.options = options`, add merge logic:
```ts
    // Merge restrictions into flat options (flat takes precedence)
    if (options.restrictions) {
      const r = options.restrictions
      if (r.maxFileSize && !options.maxFileSize) this.options.maxFileSize = r.maxFileSize
      if (r.minFileSize && !options.minFileSize) this.options.minFileSize = r.minFileSize
      if (r.maxTotalFileSize && !options.maxTotalFileSize) this.options.maxTotalFileSize = r.maxTotalFileSize
      if (r.maxNumberOfFiles != null && !options.limit) this.options.limit = r.maxNumberOfFiles
      if (r.minNumberOfFiles != null && !options.minFiles) this.options.minFiles = r.minNumberOfFiles
      if (r.allowedFileTypes && !options.accept) this.options.accept = r.allowedFileTypes.join(',')
    }
```

Note: `this.options` must be changed from `readonly` to allow mutation, or a mutable copy must be made:
```ts
  readonly options: CoreOptions
```
Change to:
```ts
  options: CoreOptions
```
And in constructor:
```ts
    this.options = { ...options }
```

- [ ] Step 4: Verify test passes
```bash
pnpm --filter @upup/core test
```

- [ ] Step 5: Verify build
```bash
pnpm --filter @upup/core build
```

- [ ] Step 6: Commit
```
feat(core): add restrictions nested object to CoreOptions (#51)
```

---

### Task 7: Add typed `cloudDrives` nested object to CoreOptions (#52)
**Files:**
- Modify: `packages/core/src/core.ts`
- Create: `packages/core/tests/cloud-drives.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/core/tests/cloud-drives.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'
import type { CloudDrivesConfig } from '../src/core'

describe('CoreOptions.cloudDrives', () => {
  it('should accept a cloudDrives nested object', () => {
    const core = new UpupCore({
      cloudDrives: {
        googleDrive: {
          clientId: 'gd-client-id',
          apiKey: 'gd-api-key',
          appId: 'gd-app-id',
        },
        oneDrive: {
          clientId: 'od-client-id',
          authority: 'https://login.microsoftonline.com/common',
        },
        dropbox: {
          appKey: 'db-app-key',
        },
      },
    })
    expect(core.options.cloudDrives?.googleDrive?.clientId).toBe('gd-client-id')
    expect(core.options.cloudDrives?.oneDrive?.clientId).toBe('od-client-id')
    expect(core.options.cloudDrives?.dropbox?.appKey).toBe('db-app-key')
    core.destroy()
  })

  it('should merge cloudDrives with flat config options (flat takes precedence)', () => {
    const core = new UpupCore({
      cloudDrives: {
        googleDrive: {
          clientId: 'nested-id',
          apiKey: 'nested-key',
          appId: 'nested-app',
        },
      },
      googleDriveConfigs: { clientId: 'flat-id' },
    })
    // Flat option takes precedence
    expect(core.options.googleDriveConfigs).toEqual({ clientId: 'flat-id' })
    core.destroy()
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/core test
```

- [ ] Step 3: Implement -- add CloudDrivesConfig type and merge logic

In `packages/core/src/core.ts`, add type:
```ts
export interface GoogleDriveConfig {
  clientId: string
  apiKey: string
  appId: string
}

export interface OneDriveConfig {
  clientId: string
  authority?: string
}

export interface DropboxConfig {
  appKey: string
}

export interface CloudDrivesConfig {
  googleDrive?: GoogleDriveConfig
  oneDrive?: OneDriveConfig
  dropbox?: DropboxConfig
}
```

Add to `CoreOptions`:
```ts
  cloudDrives?: CloudDrivesConfig
```

In constructor merge logic (after restrictions merge):
```ts
    if (options.cloudDrives) {
      const cd = options.cloudDrives
      if (cd.googleDrive && !options.googleDriveConfigs) {
        this.options.googleDriveConfigs = cd.googleDrive
      }
      if (cd.oneDrive && !options.oneDriveConfigs) {
        this.options.oneDriveConfigs = cd.oneDrive
      }
      if (cd.dropbox && !options.dropboxConfigs) {
        this.options.dropboxConfigs = cd.dropbox
      }
    }
```

- [ ] Step 4: Verify test passes
```bash
pnpm --filter @upup/core test
```

- [ ] Step 5: Verify build
```bash
pnpm --filter @upup/core build
```

- [ ] Step 6: Commit
```
feat(core): add typed cloudDrives nested object to CoreOptions (#52)
```

---

### Task 8: Add public `validateFiles()` method (#80)
**Files:**
- Modify: `packages/core/src/core.ts`
- Modify: `packages/core/src/file-manager.ts`
- Create: `packages/core/tests/validate-files.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/core/tests/validate-files.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'
import type { ValidationResult } from '../src/core'

describe('UpupCore.validateFiles', () => {
  it('should return valid results for acceptable files', async () => {
    const core = new UpupCore({
      accept: 'text/plain',
      maxFileSize: { size: 1, unit: 'MB' },
    })

    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const results = await core.validateFiles([f1])

    expect(results).toHaveLength(1)
    expect(results[0].valid).toBe(true)
    expect(results[0].file).toBe(f1)
    expect(results[0].errors).toEqual([])

    core.destroy()
  })

  it('should return invalid result for wrong file type', async () => {
    const core = new UpupCore({
      accept: 'text/plain',
    })

    const f1 = new File(['hello'], 'test.png', { type: 'image/png' })
    const results = await core.validateFiles([f1])

    expect(results).toHaveLength(1)
    expect(results[0].valid).toBe(false)
    expect(results[0].errors.length).toBeGreaterThan(0)
    expect(results[0].errors[0].code).toBe('TYPE_MISMATCH')

    core.destroy()
  })

  it('should return invalid result for file exceeding size limit', async () => {
    const core = new UpupCore({
      maxFileSize: { size: 1, unit: 'B' },
    })

    const f1 = new File(['hello world'], 'test.txt', { type: 'text/plain' })
    const results = await core.validateFiles([f1])

    expect(results).toHaveLength(1)
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0].code).toBe('FILE_TOO_LARGE')

    core.destroy()
  })

  it('should validate multiple files independently', async () => {
    const core = new UpupCore({
      accept: 'text/plain',
      maxFileSize: { size: 5, unit: 'B' },
    })

    const f1 = new File(['hi'], 'good.txt', { type: 'text/plain' })
    const f2 = new File(['hello world this is too big'], 'big.txt', { type: 'text/plain' })
    const f3 = new File(['x'], 'wrong.png', { type: 'image/png' })

    const results = await core.validateFiles([f1, f2, f3])

    expect(results).toHaveLength(3)
    expect(results[0].valid).toBe(true)
    expect(results[1].valid).toBe(false)
    expect(results[2].valid).toBe(false)

    core.destroy()
  })

  it('should not modify the internal file list', async () => {
    const core = new UpupCore({})
    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })

    await core.validateFiles([f1])
    expect(core.files.size).toBe(0) // validateFiles is read-only

    core.destroy()
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/core test
```

- [ ] Step 3: Implement ValidationResult type and validateFiles method

Add to `packages/core/src/core.ts`:
```ts
export type ValidationResult = {
  file: File
  valid: boolean
  errors: Array<{ code: string; message: string }>
}
```

Add the `validateFiles` method to the `UpupCore` class:
```ts
  async validateFiles(files: File[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    for (const file of files) {
      const errors: Array<{ code: string; message: string }> = []

      if (this.options.accept && !matchesAccept(file, this.options.accept)) {
        errors.push({
          code: UpupErrorCode.TYPE_MISMATCH,
          message: `File type "${file.type}" is not accepted`,
        })
      }

      if (this.options.maxFileSize) {
        const maxBytes = fileSizeInBytes(this.options.maxFileSize)
        if (file.size > maxBytes) {
          errors.push({
            code: UpupErrorCode.FILE_TOO_LARGE,
            message: `File "${file.name}" exceeds maximum size`,
          })
        }
      }

      if (this.options.minFileSize) {
        const minBytes = fileSizeInBytes(this.options.minFileSize)
        if (file.size < minBytes) {
          errors.push({
            code: UpupErrorCode.FILE_TOO_SMALL,
            message: `File "${file.name}" is below minimum size`,
          })
        }
      }

      results.push({
        file,
        valid: errors.length === 0,
        errors,
      })
    }

    return results
  }
```

**Important:** The `matchesAccept` and `fileSizeInBytes` helper functions currently live in `packages/core/src/file-manager.ts` as module-private functions. They need to be exported (or extracted to a shared validation utils file) so `core.ts` can use them. The cleanest approach:

1. Export them from `file-manager.ts`:
```ts
export function fileSizeInBytes(size: MaxFileSizeObject): number { ... }
export function matchesAccept(file: File, accept: string): boolean { ... }
```

2. Import in `core.ts`:
```ts
import { FileManager, type FileManagerOptions, fileSizeInBytes, matchesAccept } from './file-manager'
```

- [ ] Step 4: Export `ValidationResult` from `packages/core/src/index.ts`:
```ts
export type { CoreOptions, UploadOptions, ValidationResult, Restrictions, CloudDrivesConfig } from './core'
```

- [ ] Step 5: Verify test passes
```bash
pnpm --filter @upup/core test
```

- [ ] Step 6: Verify build
```bash
pnpm --filter @upup/core build
```

- [ ] Step 7: Commit
```
feat(core): add public validateFiles method (#80)
```

---

### Task 9: Implement dynamic pipeline imports (#81)
**Files:**
- Modify: `packages/core/src/core.ts`
- Create: `packages/core/tests/dynamic-pipeline.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/core/tests/dynamic-pipeline.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

describe('Dynamic pipeline imports', () => {
  it('should auto-build pipeline from boolean options when no explicit pipeline provided', () => {
    const core = new UpupCore({
      heicConversion: true,
      stripExifData: true,
      checksumVerification: true,
    })
    // Pipeline engine should be created automatically
    expect((core as any).pipelineEngine).not.toBeNull()
    core.destroy()
  })

  it('should not auto-build pipeline when explicit pipeline is provided', () => {
    const mockStep = {
      name: 'custom-step',
      process: vi.fn(async (file: any) => file),
    }
    const core = new UpupCore({
      heicConversion: true,
      pipeline: [mockStep],
    })
    // Should use the explicitly provided pipeline, not auto-build
    expect((core as any).pipelineEngine).not.toBeNull()
    core.destroy()
  })

  it('should not create pipeline when no boolean options are set', () => {
    const core = new UpupCore({})
    expect((core as any).pipelineEngine).toBeNull()
    core.destroy()
  })

  it('should include hash step when checksumVerification is true', () => {
    const core = new UpupCore({
      checksumVerification: true,
    })
    const engine = (core as any).pipelineEngine
    expect(engine).not.toBeNull()
    const steps = (engine as any).steps as Array<{ name: string }>
    expect(steps.some((s: { name: string }) => s.name.includes('hash'))).toBe(true)
    core.destroy()
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/core test
```

- [ ] Step 3: Implement dynamic pipeline building

In `packages/core/src/core.ts`, add a private method `buildAutoPipeline`:
```ts
  private buildAutoPipeline(): PipelineStep[] {
    const steps: PipelineStep[] = []

    // Import steps dynamically based on boolean options
    if (this.options.heicConversion) {
      // Lazy require -- the step modules already exist
      const { heicStep } = require('./steps/heic')
      steps.push(heicStep())
    }

    if (this.options.stripExifData) {
      const { exifStep } = require('./steps/exif')
      steps.push(exifStep())
    }

    if (this.options.imageCompression || this.options.shouldCompress) {
      const { compressStep } = require('./steps/compress')
      const opts = typeof this.options.imageCompression === 'object'
        ? this.options.imageCompression
        : {}
      steps.push(compressStep(opts))
    }

    if (this.options.thumbnailGenerator) {
      const { thumbnailStep } = require('./steps/thumbnail')
      const opts = typeof this.options.thumbnailGenerator === 'object'
        ? this.options.thumbnailGenerator
        : {}
      steps.push(thumbnailStep(opts))
    }

    if (this.options.checksumVerification) {
      const { hashStep } = require('./steps/hash')
      steps.push(hashStep())
    }

    return steps
  }
```

**Important:** Before implementing, read each step file (`packages/core/src/steps/hash.ts`, `heic.ts`, `exif.ts`, `compress.ts`, `thumbnail.ts`) to confirm the actual export names and factory function signatures. The `require()` calls above are placeholders -- adjust to match actual exports.

In the constructor, after the existing `if (options.pipeline)` block, add:
```ts
    if (!options.pipeline) {
      const autoSteps = this.buildAutoPipeline()
      if (autoSteps.length > 0) {
        this.pipelineEngine = new PipelineEngine(autoSteps)
      }
    }
```

- [ ] Step 4: Verify test passes
```bash
pnpm --filter @upup/core test
```

- [ ] Step 5: Verify build
```bash
pnpm --filter @upup/core build
```

- [ ] Step 6: Commit
```
feat(core): implement dynamic pipeline imports from boolean options (#81)
```

---

### Task 10: Add `enableWorkers` and `workerPoolSize` to CoreOptions (#84)
**Files:**
- Modify: `packages/core/src/core.ts`
- Create: `packages/core/tests/worker-options.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/core/tests/worker-options.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('CoreOptions worker options', () => {
  it('should accept enableWorkers option', () => {
    const core = new UpupCore({
      enableWorkers: true,
    })
    expect(core.options.enableWorkers).toBe(true)
    core.destroy()
  })

  it('should accept workerPoolSize option', () => {
    const core = new UpupCore({
      enableWorkers: true,
      workerPoolSize: 4,
    })
    expect(core.options.workerPoolSize).toBe(4)
    core.destroy()
  })

  it('should default enableWorkers to false', () => {
    const core = new UpupCore({})
    expect(core.options.enableWorkers).toBeUndefined()
    core.destroy()
  })

  it('should create WorkerPool when enableWorkers is true', () => {
    const core = new UpupCore({
      enableWorkers: true,
      workerPoolSize: 2,
    })
    // Worker pool should be created (accessed via private field for testing)
    expect((core as any).workerPool).toBeDefined()
    core.destroy()
  })

  it('should not create WorkerPool when enableWorkers is false', () => {
    const core = new UpupCore({})
    expect((core as any).workerPool).toBeUndefined()
    core.destroy()
  })

  it('should destroy WorkerPool on core.destroy()', () => {
    const core = new UpupCore({
      enableWorkers: true,
    })
    const pool = (core as any).workerPool
    expect(pool).toBeDefined()
    core.destroy()
    // After destroy, workers array should be empty
    expect(pool.workers).toEqual([])
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/core test
```

- [ ] Step 3: Implement

Add to `CoreOptions` in `packages/core/src/core.ts`:
```ts
  enableWorkers?: boolean
  workerPoolSize?: number
```

Add private field:
```ts
  private workerPool?: WorkerPool
```

Import (already imported if WorkerPool is in the file):
```ts
import { WorkerPool } from './worker-pool'
```

In constructor, after crash recovery setup:
```ts
    if (options.enableWorkers) {
      this.workerPool = new WorkerPool({
        maxWorkers: options.workerPoolSize,
      })
    }
```

In `destroy()`, add before existing cleanup:
```ts
    this.workerPool?.destroy()
```

Wire worker pool into pipeline context -- in the `upload()` method, when building `PipelineContext`, add:
```ts
      const context: PipelineContext = {
        files: this.files,
        options: this.options as Record<string, unknown>,
        emit: (event, data) => this.emitter.emit(event, data),
        t: (key: string) => key,
        worker: this.workerPool ? {
          execute: <T>(task: { type: string; data: ArrayBuffer }) => this.workerPool!.execute<T>(task as WorkerTask),
        } : undefined,
      }
```

- [ ] Step 4: Verify test passes
```bash
pnpm --filter @upup/core test
```

- [ ] Step 5: Verify build
```bash
pnpm --filter @upup/core build
```

- [ ] Step 6: Commit
```
feat(core): add enableWorkers and workerPoolSize options (#84)
```

---

### Task 11: Wire addFiles overrides through pipeline/upload (#49)
**Files:**
- Modify: `packages/core/src/core.ts`
- Create: `packages/core/tests/add-files-overrides.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/core/tests/add-files-overrides.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

describe('addFiles with overrides', () => {
  it('should store per-batch overrides for later use in upload', async () => {
    const core = new UpupCore({})

    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([f1], { checksumVerification: true, maxRetries: 5 })

    // Overrides should be stored internally
    const overrides = (core as any).fileOverrides as Map<string, any>
    expect(overrides).toBeDefined()
    const fileId = [...core.files.keys()][0]
    expect(overrides.get(fileId)).toEqual({ checksumVerification: true, maxRetries: 5 })

    core.destroy()
  })

  it('should pass overrides metadata through to upload', async () => {
    const core = new UpupCore({})

    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([f1], { metadata: { customKey: 'customValue' } })

    const overrides = (core as any).fileOverrides as Map<string, any>
    const fileId = [...core.files.keys()][0]
    expect(overrides.get(fileId)?.metadata).toEqual({ customKey: 'customValue' })

    core.destroy()
  })

  it('should clean up overrides when file is removed', async () => {
    const core = new UpupCore({})

    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([f1], { maxRetries: 3 })

    const fileId = [...core.files.keys()][0]
    core.removeFile(fileId)

    const overrides = (core as any).fileOverrides as Map<string, any>
    expect(overrides.has(fileId)).toBe(false)

    core.destroy()
  })

  it('should clean up all overrides on removeAll', async () => {
    const core = new UpupCore({})

    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
    await core.addFiles([f1, f2], { maxRetries: 3 })

    core.removeAll()

    const overrides = (core as any).fileOverrides as Map<string, any>
    expect(overrides.size).toBe(0)

    core.destroy()
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/core test
```

- [ ] Step 3: Implement

Add private field to `UpupCore`:
```ts
  private fileOverrides = new Map<string, Partial<UploadOptions>>()
```

In `addFiles`, store overrides per file:
```ts
  async addFiles(files: File[], overrides?: Partial<UploadOptions>): Promise<void> {
    try {
      const added = await this.fileManager.addFiles(files)
      if (added.length > 0) {
        if (overrides) {
          for (const file of added) {
            this.fileOverrides.set(file.id, overrides)
          }
        }
        this.emitter.emit('files-added', added)
        this.emitter.emit('state-change', { files: this.files })
      }
      const rejectedCount = files.length - added.length
      if (rejectedCount > 0) {
        this.emitter.emit('file-rejected', { count: rejectedCount })
      }
    } catch (error) {
      this.emitter.emit('restriction-failed', { error })
      throw error
    }
  }
```

In `removeFile`, clean up:
```ts
  removeFile(id: string): void {
    const file = this.fileManager.removeFile(id)
    if (file) {
      this.fileOverrides.delete(id)
      this.emitter.emit('file-removed', file)
      this.emitter.emit('state-change', { files: this.files })
    }
  }
```

In `removeAll`, clean up:
```ts
  removeAll(): void {
    this.fileManager.removeAll()
    this.fileOverrides.clear()
    this.emitter.emit('state-change', { files: this.files })
  }
```

In `destroy`, clean up:
```ts
    this.fileOverrides.clear()
```

- [ ] Step 4: Verify test passes
```bash
pnpm --filter @upup/core test
```

- [ ] Step 5: Verify build
```bash
pnpm --filter @upup/core build
```

- [ ] Step 6: Commit
```
feat(core): wire addFiles overrides through pipeline and upload (#49)
```

---

### Task 12: Add `composeEnhancers()` utility function (#50)
**Files:**
- Create: `packages/core/src/compose-enhancers.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/compose-enhancers.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/core/tests/compose-enhancers.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { composeEnhancers } from '../src/compose-enhancers'
import type { CoreOptions } from '../src/core'

type Enhancer = (options: CoreOptions) => CoreOptions

describe('composeEnhancers', () => {
  it('should return identity when called with no enhancers', () => {
    const composed = composeEnhancers()
    const options: CoreOptions = { maxRetries: 3 }
    expect(composed(options)).toEqual(options)
  })

  it('should apply a single enhancer', () => {
    const addRetries: Enhancer = (opts) => ({ ...opts, maxRetries: 5 })
    const composed = composeEnhancers(addRetries)
    const result = composed({})
    expect(result.maxRetries).toBe(5)
  })

  it('should compose multiple enhancers left-to-right', () => {
    const calls: string[] = []

    const first: Enhancer = (opts) => {
      calls.push('first')
      return { ...opts, maxRetries: 1 }
    }
    const second: Enhancer = (opts) => {
      calls.push('second')
      return { ...opts, maxRetries: (opts.maxRetries ?? 0) + 1 }
    }

    const composed = composeEnhancers(first, second)
    const result = composed({})

    expect(calls).toEqual(['first', 'second'])
    expect(result.maxRetries).toBe(2)
  })

  it('should pass the result of each enhancer to the next', () => {
    const setRetries: Enhancer = (opts) => ({ ...opts, maxRetries: 10 })
    const doubleRetries: Enhancer = (opts) => ({
      ...opts,
      maxRetries: (opts.maxRetries ?? 0) * 2,
    })

    const composed = composeEnhancers(setRetries, doubleRetries)
    const result = composed({})
    expect(result.maxRetries).toBe(20)
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/core test
```

- [ ] Step 3: Implement

Create `packages/core/src/compose-enhancers.ts`:
```ts
import type { CoreOptions } from './core'

export type CoreEnhancer = (options: CoreOptions) => CoreOptions

/**
 * Composes multiple CoreOptions enhancers into a single enhancer.
 * Enhancers are applied left-to-right: the output of each is passed
 * as input to the next.
 *
 * @example
 * const withDefaults = composeEnhancers(
 *   withAutoRetry({ maxRetries: 3 }),
 *   withCompression({ quality: 0.8 }),
 * )
 * const core = new UpupCore(withDefaults(userOptions))
 */
export function composeEnhancers(...enhancers: CoreEnhancer[]): CoreEnhancer {
  if (enhancers.length === 0) {
    return (options) => options
  }

  return (options: CoreOptions) =>
    enhancers.reduce((opts, enhancer) => enhancer(opts), options)
}
```

- [ ] Step 4: Export from `packages/core/src/index.ts`

Add:
```ts
export { composeEnhancers } from './compose-enhancers'
export type { CoreEnhancer } from './compose-enhancers'
```

- [ ] Step 5: Verify test passes
```bash
pnpm --filter @upup/core test
```

- [ ] Step 6: Verify build
```bash
pnpm --filter @upup/core build
```

- [ ] Step 7: Commit
```
feat(core): add composeEnhancers utility function (#50)
```

---

## Phase 3: @upup/react Hook Improvements (Tasks 13-14)

These depend on Phase 2 (updated core APIs).

---

### Task 13: Expose `on()` and `ext` directly on useUpupUpload return (#48)
**Files:**
- Modify: `packages/react/src/use-upup-upload.ts`
- Create: `packages/react/tests/use-upup-upload-api.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/react/tests/use-upup-upload-api.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react-hooks'
import { useUpupUpload } from '../src/use-upup-upload'

// Note: vitest.config.ts for react package must use jsdom environment
// and @testing-library/react-hooks must be installed

describe('useUpupUpload API surface', () => {
  it('should expose on() directly on the return value', () => {
    const { result } = renderHook(() => useUpupUpload({}))
    expect(typeof result.current.on).toBe('function')
  })

  it('should expose ext directly on the return value', () => {
    const { result } = renderHook(() => useUpupUpload({}))
    expect(result.current.ext).toBeDefined()
    expect(typeof result.current.ext).toBe('object')
  })

  it('on() should return an unsubscribe function', () => {
    const { result } = renderHook(() => useUpupUpload({}))
    const unsub = result.current.on('state-change', () => {})
    expect(typeof unsub).toBe('function')
    unsub() // should not throw
  })
})
```

**Note:** The react vitest config needs `environment: 'jsdom'` and `@testing-library/react-hooks` must be a dev dependency. If not present, add it:
```bash
pnpm --filter @upup/react add -D @testing-library/react-hooks @testing-library/react
```

Also update `packages/react/vitest.config.ts` to use jsdom:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/react test
```

- [ ] Step 3: Implement

In `packages/react/src/use-upup-upload.ts`, add to `UseUpupUploadReturn` interface:
```ts
  on(event: string, handler: (...args: unknown[]) => void): () => void
  ext: Record<string, import('@upup/core').ExtensionMethods>
```

In the SSR fallback return, add:
```ts
      on: () => () => {},
      ext: {},
```

In the main return, add:
```ts
    on: (event, handler) => core.on(event, handler),
    ext: core.ext,
```

- [ ] Step 4: Verify test passes
```bash
pnpm --filter @upup/react test
```

- [ ] Step 5: Verify build
```bash
pnpm --filter @upup/react build
```

- [ ] Step 6: Commit
```
feat(react): expose on() and ext directly on useUpupUpload return (#48)
```

---

### Task 14: Add convenience callback options (#43)
**Files:**
- Modify: `packages/react/src/use-upup-upload.ts`
- Create: `packages/react/tests/use-upup-upload-callbacks.test.ts`

**Steps:**

- [ ] Step 1: Write failing test

Create `packages/react/tests/use-upup-upload-callbacks.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react-hooks'
import { useUpupUpload } from '../src/use-upup-upload'

describe('useUpupUpload convenience callbacks', () => {
  it('should call onFileAdded when a file is added', async () => {
    const onFileAdded = vi.fn()
    const { result } = renderHook(() =>
      useUpupUpload({ onFileAdded })
    )

    await act(async () => {
      await result.current.addFiles([
        new File(['test'], 'test.txt', { type: 'text/plain' }),
      ])
    })

    expect(onFileAdded).toHaveBeenCalled()
  })

  it('should call onFileRemoved when a file is removed', async () => {
    const onFileRemoved = vi.fn()
    const { result } = renderHook(() =>
      useUpupUpload({ onFileRemoved })
    )

    await act(async () => {
      await result.current.addFiles([
        new File(['test'], 'test.txt', { type: 'text/plain' }),
      ])
    })

    const fileId = result.current.files[0]?.id
    expect(fileId).toBeDefined()

    act(() => {
      result.current.removeFile(fileId)
    })

    expect(onFileRemoved).toHaveBeenCalled()
  })

  it('should call onUploadProgress during upload', async () => {
    const onUploadProgress = vi.fn()
    const { result } = renderHook(() =>
      useUpupUpload({ onUploadProgress })
    )

    // Wire internal event to verify callback is subscribed
    const core = result.current.core
    // Simulate the event
    act(() => {
      ;(core as any).emitter.emit('upload-progress', {
        fileId: 'test',
        loaded: 50,
        total: 100,
      })
    })

    expect(onUploadProgress).toHaveBeenCalledWith({
      fileId: 'test',
      loaded: 50,
      total: 100,
    })
  })

  it('should call onUploadComplete when all uploads finish', async () => {
    const onUploadComplete = vi.fn()
    const { result } = renderHook(() =>
      useUpupUpload({ onUploadComplete })
    )

    const core = result.current.core
    act(() => {
      ;(core as any).emitter.emit('upload-all-complete', [])
    })

    expect(onUploadComplete).toHaveBeenCalledWith([])
  })
})
```

- [ ] Step 2: Verify test fails
```bash
pnpm --filter @upup/react test
```

- [ ] Step 3: Implement

Add callback option types. In `packages/react/src/use-upup-upload.ts`, define:
```ts
export interface UseUpupUploadOptions extends CoreOptions {
  onFileAdded?: (files: UploadFile[]) => void
  onFileRemoved?: (file: UploadFile) => void
  onUploadProgress?: (progress: { fileId: string; loaded: number; total: number }) => void
  onUploadComplete?: (files: UploadFile[]) => void
}
```

Change function signature:
```ts
export function useUpupUpload(options: UseUpupUploadOptions): UseUpupUploadReturn {
```

In the `useEffect`, after subscribing to `state-change`, wire the callbacks:
```ts
    const unsubCallbacks: Array<() => void> = []

    if (options.onFileAdded) {
      unsubCallbacks.push(core.on('files-added', options.onFileAdded))
    }
    if (options.onFileRemoved) {
      unsubCallbacks.push(core.on('file-removed', options.onFileRemoved))
    }
    if (options.onUploadProgress) {
      unsubCallbacks.push(core.on('upload-progress', options.onUploadProgress))
    }
    if (options.onUploadComplete) {
      unsubCallbacks.push(core.on('upload-all-complete', options.onUploadComplete))
    }

    return () => {
      unsub()
      for (const u of unsubCallbacks) u()
      core.destroy()
      coreRef.current = null
    }
```

- [ ] Step 4: Verify test passes
```bash
pnpm --filter @upup/react test
```

- [ ] Step 5: Verify build
```bash
pnpm --filter @upup/react build
```

- [ ] Step 6: Commit
```
feat(react): add convenience callback options to useUpupUpload (#43)
```

---

## Execution Order & Parallelism

```
Phase 1 (all parallel):
  Task 1: UploadFile.source        ─┐
  Task 2: UploadFile.status        ─┤─ can run in parallel
  Task 3: UploadFile.metadata      ─┤  (but Task 3 depends on Tasks 1+2
  Task 4: UploadResult type        ─┘   for the full type shape)

  Recommended: Run Tasks 1+2+4 in parallel, then Task 3.

Phase 2 (after Phase 1):
  Task 5:  reorderFiles            ─┐
  Task 6:  restrictions            ─┤
  Task 7:  cloudDrives             ─┤─ all independent
  Task 8:  validateFiles           ─┤
  Task 9:  dynamic pipeline        ─┤
  Task 10: worker options          ─┤
  Task 11: addFiles overrides      ─┤
  Task 12: composeEnhancers        ─┘

  All 8 tasks can run in parallel.

Phase 3 (after Phase 2):
  Task 13: expose on()/ext         ─┐─ can run in parallel
  Task 14: convenience callbacks   ─┘
```

## Verification Checklist (run after all tasks)

```bash
# Full build chain
pnpm --filter @upup/shared build
pnpm --filter @upup/core build
pnpm --filter @upup/react build

# Full test suite
pnpm --filter @upup/shared test
pnpm --filter @upup/core test
pnpm --filter @upup/react test

# TypeScript check (no emit)
pnpm --filter @upup/shared exec tsc --noEmit
pnpm --filter @upup/core exec tsc --noEmit
pnpm --filter @upup/react exec tsc --noEmit
```
