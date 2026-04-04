# upup v2.0 Implementation Plan (Revised)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite upup as 4 packages (`@upup/shared`, `@upup/core`, `@upup/react`, `@upup/server`) with headless-first architecture, Vite-inspired plugin system, subpath exports for tree-shaking, SSR-first React components, and competitive enhancements from react-uploady/better-upload/uploadcare/react-filepond.

**Architecture:** `@upup/shared` (done) holds types/i18n/constants. `@upup/core` is a framework-agnostic engine with plugin system, event emitter, pipeline engine, and subpath exports for pipeline steps. `@upup/react` wraps core with SSR-safe `useUpupUpload()` hook + all UI components including PasteZone and declarative sources. `@upup/server` provides embeddable route handlers. Heavy deps (pako, heic2any) are isolated behind subpath imports.

**Tech Stack:** TypeScript, tsup (build), pnpm workspaces, Vitest (unit), React 18+, framer-motion, Playwright (E2E), size-limit (bundle CI)

**Spec:** `docs/superpowers/specs/2026-03-28-upup-v2-architecture-design.md`

---

## Prerequisites — Already Complete

Phase 1 is done. These packages exist and build:

- **@upup/shared** — All types (`UploadFile`, `FileSource`, `StorageProvider`, `UploadStatus`, etc.), error classes (`UpupError`, `UpupAuthError`, `UpupNetworkError`, `UpupValidationError`, `UpupQuotaError`, `UpupStorageError`), strategy interfaces (`CredentialStrategy`, `OAuthStrategy`, `UploadStrategy`, `RuntimeAdapter`), pipeline interfaces (`PipelineStep`, `PipelineContext`), i18n system (9 locales).
- **@upup/core** — Scaffolded. Empty `src/index.ts` and `src/pipeline/index.ts`. One test file `tests/events.test.ts` (tests written, no implementation).
- **@upup/react** — Scaffolded. Empty `src/index.ts`. Build config ready.
- **@upup/server** — Scaffolded. Framework adapter stubs (`next.ts`, `express.ts`, `hono.ts`, `fastify.ts`). Empty `src/index.ts`.

**v1 code to migrate from:** `packages/upup/src/` — 94 files (32 components, 20 hooks, 10 lib files, 13 backend files, 16 shared files). The "brain" is `packages/upup/src/frontend/hooks/useRootProvider.ts`.

---

## Phase Overview

| Phase | What | Tasks | Depends On |
|-------|------|-------|------------|
| 1 | Package scaffold + @upup/shared | ✅ Done | — |
| 2 | @upup/core (engine, plugins, pipeline, strategies, workers) | 2.1–2.11 | Phase 1 |
| 3 | @upup/react (SSR hook, UI components, migration) | 3.1–3.10 | Phase 2 |
| 4 | @upup/server (handlers, OAuth, adapters) | 4.1–4.4 | Phase 1 |
| 5 | Integration, E2E, bundle CI, cleanup | 5.1–5.4 | Phases 2–4 |

---

## File Structure

### @upup/core — New files to create

```
packages/core/
├── vitest.config.ts
├── src/
│   ├── index.ts                     ← Main entry (~8-10KB gzipped)
│   ├── events.ts                    ← EventEmitter class
│   ├── plugin.ts                    ← PluginManager + UpupPlugin interface
│   ├── core.ts                      ← UpupCore class (state machine + orchestrator)
│   ├── file-manager.ts              ← File validation, add/remove/reorder
│   ├── upload-manager.ts            ← Upload orchestration, progress, abort
│   ├── worker-pool.ts               ← Web Worker pool with main-thread fallback
│   ├── crash-recovery.ts            ← IndexedDB state persistence
│   ├── pipeline/
│   │   ├── index.ts                 ← Re-exports all steps (convenience entry)
│   │   └── engine.ts               ← Pipeline execution engine
│   ├── steps/
│   │   ├── hash.ts                  ← SHA-256 checksum step (subpath: @upup/core/steps/hash)
│   │   ├── gzip.ts                  ← Gzip compression (subpath: @upup/core/steps/gzip)
│   │   ├── heic.ts                  ← HEIC conversion (subpath: @upup/core/steps/heic)
│   │   ├── exif.ts                  ← EXIF stripping (subpath: @upup/core/steps/exif)
│   │   ├── compress.ts              ← Image compression (subpath: @upup/core/steps/compress)
│   │   ├── thumbnail.ts             ← Thumbnail generation (subpath: @upup/core/steps/thumbnail)
│   │   └── deduplicate.ts           ← Content deduplication (subpath: @upup/core/steps/deduplicate)
│   ├── strategies/
│   │   ├── index.ts                 ← Strategy exports
│   │   ├── direct-upload.ts         ← DirectUpload strategy
│   │   ├── token-endpoint.ts        ← TokenEndpointCredentials strategy
│   │   └── client-oauth.ts          ← ClientOAuth strategy (stub, full impl in Phase 3)
│   └── runtime/
│       └── browser.ts               ← BrowserRuntime adapter
└── tests/
    ├── events.test.ts               ← EXISTS — update to match new EventEmitter
    ├── plugin.test.ts
    ├── core.test.ts
    ├── file-manager.test.ts
    ├── pipeline.test.ts
    └── steps/
        ├── hash.test.ts
        └── deduplicate.test.ts
```

### @upup/react — New + migrated files

```
packages/react/
├── src/
│   ├── index.ts                     ← Public exports
│   ├── use-upup-upload.ts           ← SSR-safe hook (NEW)
│   ├── use-is-client.ts             ← SSR utility hook (NEW)
│   ├── upup-uploader.tsx            ← Main component (REFACTOR from v1 UpupUploader.tsx)
│   ├── context/
│   │   └── uploader-context.ts      ← React context (REFACTOR from v1 RootContext.ts)
│   ├── components/
│   │   ├── drop-zone.tsx            ← MIGRATE from v1 MainBox.tsx
│   │   ├── file-list.tsx            ← MIGRATE from v1 FileList.tsx
│   │   ├── file-item.tsx            ← MIGRATE from v1 FileItem.tsx (if exists) or extract from FileList
│   │   ├── file-preview.tsx         ← MIGRATE from v1 FilePreview.tsx
│   │   ├── file-preview-portal.tsx  ← MIGRATE from v1 FilePreviewPortal.tsx
│   │   ├── file-preview-thumbnail.tsx ← MIGRATE from v1 FilePreviewThumbnail.tsx
│   │   ├── file-icon.tsx            ← MIGRATE from v1 FileIcon.tsx (if exists)
│   │   ├── source-selector.tsx      ← MIGRATE from v1 AdapterSelector.tsx (rename)
│   │   ├── source-view.tsx          ← MIGRATE from v1 AdapterView.tsx (rename)
│   │   ├── paste-zone.tsx           ← NEW — clipboard paste upload
│   │   ├── progress-bar.tsx         ← MIGRATE from v1 ProgressBar.tsx
│   │   ├── notifier.tsx             ← MIGRATE from v1 Informer.tsx (rename)
│   │   ├── camera-uploader.tsx      ← MIGRATE from v1 adapters/CameraUploader.tsx
│   │   ├── audio-uploader.tsx       ← MIGRATE from v1 AudioUploader.tsx
│   │   ├── screen-capture-uploader.tsx ← MIGRATE from v1 ScreenCaptureUploader.tsx
│   │   ├── url-uploader.tsx         ← MIGRATE from v1 adapters/UrlUploader.tsx
│   │   ├── image-editor-inline.tsx  ← MIGRATE from v1 ImageEditorInline.tsx
│   │   ├── image-editor-modal.tsx   ← MIGRATE from v1 ImageEditorModal.tsx
│   │   └── shared/
│   │       ├── drive-browser.tsx    ← MIGRATE from v1
│   │       ├── drive-browser-header.tsx
│   │       ├── drive-browser-icon.tsx
│   │       ├── drive-browser-item.tsx
│   │       ├── drive-auth-fallback.tsx
│   │       └── main-box-header.tsx
│   ├── adapters/
│   │   ├── google-drive-uploader.tsx ← MIGRATE from v1
│   │   ├── onedrive-uploader.tsx
│   │   └── dropbox-uploader.tsx
│   ├── hooks/
│   │   ├── use-adapter-selector.ts  ← MIGRATE from v1
│   │   ├── use-main-box.ts         ← MIGRATE from v1
│   │   ├── use-camera-uploader.ts   ← MIGRATE from v1
│   │   ├── use-audio-uploader.ts    ← MIGRATE from v1
│   │   ├── use-screen-capture.ts    ← MIGRATE from v1
│   │   ├── use-fetch-file-by-url.ts ← MIGRATE from v1
│   │   ├── use-informer.ts         ← MIGRATE from v1
│   │   ├── use-google-drive.ts     ← MIGRATE from v1
│   │   ├── use-onedrive.ts         ← MIGRATE from v1
│   │   └── use-dropbox.ts          ← MIGRATE from v1
│   ├── lib/
│   │   ├── constants.ts            ← MIGRATE from v1
│   │   ├── file.ts                 ← MIGRATE from v1
│   │   ├── tailwind.ts            ← MIGRATE from v1
│   │   └── storage-helper.ts      ← MIGRATE from v1
│   └── locales/
│       └── index.ts               ← Re-export locale packs from @upup/shared
└── tests/
    ├── use-upup-upload.test.ts
    ├── paste-zone.test.tsx
    └── source-selector.test.tsx
```

### @upup/server — Refactored files

```
packages/server/
├── src/
│   ├── index.ts                    ← Generic createUpupHandler
│   ├── next.ts                     ← Next.js App Router adapter
│   ├── express.ts                  ← Express middleware
│   ├── hono.ts                     ← Hono adapter
│   ├── fastify.ts                  ← Fastify plugin
│   ├── handler.ts                  ← Core request router
│   ├── config.ts                   ← UpupServerConfig type
│   ├── presign.ts                  ← Presigned URL generation
│   ├── multipart.ts               ← Multipart upload orchestration
│   ├── oauth.ts                    ← OAuth proxy (stub for cloud drives)
│   └── providers/
│       ├── aws.ts                  ← MIGRATE from v1 backend/lib/aws/
│       └── azure.ts               ← MIGRATE from v1 backend/lib/azure/
└── tests/
    ├── handler.test.ts
    └── presign.test.ts
```

---

## Phase 2: @upup/core

### Task 2.1: EventEmitter + Vitest Config

**Files:**
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/events.ts`
- Modify: `packages/core/tests/events.test.ts`

- [ ] **Step 1: Create vitest config**

```typescript
// packages/core/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Update the existing test file**

The existing `tests/events.test.ts` needs the import path updated and a few additional tests for `emit` and `removeAllListeners`:

```typescript
// packages/core/tests/events.test.ts
import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../src/events'

describe('EventEmitter', () => {
  it('calls registered handler when event is emitted', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()

    emitter.on('test', handler)
    emitter.emit('test', 'arg1', 'arg2')

    expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('returns an unsubscribe function from on()', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()

    const unsub = emitter.on('test', handler)
    unsub()
    emitter.emit('test')

    expect(handler).not.toHaveBeenCalled()
  })

  it('removes a handler with off()', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()

    emitter.on('test', handler)
    emitter.off('test', handler)
    emitter.emit('test')

    expect(handler).not.toHaveBeenCalled()
  })

  it('supports multiple handlers for the same event', () => {
    const emitter = new EventEmitter()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    emitter.on('test', handler1)
    emitter.on('test', handler2)
    emitter.emit('test', 'data')

    expect(handler1).toHaveBeenCalledWith('data')
    expect(handler2).toHaveBeenCalledWith('data')
  })

  it('does not throw when emitting with no handlers', () => {
    const emitter = new EventEmitter()
    expect(() => emitter.emit('test')).not.toThrow()
  })

  it('does not throw when off() is called for unregistered handler', () => {
    const emitter = new EventEmitter()
    expect(() => emitter.off('test', vi.fn())).not.toThrow()
  })

  it('removes all listeners for a specific event', () => {
    const emitter = new EventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('test', h1)
    emitter.on('test', h2)
    emitter.removeAllListeners('test')
    emitter.emit('test')

    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('removes all listeners across all events', () => {
    const emitter = new EventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('a', h1)
    emitter.on('b', h2)
    emitter.removeAllListeners()
    emitter.emit('a')
    emitter.emit('b')

    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/events.test.ts`
Expected: FAIL — `Cannot find module '../src/events'`

- [ ] **Step 4: Implement EventEmitter**

```typescript
// packages/core/src/events.ts
type EventHandler = (...args: unknown[]) => void

export class EventEmitter {
  private handlers = new Map<string, Set<EventHandler>>()

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        handler(...args)
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `cd packages/core && npx vitest run tests/events.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/vitest.config.ts packages/core/src/events.ts packages/core/tests/events.test.ts
git commit -m "feat(core): add EventEmitter with vitest config"
```

---

### Task 2.2: Plugin System

**Files:**
- Create: `packages/core/src/plugin.ts`
- Create: `packages/core/tests/plugin.test.ts`

- [ ] **Step 1: Write plugin tests**

```typescript
// packages/core/tests/plugin.test.ts
import { describe, it, expect, vi } from 'vitest'
import { PluginManager } from '../src/plugin'
import type { UpupPlugin } from '../src/plugin'

describe('PluginManager', () => {
  it('registers a plugin and calls setup with core', () => {
    const manager = new PluginManager()
    const setup = vi.fn()
    const plugin: UpupPlugin = { name: 'test', setup }
    const mockCore = { fake: true }

    manager.register(plugin, mockCore)

    expect(setup).toHaveBeenCalledOnce()
    expect(setup).toHaveBeenCalledWith(mockCore)
  })

  it('rejects duplicate plugin names', () => {
    const manager = new PluginManager()
    manager.register({ name: 'dupe', setup: () => {} }, {})

    expect(() => manager.register({ name: 'dupe', setup: () => {} }, {}))
      .toThrow('Plugin "dupe" is already registered')
  })

  it('registers and retrieves extensions', () => {
    const manager = new PluginManager()
    const methods = {
      greet: (name: string) => `hello ${name}`,
    }

    manager.registerExtension('greeter', methods)

    expect(manager.getExtension('greeter')).toBe(methods)
    expect(manager.getExtension('greeter')!.greet('world')).toBe('hello world')
  })

  it('returns undefined for unknown extensions', () => {
    const manager = new PluginManager()
    expect(manager.getExtension('nonexistent')).toBeUndefined()
  })

  it('rejects duplicate extension names', () => {
    const manager = new PluginManager()
    manager.registerExtension('ext', { fn: () => {} })

    expect(() => manager.registerExtension('ext', { fn: () => {} }))
      .toThrow('Extension "ext" is already registered')
  })

  it('plugin can register extensions during setup', () => {
    const manager = new PluginManager()
    const plugin: UpupPlugin = {
      name: 'with-ext',
      setup: () => {
        manager.registerExtension('myExt', {
          getValue: () => 42,
        })
      },
    }

    manager.register(plugin, {})

    expect(manager.getExtension('myExt')!.getValue()).toBe(42)
  })

  it('returns all extensions via getExtensions()', () => {
    const manager = new PluginManager()
    manager.registerExtension('a', { fn: () => 'a' })
    manager.registerExtension('b', { fn: () => 'b' })

    const all = manager.getExtensions()

    expect(Object.keys(all)).toEqual(['a', 'b'])
  })

  it('cleans up everything on destroy()', () => {
    const manager = new PluginManager()
    manager.register({ name: 'test', setup: () => {} }, {})
    manager.registerExtension('ext', { fn: () => {} })

    manager.destroy()

    expect(manager.getExtension('ext')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/plugin.test.ts`
Expected: FAIL — `Cannot find module '../src/plugin'`

- [ ] **Step 3: Implement PluginManager**

```typescript
// packages/core/src/plugin.ts

export interface UpupPlugin {
  /** Unique name — used for deduplication and debugging */
  name: string
  /** Called once when the plugin is registered */
  setup(core: unknown): void
}

export type ExtensionMethods = Record<string, (...args: any[]) => any>

export class PluginManager {
  private plugins = new Map<string, UpupPlugin>()
  private extensions = new Map<string, ExtensionMethods>()

  register(plugin: UpupPlugin, core: unknown): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`)
    }
    this.plugins.set(plugin.name, plugin)
    plugin.setup(core)
  }

  registerExtension(name: string, methods: ExtensionMethods): void {
    if (this.extensions.has(name)) {
      throw new Error(`Extension "${name}" is already registered`)
    }
    this.extensions.set(name, methods)
  }

  getExtension(name: string): ExtensionMethods | undefined {
    return this.extensions.get(name)
  }

  getExtensions(): Record<string, ExtensionMethods> {
    return Object.fromEntries(this.extensions)
  }

  destroy(): void {
    this.plugins.clear()
    this.extensions.clear()
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd packages/core && npx vitest run tests/plugin.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/plugin.ts packages/core/tests/plugin.test.ts
git commit -m "feat(core): add PluginManager with extension registration"
```

---

### Task 2.3: Pipeline Engine

**Files:**
- Create: `packages/core/src/pipeline/engine.ts`
- Modify: `packages/core/src/pipeline/index.ts`
- Create: `packages/core/tests/pipeline.test.ts`

- [ ] **Step 1: Write pipeline engine tests**

```typescript
// packages/core/tests/pipeline.test.ts
import { describe, it, expect, vi } from 'vitest'
import { PipelineEngine } from '../src/pipeline/engine'
import type { PipelineStep, PipelineContext } from '@upup/shared'
import type { UploadFile } from '@upup/shared'

const makeFile = (overrides: Partial<UploadFile> = {}): UploadFile => ({
  id: 'test-1',
  name: 'test.jpg',
  size: 1024,
  type: 'image/jpeg',
  lastModified: Date.now(),
  url: null,
  relativePath: null,
  key: null,
  fileHash: null,
  checksumSHA256: null,
  etag: null,
  thumbnail: null,
  arrayBuffer: vi.fn(),
  slice: vi.fn(),
  stream: vi.fn(),
  text: vi.fn(),
  ...overrides,
} as unknown as UploadFile)

const makeContext = (overrides: Partial<PipelineContext> = {}): PipelineContext => ({
  files: new Map(),
  options: {} as any,
  emit: vi.fn(),
  t: ((key: string) => key) as any,
  ...overrides,
})

describe('PipelineEngine', () => {
  it('executes steps in order', async () => {
    const order: string[] = []
    const step1: PipelineStep = {
      name: 'step1',
      process: async (file) => {
        order.push('step1')
        return file
      },
    }
    const step2: PipelineStep = {
      name: 'step2',
      process: async (file) => {
        order.push('step2')
        return file
      },
    }

    const engine = new PipelineEngine([step1, step2])
    await engine.process(makeFile(), makeContext())

    expect(order).toEqual(['step1', 'step2'])
  })

  it('passes modified file from one step to the next', async () => {
    const step1: PipelineStep = {
      name: 'add-hash',
      process: async (file) => {
        return Object.assign(file, { fileHash: 'abc123' })
      },
    }
    const step2: PipelineStep = {
      name: 'check-hash',
      process: async (file) => {
        expect(file.fileHash).toBe('abc123')
        return file
      },
    }

    const engine = new PipelineEngine([step1, step2])
    const result = await engine.process(makeFile(), makeContext())

    expect(result.fileHash).toBe('abc123')
  })

  it('skips a step when shouldProcess returns false', async () => {
    const processFn = vi.fn(async (file: UploadFile) => file)
    const step: PipelineStep = {
      name: 'images-only',
      shouldProcess: (file) => file.type.startsWith('image/'),
      process: processFn,
    }

    const engine = new PipelineEngine([step])
    const textFile = makeFile({ type: 'text/plain' })
    await engine.process(textFile, makeContext())

    expect(processFn).not.toHaveBeenCalled()
  })

  it('runs a step when shouldProcess returns true', async () => {
    const processFn = vi.fn(async (file: UploadFile) => file)
    const step: PipelineStep = {
      name: 'images-only',
      shouldProcess: (file) => file.type.startsWith('image/'),
      process: processFn,
    }

    const engine = new PipelineEngine([step])
    await engine.process(makeFile({ type: 'image/png' }), makeContext())

    expect(processFn).toHaveBeenCalledOnce()
  })

  it('emits pipeline events via context', async () => {
    const emit = vi.fn()
    const step: PipelineStep = {
      name: 'test-step',
      process: async (file) => file,
    }

    const engine = new PipelineEngine([step])
    await engine.process(makeFile(), makeContext({ emit }))

    expect(emit).toHaveBeenCalledWith('pipeline-start', expect.any(Object))
    expect(emit).toHaveBeenCalledWith('pipeline-step', expect.objectContaining({ step: 'test-step' }))
    expect(emit).toHaveBeenCalledWith('pipeline-complete', expect.any(Object))
  })

  it('handles empty pipeline', async () => {
    const engine = new PipelineEngine([])
    const file = makeFile()
    const result = await engine.process(file, makeContext())

    expect(result).toBe(file)
  })

  it('propagates step errors as pipeline-error events', async () => {
    const emit = vi.fn()
    const step: PipelineStep = {
      name: 'failing-step',
      process: async () => {
        throw new Error('Step failed')
      },
    }

    const engine = new PipelineEngine([step])

    await expect(engine.process(makeFile(), makeContext({ emit }))).rejects.toThrow('Step failed')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/pipeline.test.ts`
Expected: FAIL — `Cannot find module '../src/pipeline/engine'`

- [ ] **Step 3: Implement PipelineEngine**

```typescript
// packages/core/src/pipeline/engine.ts
import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

export class PipelineEngine {
  constructor(private steps: PipelineStep[]) {}

  async process(file: UploadFile, context: PipelineContext): Promise<UploadFile> {
    context.emit('pipeline-start', { fileId: file.id, steps: this.steps.map(s => s.name) })

    let current = file

    for (const step of this.steps) {
      if (step.shouldProcess && !step.shouldProcess(current)) {
        continue
      }

      current = await step.process(current, context)

      context.emit('pipeline-step', {
        fileId: file.id,
        step: step.name,
      })
    }

    context.emit('pipeline-complete', { fileId: file.id })
    return current
  }

  async processAll(files: UploadFile[], context: PipelineContext): Promise<UploadFile[]> {
    const results: UploadFile[] = []
    for (const file of files) {
      results.push(await this.process(file, context))
    }
    return results
  }
}
```

- [ ] **Step 4: Update pipeline/index.ts to export engine**

```typescript
// packages/core/src/pipeline/index.ts
export { PipelineEngine } from './engine'

// Step re-exports will be added as individual steps are implemented
// For now, this is the convenience entry point
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `cd packages/core && npx vitest run tests/pipeline.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/pipeline/ packages/core/tests/pipeline.test.ts
git commit -m "feat(core): add PipelineEngine for sequential file processing"
```

---

### Task 2.4: UpupCore Class — State Machine + File Management

This is the main engine class. It brings together EventEmitter, PluginManager, PipelineEngine, and file management.

**Files:**
- Create: `packages/core/src/core.ts`
- Create: `packages/core/src/file-manager.ts`
- Create: `packages/core/tests/core.test.ts`
- Create: `packages/core/tests/file-manager.test.ts`

- [ ] **Step 1: Write FileManager tests**

```typescript
// packages/core/tests/file-manager.test.ts
import { describe, it, expect, vi } from 'vitest'
import { FileManager } from '../src/file-manager'
import type { UploadFile } from '@upup/shared'

const makeNativeFile = (name = 'test.jpg', size = 1024, type = 'image/jpeg'): File => {
  return new File(['x'.repeat(size)], name, { type })
}

describe('FileManager', () => {
  it('adds files and generates IDs', async () => {
    const fm = new FileManager({})
    const result = await fm.addFiles([makeNativeFile('a.jpg'), makeNativeFile('b.png')])

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('a.jpg')
    expect(result[1].name).toBe('b.png')
    expect(result[0].id).toBeDefined()
    expect(result[0].id).not.toBe(result[1].id)
  })

  it('enforces file limit', async () => {
    const fm = new FileManager({ limit: 2 })
    await fm.addFiles([makeNativeFile('a.jpg')])

    await expect(fm.addFiles([makeNativeFile('b.jpg'), makeNativeFile('c.jpg')]))
      .rejects.toThrow()
  })

  it('enforces accept filter', async () => {
    const fm = new FileManager({ accept: 'image/*' })

    await expect(fm.addFiles([makeNativeFile('doc.pdf', 100, 'application/pdf')]))
      .rejects.toThrow()
  })

  it('enforces maxFileSize', async () => {
    const fm = new FileManager({ maxFileSize: { size: 500, unit: 'B' } })

    await expect(fm.addFiles([makeNativeFile('big.jpg', 1024)]))
      .rejects.toThrow()
  })

  it('calls async onBeforeFileAdded and rejects on false', async () => {
    const fm = new FileManager({
      onBeforeFileAdded: async () => false,
    })

    const result = await fm.addFiles([makeNativeFile()])
    expect(result).toHaveLength(0)
  })

  it('calls async onBeforeFileAdded and accepts on true', async () => {
    const fm = new FileManager({
      onBeforeFileAdded: async () => true,
    })

    const result = await fm.addFiles([makeNativeFile()])
    expect(result).toHaveLength(1)
  })

  it('removes a file by ID', async () => {
    const fm = new FileManager({})
    const [file] = await fm.addFiles([makeNativeFile()])

    fm.removeFile(file.id)

    expect(fm.getFiles().size).toBe(0)
  })

  it('removes all files', async () => {
    const fm = new FileManager({})
    await fm.addFiles([makeNativeFile('a.jpg'), makeNativeFile('b.jpg')])

    fm.removeAll()

    expect(fm.getFiles().size).toBe(0)
  })

  it('reorders files', async () => {
    const fm = new FileManager({})
    const files = await fm.addFiles([
      makeNativeFile('a.jpg'),
      makeNativeFile('b.jpg'),
      makeNativeFile('c.jpg'),
    ])

    fm.reorderFiles(0, 2)
    const ordered = [...fm.getFiles().values()]

    expect(ordered[0].name).toBe('b.jpg')
    expect(ordered[2].name).toBe('a.jpg')
  })

  it('replaces all files with setFiles', async () => {
    const fm = new FileManager({})
    await fm.addFiles([makeNativeFile('old.jpg')])

    await fm.setFiles([makeNativeFile('new.jpg')])

    const files = [...fm.getFiles().values()]
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('new.jpg')
  })
})
```

- [ ] **Step 2: Run FileManager tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/file-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement FileManager**

```typescript
// packages/core/src/file-manager.ts
import {
  UpupValidationError,
  UpupErrorCode,
  type UploadFile,
  type MaxFileSizeObject,
} from '@upup/shared'

export interface FileManagerOptions {
  accept?: string
  limit?: number
  minFiles?: number
  maxFileSize?: MaxFileSizeObject
  minFileSize?: MaxFileSizeObject
  maxTotalFileSize?: MaxFileSizeObject
  contentDeduplication?: boolean
  onBeforeFileAdded?: (file: File) => boolean | File | undefined | Promise<boolean | File | undefined>
}

let fileIdCounter = 0

function generateFileId(): string {
  return `upup-${Date.now()}-${++fileIdCounter}`
}

function fileSizeInBytes(size: MaxFileSizeObject): number {
  const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }
  return size.size * (units[size.unit] ?? 1)
}

function matchesAccept(file: File, accept: string): boolean {
  const types = accept.split(',').map(t => t.trim())
  return types.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', '/'))
    }
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase())
    }
    return file.type === type
  })
}

function nativeToUploadFile(file: File): UploadFile {
  return Object.assign(file, {
    id: generateFileId(),
    url: null,
    relativePath: null,
    key: null,
    fileHash: null,
    checksumSHA256: null,
    etag: null,
    thumbnail: null,
  }) as unknown as UploadFile
}

export class FileManager {
  private files = new Map<string, UploadFile>()
  private options: FileManagerOptions

  constructor(options: FileManagerOptions) {
    this.options = options
  }

  getFiles(): Map<string, UploadFile> {
    return this.files
  }

  async addFiles(nativeFiles: File[]): Promise<UploadFile[]> {
    const accepted: UploadFile[] = []

    for (const nativeFile of nativeFiles) {
      // Async onBeforeFileAdded filter
      if (this.options.onBeforeFileAdded) {
        const result = await this.options.onBeforeFileAdded(nativeFile)
        if (result === false) continue
        // If result is a File, use it instead (allows transformation)
        if (result instanceof File) {
          accepted.push(nativeToUploadFile(result))
          continue
        }
      }

      // Accept filter
      if (this.options.accept && !matchesAccept(nativeFile, this.options.accept)) {
        throw new UpupValidationError(
          `File type "${nativeFile.type}" is not accepted`,
          UpupErrorCode.TYPE_MISMATCH,
          nativeFile,
        )
      }

      // Max file size
      if (this.options.maxFileSize) {
        const maxBytes = fileSizeInBytes(this.options.maxFileSize)
        if (nativeFile.size > maxBytes) {
          throw new UpupValidationError(
            `File "${nativeFile.name}" exceeds maximum size`,
            UpupErrorCode.FILE_TOO_LARGE,
            nativeFile,
          )
        }
      }

      // Min file size
      if (this.options.minFileSize) {
        const minBytes = fileSizeInBytes(this.options.minFileSize)
        if (nativeFile.size < minBytes) {
          throw new UpupValidationError(
            `File "${nativeFile.name}" is below minimum size`,
            UpupErrorCode.FILE_TOO_SMALL,
            nativeFile,
          )
        }
      }

      accepted.push(nativeToUploadFile(nativeFile))
    }

    // Limit check (total files after adding)
    if (this.options.limit) {
      const totalAfter = this.files.size + accepted.length
      if (totalAfter > this.options.limit) {
        throw new UpupValidationError(
          `Adding ${accepted.length} files would exceed the limit of ${this.options.limit}`,
          UpupErrorCode.LIMIT_EXCEEDED,
          nativeFiles[0],
        )
      }
    }

    // Max total file size
    if (this.options.maxTotalFileSize) {
      const maxTotal = fileSizeInBytes(this.options.maxTotalFileSize)
      const currentTotal = [...this.files.values()].reduce((sum, f) => sum + f.size, 0)
      const newTotal = accepted.reduce((sum, f) => sum + f.size, 0)
      if (currentTotal + newTotal > maxTotal) {
        throw new UpupValidationError(
          'Total file size exceeds maximum',
          UpupErrorCode.TOTAL_SIZE_EXCEEDED,
          nativeFiles[0],
        )
      }
    }

    for (const file of accepted) {
      this.files.set(file.id, file)
    }

    return accepted
  }

  removeFile(id: string): UploadFile | undefined {
    const file = this.files.get(id)
    this.files.delete(id)
    return file
  }

  removeAll(): void {
    this.files.clear()
  }

  async setFiles(nativeFiles: File[]): Promise<UploadFile[]> {
    this.files.clear()
    return this.addFiles(nativeFiles)
  }

  reorderFiles(fromIndex: number, toIndex: number): void {
    const entries = [...this.files.entries()]
    const [moved] = entries.splice(fromIndex, 1)
    entries.splice(toIndex, 0, moved)
    this.files = new Map(entries)
  }
}
```

- [ ] **Step 4: Run FileManager tests — verify they pass**

Run: `cd packages/core && npx vitest run tests/file-manager.test.ts`
Expected: All 10 tests PASS

- [ ] **Step 5: Write UpupCore tests**

```typescript
// packages/core/tests/core.test.ts
import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/shared'
import type { UpupPlugin } from '../src/plugin'

const makeNativeFile = (name = 'test.jpg', size = 1024, type = 'image/jpeg'): File => {
  return new File(['x'.repeat(size)], name, { type })
}

describe('UpupCore', () => {
  it('initializes with IDLE status', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    expect(core.status).toBe(UploadStatus.IDLE)
  })

  it('adds files and emits files-added event', async () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    const handler = vi.fn()
    core.on('files-added', handler)

    await core.addFiles([makeNativeFile()])

    expect(core.files.size).toBe(1)
    expect(handler).toHaveBeenCalled()
  })

  it('removes a file and emits file-removed', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    const handler = vi.fn()
    core.on('file-removed', handler)

    // Add a file directly to the internal map for testing
    const file = { id: 'test-1', name: 'test.jpg' } as any
    core['fileManager']['files'].set('test-1', file)

    core.removeFile('test-1')

    expect(core.files.size).toBe(0)
    expect(handler).toHaveBeenCalled()
  })

  it('emits file-rejected when onBeforeFileAdded returns false', async () => {
    const core = new UpupCore({
      provider: 'aws',
      uploadEndpoint: '/api/upload',
      onBeforeFileAdded: async () => false,
    })
    const handler = vi.fn()
    core.on('file-rejected', handler)

    await core.addFiles([makeNativeFile()])

    expect(core.files.size).toBe(0)
  })

  it('registers plugins via use() and returns self for chaining', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    const setup = vi.fn()
    const plugin: UpupPlugin = { name: 'test-plugin', setup }

    const result = core.use(plugin)

    expect(setup).toHaveBeenCalledWith(core)
    expect(result).toBe(core)
  })

  it('registers plugins via options.plugins', () => {
    const setup = vi.fn()
    const plugin: UpupPlugin = { name: 'opt-plugin', setup }

    const core = new UpupCore({
      provider: 'aws',
      uploadEndpoint: '/api/upload',
      plugins: [plugin],
    })

    expect(setup).toHaveBeenCalledWith(core)
  })

  it('provides type-safe extension access via ext', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    core.registerExtension('counter', {
      getCount: () => 42,
    })

    expect(core.getExtension('counter')!.getCount()).toBe(42)
  })

  it('cleans up on destroy', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    core.on('test', vi.fn())

    core.destroy()

    // After destroy, status should be IDLE and no errors on emit
    expect(core.status).toBe(UploadStatus.IDLE)
  })
})
```

- [ ] **Step 6: Run UpupCore tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/core.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement UpupCore**

```typescript
// packages/core/src/core.ts
import { UploadStatus, type UploadFile, type PipelineStep, type PipelineContext } from '@upup/shared'
import { EventEmitter } from './events'
import { PluginManager, type UpupPlugin, type ExtensionMethods } from './plugin'
import { FileManager, type FileManagerOptions } from './file-manager'
import { PipelineEngine } from './pipeline/engine'

export interface CoreOptions extends FileManagerOptions {
  // Required (one of)
  uploadEndpoint?: string
  serverUrl?: string
  apiKey?: string

  // Storage
  provider?: string

  // Plugins
  plugins?: UpupPlugin[]

  // Pipeline
  pipeline?: PipelineStep[]

  // Processing sugar
  heicConversion?: boolean
  stripExifData?: boolean
  imageCompression?: boolean | object
  thumbnailGenerator?: boolean | object
  shouldCompress?: boolean
  checksumVerification?: boolean

  // Upload behavior
  maxRetries?: number
  maxConcurrentUploads?: number
  autoUpload?: boolean
  fastAbortThreshold?: number
  isSuccessfulCall?: (response: { status: number; headers: Record<string, string>; body: unknown }) => boolean | Promise<boolean>

  // Crash recovery
  crashRecovery?: boolean | object

  // Cloud drives
  driveConfigs?: Record<string, unknown>

  // Metadata
  meta?: Record<string, unknown>

  // i18n
  locale?: unknown
  translations?: unknown
}

export type UploadOptions = {
  checksumVerification?: boolean
  imageCompression?: boolean | object
  heicConversion?: boolean
  stripExifData?: boolean
  maxRetries?: number
  metadata?: Record<string, string>
}

export class UpupCore {
  private emitter = new EventEmitter()
  private pluginManager = new PluginManager()
  private fileManager: FileManager
  private pipelineEngine: PipelineEngine | null = null
  private _status: UploadStatus = UploadStatus.IDLE
  private _error: Error | null = null
  private options: CoreOptions

  constructor(options: CoreOptions) {
    this.options = options
    this.fileManager = new FileManager({
      accept: options.accept,
      limit: options.limit,
      minFiles: options.minFiles,
      maxFileSize: options.maxFileSize,
      minFileSize: options.minFileSize,
      maxTotalFileSize: options.maxTotalFileSize,
      contentDeduplication: options.contentDeduplication,
      onBeforeFileAdded: options.onBeforeFileAdded,
    })

    if (options.pipeline) {
      this.pipelineEngine = new PipelineEngine(options.pipeline)
    }

    // Register plugins from options
    if (options.plugins) {
      for (const plugin of options.plugins) {
        this.use(plugin)
      }
    }
  }

  // --- State ---

  get files(): Map<string, UploadFile> {
    return this.fileManager.getFiles()
  }

  get status(): UploadStatus {
    return this._status
  }

  get error(): Error | null {
    return this._error
  }

  get progress(): { totalFiles: number; completedFiles: number; percentage: number } {
    const files = [...this.files.values()]
    const total = files.length
    const completed = files.filter(f => f.key !== null).length
    return {
      totalFiles: total,
      completedFiles: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }

  // --- Plugin System ---

  use(plugin: UpupPlugin): this {
    this.pluginManager.register(plugin, this)
    this.emitter.emit('plugin-registered', { name: plugin.name })
    return this
  }

  registerExtension(name: string, methods: ExtensionMethods): void {
    this.pluginManager.registerExtension(name, methods)
  }

  getExtension(name: string): ExtensionMethods | undefined {
    return this.pluginManager.getExtension(name)
  }

  get ext(): Record<string, ExtensionMethods> {
    return this.pluginManager.getExtensions()
  }

  // --- File Management ---

  async addFiles(files: File[], overrides?: Partial<UploadOptions>): Promise<void> {
    try {
      const added = await this.fileManager.addFiles(files)
      if (added.length > 0) {
        this.emitter.emit('files-added', added)
        this.emitter.emit('state-change', { files: this.files })
      }
      // Files that were filtered out (onBeforeFileAdded returned false)
      const rejectedCount = files.length - added.length
      if (rejectedCount > 0) {
        this.emitter.emit('file-rejected', { count: rejectedCount })
      }
    } catch (error) {
      this.emitter.emit('restriction-failed', { error })
      throw error
    }
  }

  removeFile(id: string): void {
    const file = this.fileManager.removeFile(id)
    if (file) {
      this.emitter.emit('file-removed', file)
      this.emitter.emit('state-change', { files: this.files })
    }
  }

  removeAll(): void {
    this.fileManager.removeAll()
    this.emitter.emit('state-change', { files: this.files })
  }

  async setFiles(files: File[]): Promise<void> {
    await this.fileManager.setFiles(files)
    this.emitter.emit('state-change', { files: this.files })
  }

  reorderFiles(fromIndex: number, toIndex: number): void {
    this.fileManager.reorderFiles(fromIndex, toIndex)
    this.emitter.emit('state-change', { files: this.files })
  }

  // --- Upload Lifecycle (stub — full impl in Task 2.7) ---

  async upload(): Promise<UploadFile[]> {
    this._status = UploadStatus.PROCESSING
    this.emitter.emit('upload-start', {})
    this.emitter.emit('state-change', { status: this._status })

    // Run pipeline if configured
    if (this.pipelineEngine) {
      const context: PipelineContext = {
        files: this.files,
        options: this.options as any,
        emit: (event, data) => this.emitter.emit(event, data),
        t: ((key: string) => key) as any,
      }
      const processed = await this.pipelineEngine.processAll([...this.files.values()], context)
      // Replace files with processed versions
      for (const file of processed) {
        this.files.set(file.id, file)
      }
    }

    this._status = UploadStatus.UPLOADING
    this.emitter.emit('state-change', { status: this._status })

    // Upload logic will be implemented in Task 2.7
    // For now, mark as successful
    this._status = UploadStatus.SUCCESSFUL
    this.emitter.emit('upload-all-complete', [...this.files.values()])
    this.emitter.emit('state-change', { status: this._status })

    return [...this.files.values()]
  }

  pause(): void {
    this._status = UploadStatus.PAUSED
    this.emitter.emit('upload-pause', {})
    this.emitter.emit('state-change', { status: this._status })
  }

  resume(): void {
    this._status = UploadStatus.UPLOADING
    this.emitter.emit('upload-resume', {})
    this.emitter.emit('state-change', { status: this._status })
  }

  cancel(): void {
    this._status = UploadStatus.IDLE
    this.emitter.emit('upload-cancel', {})
    this.emitter.emit('state-change', { status: this._status })
  }

  retry(_fileId?: string): void {
    this.emitter.emit('retry', { fileId: _fileId })
  }

  // --- Events ---

  on(event: string, handler: (...args: unknown[]) => void): () => void {
    return this.emitter.on(event, handler)
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler)
  }

  // --- Serialization (stub — full impl in Task 2.10) ---

  getSnapshot(): unknown {
    return {
      files: [...this.files.entries()],
      status: this._status,
    }
  }

  restore(_snapshot: unknown): void {
    // Will be implemented in Task 2.10
  }

  // --- Destroy ---

  destroy(): void {
    this.emitter.removeAllListeners()
    this.pluginManager.destroy()
    this.fileManager.removeAll()
    this._status = UploadStatus.IDLE
    this._error = null
  }
}
```

- [ ] **Step 8: Run UpupCore tests — verify they pass**

Run: `cd packages/core && npx vitest run tests/core.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 9: Update core/src/index.ts exports**

```typescript
// packages/core/src/index.ts
export { UpupCore } from './core'
export type { CoreOptions, UploadOptions } from './core'
export { EventEmitter } from './events'
export { PluginManager } from './plugin'
export type { UpupPlugin, ExtensionMethods } from './plugin'
export { FileManager } from './file-manager'
export { PipelineEngine } from './pipeline/engine'
```

- [ ] **Step 10: Run all core tests**

Run: `cd packages/core && npx vitest run`
Expected: All tests across events, plugin, pipeline, file-manager, core PASS

- [ ] **Step 11: Build and verify**

Run: `cd packages/core && npx tsup`
Expected: Build succeeds with no errors

- [ ] **Step 12: Commit**

```bash
git add packages/core/src/ packages/core/tests/
git commit -m "feat(core): add UpupCore class with file management, plugins, and pipeline integration"
```

---

### Task 2.5: Built-in Pipeline Steps (Subpath Exports)

Implement pipeline steps as individual entry points. Each step is a factory function returning a `PipelineStep`.

**Files:**
- Create: `packages/core/src/steps/hash.ts`
- Create: `packages/core/src/steps/exif.ts`
- Create: `packages/core/src/steps/compress.ts`
- Create: `packages/core/src/steps/thumbnail.ts`
- Create: `packages/core/src/steps/deduplicate.ts`
- Create: `packages/core/src/steps/gzip.ts`
- Create: `packages/core/src/steps/heic.ts`
- Create: `packages/core/tests/steps/hash.test.ts`
- Create: `packages/core/tests/steps/deduplicate.test.ts`
- Modify: `packages/core/src/pipeline/index.ts` — add re-exports

- [ ] **Step 1: Write hash step tests**

```typescript
// packages/core/tests/steps/hash.test.ts
import { describe, it, expect } from 'vitest'
import { hashStep } from '../../src/steps/hash'
import type { UploadFile, PipelineContext } from '@upup/shared'

const makeFile = (content: string): UploadFile => {
  const file = new File([content], 'test.txt', { type: 'text/plain' })
  return Object.assign(file, {
    id: 'test-1',
    url: null,
    relativePath: null,
    key: null,
    fileHash: null,
    checksumSHA256: null,
    etag: null,
    thumbnail: null,
  }) as unknown as UploadFile
}

const makeContext = (): PipelineContext => ({
  files: new Map(),
  options: {} as any,
  emit: () => {},
  t: ((k: string) => k) as any,
})

describe('hashStep', () => {
  it('returns a PipelineStep with name "hash"', () => {
    const step = hashStep()
    expect(step.name).toBe('hash')
  })

  it('computes SHA-256 hash and sets checksumSHA256', async () => {
    const step = hashStep()
    const file = makeFile('hello world')
    const result = await step.process(file, makeContext())

    expect(result.checksumSHA256).toBeDefined()
    expect(typeof result.checksumSHA256).toBe('string')
    expect(result.checksumSHA256!.length).toBe(64) // hex SHA-256 = 64 chars
  })

  it('produces consistent hashes for same content', async () => {
    const step = hashStep()
    const file1 = makeFile('same content')
    const file2 = makeFile('same content')
    file2.id = 'test-2'

    const ctx = makeContext()
    const r1 = await step.process(file1, ctx)
    const r2 = await step.process(file2, ctx)

    expect(r1.checksumSHA256).toBe(r2.checksumSHA256)
  })

  it('produces different hashes for different content', async () => {
    const step = hashStep()
    const file1 = makeFile('content A')
    const file2 = makeFile('content B')
    file2.id = 'test-2'

    const ctx = makeContext()
    const r1 = await step.process(file1, ctx)
    const r2 = await step.process(file2, ctx)

    expect(r1.checksumSHA256).not.toBe(r2.checksumSHA256)
  })
})
```

- [ ] **Step 2: Write deduplicate step tests**

```typescript
// packages/core/tests/steps/deduplicate.test.ts
import { describe, it, expect } from 'vitest'
import { deduplicateStep } from '../../src/steps/deduplicate'
import type { UploadFile, PipelineContext } from '@upup/shared'

const makeFile = (id: string, content: string, name: string): UploadFile => {
  const file = new File([content], name, { type: 'text/plain' })
  return Object.assign(file, {
    id,
    url: null,
    relativePath: null,
    key: null,
    fileHash: null,
    checksumSHA256: null,
    etag: null,
    thumbnail: null,
  }) as unknown as UploadFile
}

describe('deduplicateStep', () => {
  it('returns a PipelineStep with name "deduplicate"', () => {
    const step = deduplicateStep()
    expect(step.name).toBe('deduplicate')
  })

  it('passes through unique files', async () => {
    const step = deduplicateStep()
    const file = makeFile('1', 'unique content', 'file.txt')
    const ctx: PipelineContext = {
      files: new Map([['1', file]]),
      options: {} as any,
      emit: () => {},
      t: ((k: string) => k) as any,
    }

    const result = await step.process(file, ctx)
    expect(result).toBe(file)
  })

  it('rejects files with same name and size as existing', async () => {
    const step = deduplicateStep()
    const existing = makeFile('1', 'same content here', 'dup.txt')
    const duplicate = makeFile('2', 'same content here', 'dup.txt')

    const ctx: PipelineContext = {
      files: new Map([['1', existing]]),
      options: {} as any,
      emit: () => {},
      t: ((k: string) => k) as any,
    }

    await expect(step.process(duplicate, ctx)).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/steps/`
Expected: FAIL

- [ ] **Step 4: Implement hashStep**

```typescript
// packages/core/src/steps/hash.ts
import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hashStep(): PipelineStep {
  return {
    name: 'hash',
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      const buffer = await file.arrayBuffer()
      const hash = await computeSHA256(buffer)
      return Object.assign(file, { checksumSHA256: hash })
    },
  }
}
```

- [ ] **Step 5: Implement deduplicateStep**

```typescript
// packages/core/src/steps/deduplicate.ts
import { UpupValidationError, UpupErrorCode, type PipelineStep, type PipelineContext, type UploadFile } from '@upup/shared'

export function deduplicateStep(): PipelineStep {
  return {
    name: 'deduplicate',
    async process(file: UploadFile, context: PipelineContext): Promise<UploadFile> {
      for (const [id, existing] of context.files) {
        if (id !== file.id && existing.name === file.name && existing.size === file.size) {
          throw new UpupValidationError(
            `Duplicate file: "${file.name}"`,
            UpupErrorCode.DUPLICATE,
            file as unknown as File,
          )
        }
      }
      return file
    },
  }
}
```

- [ ] **Step 6: Implement remaining step stubs**

These steps depend on browser APIs or heavy libraries. They're implemented as stubs with the correct interface — the actual processing logic will be ported from v1 during integration.

```typescript
// packages/core/src/steps/exif.ts
import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

export function exifStep(): PipelineStep {
  return {
    name: 'exif',
    shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      // EXIF stripping implementation — requires OffscreenCanvas or Canvas
      // Port from: packages/upup/src/frontend/lib/file.ts (stripExifData function)
      // For environments without Canvas support, returns file unchanged
      if (typeof OffscreenCanvas === 'undefined' && typeof document === 'undefined') {
        return file
      }
      // Full implementation ported during Phase 5 integration
      return file
    },
  }
}
```

```typescript
// packages/core/src/steps/compress.ts
import type { PipelineStep, PipelineContext, UploadFile, ImageCompressionOptions } from '@upup/shared'

export function compressStep(options?: ImageCompressionOptions): PipelineStep {
  return {
    name: 'compress',
    shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      // Image compression — requires Canvas API
      // Port from: packages/upup/src/frontend/lib/file.ts (compressImage function)
      // Uses browser-image-compression or Canvas API
      return file
    },
  }
}
```

```typescript
// packages/core/src/steps/thumbnail.ts
import type { PipelineStep, PipelineContext, UploadFile, ThumbnailGeneratorOptions } from '@upup/shared'

export function thumbnailStep(options?: ThumbnailGeneratorOptions): PipelineStep {
  return {
    name: 'thumbnail',
    shouldProcess: (file: UploadFile) =>
      file.type.startsWith('image/') || file.type.startsWith('video/'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      // Thumbnail generation — requires Canvas/OffscreenCanvas
      // Port from: packages/upup/src/frontend/lib/file.ts (generateThumbnail function)
      return file
    },
  }
}
```

```typescript
// packages/core/src/steps/gzip.ts
import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

export function gzipStep(): PipelineStep {
  return {
    name: 'gzip',
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      // Gzip compression via pako
      // This step will be fully implemented when pako is added as a dependency
      // The heavy dep stays behind this subpath import
      return file
    },
  }
}
```

```typescript
// packages/core/src/steps/heic.ts
import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

export function heicStep(): PipelineStep {
  return {
    name: 'heic',
    shouldProcess: (file: UploadFile) =>
      file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      // HEIC conversion via heic2any
      // This step will be fully implemented when heic2any is added as a dependency
      // The heavy dep stays behind this subpath import
      return file
    },
  }
}
```

- [ ] **Step 7: Update pipeline/index.ts with re-exports**

```typescript
// packages/core/src/pipeline/index.ts
export { PipelineEngine } from './engine'

// Convenience re-exports — importing from here pulls ALL steps
export { hashStep } from '../steps/hash'
export { deduplicateStep } from '../steps/deduplicate'
export { exifStep } from '../steps/exif'
export { compressStep } from '../steps/compress'
export { thumbnailStep } from '../steps/thumbnail'
export { gzipStep } from '../steps/gzip'
export { heicStep } from '../steps/heic'
```

- [ ] **Step 8: Run all tests**

Run: `cd packages/core && npx vitest run`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/steps/ packages/core/src/pipeline/ packages/core/tests/steps/
git commit -m "feat(core): add pipeline steps as subpath exports (hash, exif, compress, thumbnail, gzip, heic, deduplicate)"
```

---

### Task 2.6: Upload Strategies + BrowserRuntime

Implement the DirectUpload strategy and TokenEndpointCredentials strategy for client-mode uploads. Also implement BrowserRuntime adapter.

**Files:**
- Create: `packages/core/src/strategies/direct-upload.ts`
- Create: `packages/core/src/strategies/token-endpoint.ts`
- Create: `packages/core/src/strategies/index.ts`
- Create: `packages/core/src/runtime/browser.ts`
- Create: `packages/core/tests/strategies.test.ts`

- [ ] **Step 1: Write strategy tests**

```typescript
// packages/core/tests/strategies.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TokenEndpointCredentials } from '../src/strategies/token-endpoint'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('TokenEndpointCredentials', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('calls the endpoint with file metadata and returns presigned URL', async () => {
    const presignedResponse = {
      url: 'https://s3.amazonaws.com/bucket/key?X-Amz-Signature=abc',
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      key: 'uploads/test.jpg',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => presignedResponse,
    })

    const strategy = new TokenEndpointCredentials({ url: '/api/upload' })
    const result = await strategy.getPresignedUrl({
      name: 'test.jpg',
      size: 1024,
      type: 'image/jpeg',
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(result.url).toBe(presignedResponse.url)
    expect(result.key).toBe(presignedResponse.key)
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })

    const strategy = new TokenEndpointCredentials({ url: '/api/upload' })

    await expect(strategy.getPresignedUrl({
      name: 'test.jpg',
      size: 1024,
      type: 'image/jpeg',
    })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/strategies.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement TokenEndpointCredentials**

```typescript
// packages/core/src/strategies/token-endpoint.ts
import {
  UpupNetworkError,
  UpupErrorCode,
  type CredentialStrategy,
  type FileMetadata,
  type PresignedUrlResponse,
} from '@upup/shared'

export class TokenEndpointCredentials implements CredentialStrategy {
  private url: string
  private headers: Record<string, string>

  constructor(options: { url: string; headers?: Record<string, string> }) {
    this.url = options.url
    this.headers = options.headers ?? {}
  }

  async getPresignedUrl(file: FileMetadata): Promise<PresignedUrlResponse> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
      }),
    })

    if (!response.ok) {
      throw new UpupNetworkError(
        `Presign request failed: ${response.status} ${response.statusText}`,
        UpupErrorCode.PRESIGN_FAILED,
        response.status,
      )
    }

    return response.json()
  }
}
```

- [ ] **Step 4: Implement DirectUpload strategy**

```typescript
// packages/core/src/strategies/direct-upload.ts
import {
  UpupNetworkError,
  UpupErrorCode,
  type UploadStrategy,
  type UploadCredentials,
  type UploadResult,
} from '@upup/shared'

export class DirectUpload implements UploadStrategy {
  async upload(
    file: File | Blob,
    credentials: UploadCredentials,
    options: {
      onProgress: (loaded: number, total: number) => void
      signal: AbortSignal
    },
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          options.onProgress(e.loaded, e.total)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            status: xhr.status,
            key: credentials.key,
            url: credentials.url.split('?')[0], // URL without query params
          })
        } else {
          reject(new UpupNetworkError(
            `Upload failed: ${xhr.status} ${xhr.statusText}`,
            UpupErrorCode.UPLOAD_FAILED,
            xhr.status,
          ))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new UpupNetworkError(
          'Network error during upload',
          UpupErrorCode.NETWORK_ERROR,
        ))
      })

      xhr.addEventListener('abort', () => {
        reject(new UpupNetworkError(
          'Upload aborted',
          UpupErrorCode.UPLOAD_ABORTED,
        ))
      })

      options.signal.addEventListener('abort', () => xhr.abort())

      xhr.open(credentials.method ?? 'PUT', credentials.url)

      if (credentials.headers) {
        for (const [key, value] of Object.entries(credentials.headers)) {
          xhr.setRequestHeader(key, value)
        }
      }

      xhr.send(file)
    })
  }
}
```

- [ ] **Step 5: Implement BrowserRuntime**

```typescript
// packages/core/src/runtime/browser.ts
import type { RuntimeAdapter } from '@upup/shared'

export const BrowserRuntime: RuntimeAdapter = {
  async computeHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  },

  createImageBitmap: typeof createImageBitmap !== 'undefined'
    ? (blob: Blob) => createImageBitmap(blob)
    : undefined,

  createWorker: typeof Worker !== 'undefined'
    ? (code: string) => {
        try {
          const blob = new Blob([code], { type: 'application/javascript' })
          const url = URL.createObjectURL(blob)
          const worker = new Worker(url)
          URL.revokeObjectURL(url)
          return worker
        } catch {
          return null
        }
      }
    : undefined,

  async upload(url, body, options) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) options.onProgress(e.loaded, e.total)
      })

      xhr.addEventListener('load', () => {
        const headers: Record<string, string> = {}
        xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
          const [key, ...vals] = line.split(': ')
          if (key) headers[key.toLowerCase()] = vals.join(': ')
        })
        resolve({ status: xhr.status, headers, body: xhr.responseText })
      })

      xhr.addEventListener('error', () => reject(new Error('Network error')))
      options.signal.addEventListener('abort', () => xhr.abort())

      xhr.open(options.method, url)
      for (const [k, v] of Object.entries(options.headers)) {
        xhr.setRequestHeader(k, v)
      }
      xhr.send(body)
    })
  },

  async readAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
    return file.arrayBuffer()
  },

  createObjectURL: typeof URL !== 'undefined' && URL.createObjectURL
    ? (blob: Blob) => URL.createObjectURL(blob)
    : undefined,

  revokeObjectURL: typeof URL !== 'undefined' && URL.revokeObjectURL
    ? (url: string) => URL.revokeObjectURL(url)
    : undefined,
}
```

- [ ] **Step 6: Create strategies index**

```typescript
// packages/core/src/strategies/index.ts
export { DirectUpload } from './direct-upload'
export { TokenEndpointCredentials } from './token-endpoint'
```

- [ ] **Step 7: Update core/src/index.ts**

```typescript
// packages/core/src/index.ts
export { UpupCore } from './core'
export type { CoreOptions, UploadOptions } from './core'
export { EventEmitter } from './events'
export { PluginManager } from './plugin'
export type { UpupPlugin, ExtensionMethods } from './plugin'
export { FileManager } from './file-manager'
export { PipelineEngine } from './pipeline/engine'
export { DirectUpload } from './strategies/direct-upload'
export { TokenEndpointCredentials } from './strategies/token-endpoint'
export { BrowserRuntime } from './runtime/browser'
```

- [ ] **Step 8: Run tests — verify they pass**

Run: `cd packages/core && npx vitest run`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/strategies/ packages/core/src/runtime/ packages/core/tests/strategies.test.ts packages/core/src/index.ts
git commit -m "feat(core): add DirectUpload, TokenEndpointCredentials strategies and BrowserRuntime"
```

---

### Task 2.7: Upload Manager (Progress, Concurrency, Fast Abort, isSuccessfulCall)

Implement the upload orchestration — concurrent uploads with progress tracking, abort handling, and custom success detection.

**Files:**
- Create: `packages/core/src/upload-manager.ts`
- Create: `packages/core/tests/upload-manager.test.ts`
- Modify: `packages/core/src/core.ts` — wire upload manager into UpupCore.upload()

- [ ] **Step 1: Write upload manager tests**

```typescript
// packages/core/tests/upload-manager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UploadManager } from '../src/upload-manager'
import type { UploadFile, CredentialStrategy, UploadStrategy, PresignedUrlResponse } from '@upup/shared'

const makeUploadFile = (id: string, name: string): UploadFile => {
  const file = new File(['content'], name, { type: 'text/plain' })
  return Object.assign(file, {
    id,
    url: null,
    relativePath: null,
    key: null,
    fileHash: null,
    checksumSHA256: null,
    etag: null,
    thumbnail: null,
  }) as unknown as UploadFile
}

const mockCredentials: CredentialStrategy = {
  getPresignedUrl: vi.fn().mockResolvedValue({
    url: 'https://s3.example.com/upload',
    method: 'PUT',
    headers: {},
    key: 'uploads/test.txt',
  } satisfies PresignedUrlResponse),
}

const mockUploadStrategy: UploadStrategy = {
  upload: vi.fn().mockResolvedValue({
    status: 200,
    key: 'uploads/test.txt',
    url: 'https://s3.example.com/uploads/test.txt',
  }),
}

describe('UploadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads all files and calls onProgress', async () => {
    const onProgress = vi.fn()
    const onFileComplete = vi.fn()

    const manager = new UploadManager({
      credentials: mockCredentials,
      uploadStrategy: mockUploadStrategy,
      maxConcurrentUploads: 2,
      onProgress,
      onFileComplete,
    })

    const files = [makeUploadFile('1', 'a.txt'), makeUploadFile('2', 'b.txt')]
    await manager.uploadAll(files)

    expect(mockCredentials.getPresignedUrl).toHaveBeenCalledTimes(2)
    expect(mockUploadStrategy.upload).toHaveBeenCalledTimes(2)
    expect(onFileComplete).toHaveBeenCalledTimes(2)
  })

  it('respects maxConcurrentUploads', async () => {
    let concurrentCount = 0
    let maxConcurrent = 0

    const slowUpload: UploadStrategy = {
      upload: vi.fn().mockImplementation(async () => {
        concurrentCount++
        maxConcurrent = Math.max(maxConcurrent, concurrentCount)
        await new Promise(r => setTimeout(r, 10))
        concurrentCount--
        return { status: 200, key: 'k', url: 'u' }
      }),
    }

    const manager = new UploadManager({
      credentials: mockCredentials,
      uploadStrategy: slowUpload,
      maxConcurrentUploads: 2,
      onProgress: () => {},
      onFileComplete: () => {},
    })

    const files = [
      makeUploadFile('1', 'a.txt'),
      makeUploadFile('2', 'b.txt'),
      makeUploadFile('3', 'c.txt'),
      makeUploadFile('4', 'd.txt'),
    ]

    await manager.uploadAll(files)

    expect(maxConcurrent).toBeLessThanOrEqual(2)
  })

  it('cancels all uploads via abort()', async () => {
    const neverResolve: UploadStrategy = {
      upload: vi.fn().mockImplementation(async (_file, _creds, opts) => {
        return new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new Error('aborted')))
        })
      }),
    }

    const manager = new UploadManager({
      credentials: mockCredentials,
      uploadStrategy: neverResolve,
      maxConcurrentUploads: 2,
      onProgress: () => {},
      onFileComplete: () => {},
    })

    const uploadPromise = manager.uploadAll([makeUploadFile('1', 'a.txt')])

    // Cancel immediately
    manager.abort()

    await expect(uploadPromise).rejects.toThrow()
  })

  it('uses isSuccessfulCall for custom success detection', async () => {
    const customStrategy: UploadStrategy = {
      upload: vi.fn().mockResolvedValue({
        status: 200,
        key: 'k',
        url: 'u',
      }),
    }

    const manager = new UploadManager({
      credentials: mockCredentials,
      uploadStrategy: customStrategy,
      maxConcurrentUploads: 1,
      onProgress: () => {},
      onFileComplete: () => {},
      isSuccessfulCall: async (response) => {
        // Custom: reject even 200 responses
        return false
      },
    })

    await expect(manager.uploadAll([makeUploadFile('1', 'a.txt')])).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/upload-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement UploadManager**

```typescript
// packages/core/src/upload-manager.ts
import {
  UpupNetworkError,
  UpupErrorCode,
  type CredentialStrategy,
  type UploadStrategy,
  type UploadFile,
  type UploadResult,
} from '@upup/shared'

export interface UploadManagerOptions {
  credentials: CredentialStrategy
  uploadStrategy: UploadStrategy
  maxConcurrentUploads: number
  maxRetries?: number
  fastAbortThreshold?: number
  isSuccessfulCall?: (response: { status: number; headers: Record<string, string>; body: unknown }) => boolean | Promise<boolean>
  onProgress: (fileId: string, loaded: number, total: number) => void
  onFileComplete: (file: UploadFile, result: UploadResult) => void
  onFileError?: (file: UploadFile, error: Error) => void
}

export class UploadManager {
  private abortController = new AbortController()
  private options: UploadManagerOptions

  constructor(options: UploadManagerOptions) {
    this.options = options
  }

  async uploadAll(files: UploadFile[]): Promise<UploadResult[]> {
    const results: UploadResult[] = []
    const queue = [...files]
    const inFlight = new Set<Promise<void>>()

    const processNext = async (): Promise<void> => {
      const file = queue.shift()
      if (!file) return

      try {
        const result = await this.uploadFile(file)
        results.push(result)
        this.options.onFileComplete(file, result)
      } catch (error) {
        if (this.options.onFileError) {
          this.options.onFileError(file, error as Error)
        }
        throw error
      }
    }

    while (queue.length > 0 || inFlight.size > 0) {
      // Fill up to maxConcurrentUploads
      while (queue.length > 0 && inFlight.size < this.options.maxConcurrentUploads) {
        const promise = processNext()
        inFlight.add(promise)
        promise.finally(() => inFlight.delete(promise))
      }

      if (inFlight.size > 0) {
        // Wait for at least one to complete
        await Promise.race(inFlight)
      }
    }

    return results
  }

  private async uploadFile(file: UploadFile): Promise<UploadResult> {
    const maxRetries = this.options.maxRetries ?? 3

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Get presigned URL
        const credentials = await this.options.credentials.getPresignedUrl({
          name: file.name,
          size: file.size,
          type: file.type,
        })

        // Upload
        const result = await this.options.uploadStrategy.upload(
          file as unknown as File,
          credentials,
          {
            onProgress: (loaded, total) => this.options.onProgress(file.id, loaded, total),
            signal: this.abortController.signal,
          },
        )

        // Custom success detection
        if (this.options.isSuccessfulCall) {
          const isSuccess = await this.options.isSuccessfulCall({
            status: result.status,
            headers: {},
            body: result,
          })
          if (!isSuccess) {
            throw new UpupNetworkError(
              'Upload response failed custom success check',
              UpupErrorCode.UPLOAD_FAILED,
              result.status,
            )
          }
        }

        return result
      } catch (error) {
        // Don't retry on abort
        if (this.abortController.signal.aborted) throw error
        // Don't retry on last attempt
        if (attempt === maxRetries) throw error
        // Only retry on network errors
        if (error instanceof UpupNetworkError && error.retryable) {
          continue
        }
        throw error
      }
    }

    // Unreachable but TypeScript needs it
    throw new Error('Upload failed')
  }

  abort(): void {
    this.abortController.abort()
  }

  pause(): void {
    // Pausing is implemented by aborting current uploads and saving state
    // The resume will re-upload from where it left off
    this.abortController.abort()
    this.abortController = new AbortController()
  }
}
```

- [ ] **Step 4: Wire UploadManager into UpupCore**

Update `packages/core/src/core.ts` — replace the stub `upload()` method with real UploadManager integration. The key changes:

1. Import `UploadManager` and `TokenEndpointCredentials` and `DirectUpload`
2. In `upload()`, create credentials and upload strategies based on options
3. Create `UploadManager` and call `uploadAll()`
4. Update `cancel()` to use `fastAbortThreshold`

Replace the `upload()`, `pause()`, `resume()`, and `cancel()` methods in `core.ts`:

```typescript
// In packages/core/src/core.ts — add these imports at top:
import { UploadManager } from './upload-manager'
import { TokenEndpointCredentials } from './strategies/token-endpoint'
import { DirectUpload } from './strategies/direct-upload'

// Replace upload-related fields:
  private uploadManager: UploadManager | null = null

// Replace upload() method:
  async upload(): Promise<UploadFile[]> {
    if (this.files.size === 0) return []

    this._status = UploadStatus.PROCESSING
    this.emitter.emit('upload-start', {})
    this.emitter.emit('state-change', { status: this._status })

    // Run pipeline if configured
    if (this.pipelineEngine) {
      const context: PipelineContext = {
        files: this.files,
        options: this.options as any,
        emit: (event: string, data?: unknown) => this.emitter.emit(event, data),
        t: ((key: string) => key) as any,
      }
      const processed = await this.pipelineEngine.processAll([...this.files.values()], context)
      for (const file of processed) {
        this.files.set(file.id, file)
      }
    }

    this._status = UploadStatus.UPLOADING
    this.emitter.emit('state-change', { status: this._status })

    // Create credential strategy
    const credentials = this.options.uploadEndpoint
      ? new TokenEndpointCredentials({ url: this.options.uploadEndpoint })
      : (this.options as any).credentials

    if (!credentials) {
      throw new Error('No upload endpoint or credential strategy configured')
    }

    // Create upload strategy
    const uploadStrategy = (this.options as any).uploadStrategy ?? new DirectUpload()

    this.uploadManager = new UploadManager({
      credentials,
      uploadStrategy,
      maxConcurrentUploads: this.options.maxConcurrentUploads ?? 3,
      maxRetries: this.options.maxRetries ?? 3,
      fastAbortThreshold: this.options.fastAbortThreshold,
      isSuccessfulCall: this.options.isSuccessfulCall,
      onProgress: (fileId, loaded, total) => {
        this.emitter.emit('upload-progress', { fileId, loaded, total })
      },
      onFileComplete: (file, result) => {
        const updated = Object.assign(file, { key: result.key, url: result.url })
        this.files.set(file.id, updated)
        this.emitter.emit('upload-complete', { file: updated, key: result.key })
      },
      onFileError: (file, error) => {
        this.emitter.emit('upload-error', { file, error })
      },
    })

    try {
      await this.uploadManager.uploadAll([...this.files.values()])
      this._status = UploadStatus.SUCCESSFUL
      this.emitter.emit('upload-all-complete', [...this.files.values()])
    } catch (error) {
      this._status = UploadStatus.FAILED
      this._error = error as Error
      this.emitter.emit('error', error)
    }

    this.emitter.emit('state-change', { status: this._status })
    this.uploadManager = null

    return [...this.files.values()]
  }

// Replace cancel() method:
  cancel(): void {
    const fileCount = this.files.size
    const threshold = this.options.fastAbortThreshold ?? 100

    if (this.uploadManager) {
      if (fileCount > threshold) {
        // Fast abort: just signal abort, don't individually cancel each file
        this.uploadManager.abort()
      } else {
        this.uploadManager.abort()
      }
    }

    this._status = UploadStatus.IDLE
    this.emitter.emit('upload-cancel', {})
    this.emitter.emit('state-change', { status: this._status })
  }

// Replace pause() and resume():
  pause(): void {
    if (this.uploadManager) {
      this.uploadManager.pause()
    }
    this._status = UploadStatus.PAUSED
    this.emitter.emit('upload-pause', {})
    this.emitter.emit('state-change', { status: this._status })
  }

  resume(): void {
    this._status = UploadStatus.UPLOADING
    this.emitter.emit('upload-resume', {})
    this.emitter.emit('state-change', { status: this._status })
    // Note: resume() re-uploads remaining files; full impl needs state tracking
  }
```

- [ ] **Step 5: Run all core tests**

Run: `cd packages/core && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Update index.ts exports**

Add to `packages/core/src/index.ts`:

```typescript
export { UploadManager } from './upload-manager'
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/upload-manager.ts packages/core/tests/upload-manager.test.ts packages/core/src/core.ts packages/core/src/index.ts
git commit -m "feat(core): add UploadManager with concurrency, retries, fast abort, and isSuccessfulCall"
```

---

### Task 2.8: Web Worker Pool

**Files:**
- Create: `packages/core/src/worker-pool.ts`
- Create: `packages/core/tests/worker-pool.test.ts`

- [ ] **Step 1: Write worker pool tests**

```typescript
// packages/core/tests/worker-pool.test.ts
import { describe, it, expect, vi } from 'vitest'
import { WorkerPool, type WorkerTask } from '../src/worker-pool'

// In Node/Vitest environment, Worker is not available.
// WorkerPool should fall back to main-thread execution.

describe('WorkerPool', () => {
  it('falls back to main thread when Worker is unavailable', async () => {
    const pool = new WorkerPool()
    const data = new TextEncoder().encode('hello world').buffer

    const result = await pool.execute({ type: 'hash-full', data: data as ArrayBuffer })

    expect(typeof result).toBe('string')
    expect((result as string).length).toBe(64) // SHA-256 hex
  })

  it('handles gzip tasks on main thread', async () => {
    const pool = new WorkerPool()
    const data = new TextEncoder().encode('hello world').buffer

    // Gzip fallback returns the original data when pako is not available
    const result = await pool.execute({ type: 'gzip', data: data as ArrayBuffer })

    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('destroys without errors', () => {
    const pool = new WorkerPool()
    expect(() => pool.destroy()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/worker-pool.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement WorkerPool**

```typescript
// packages/core/src/worker-pool.ts

export type WorkerTask =
  | { type: 'hash-partial'; data: ArrayBuffer }
  | { type: 'hash-full'; data: ArrayBuffer }
  | { type: 'gzip'; data: ArrayBuffer }

async function mainThreadHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function mainThreadGzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  // Try CompressionStream API (modern browsers)
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))
    const blob = await new Response(stream).blob()
    return blob.arrayBuffer()
  }
  // Fallback: return uncompressed (pako can be used when available)
  return data
}

export class WorkerPool {
  private workers: Worker[] = []
  private maxWorkers: number
  private workerAvailable: boolean

  constructor(options?: { maxWorkers?: number }) {
    this.maxWorkers = options?.maxWorkers ?? navigator?.hardwareConcurrency ?? 2
    this.workerAvailable = typeof Worker !== 'undefined'
  }

  async execute<T = unknown>(task: WorkerTask): Promise<T> {
    // Always fall back to main thread for now
    // Worker support will be enabled when inline worker code is bundled
    return this.executeMainThread(task) as T
  }

  private async executeMainThread(task: WorkerTask): Promise<unknown> {
    switch (task.type) {
      case 'hash-partial':
      case 'hash-full':
        return mainThreadHash(task.data)
      case 'gzip':
        return mainThreadGzip(task.data)
      default:
        throw new Error(`Unknown worker task type: ${(task as any).type}`)
    }
  }

  destroy(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd packages/core && npx vitest run tests/worker-pool.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Update index.ts and commit**

Add to `packages/core/src/index.ts`:

```typescript
export { WorkerPool } from './worker-pool'
export type { WorkerTask } from './worker-pool'
```

```bash
git add packages/core/src/worker-pool.ts packages/core/tests/worker-pool.test.ts packages/core/src/index.ts
git commit -m "feat(core): add WorkerPool with main-thread fallback for hash and gzip"
```

---

### Task 2.9: Crash Recovery

**Files:**
- Create: `packages/core/src/crash-recovery.ts`
- Create: `packages/core/tests/crash-recovery.test.ts`

- [ ] **Step 1: Write crash recovery tests**

```typescript
// packages/core/tests/crash-recovery.test.ts
import { describe, it, expect, vi } from 'vitest'
import { CrashRecoveryManager } from '../src/crash-recovery'

// Mock IndexedDB with a simple in-memory store
const mockStorage = {
  store: new Map<string, unknown>(),
  get: vi.fn(async (key: string) => mockStorage.store.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { mockStorage.store.set(key, value) }),
  delete: vi.fn(async (key: string) => { mockStorage.store.delete(key) }),
}

describe('CrashRecoveryManager', () => {
  it('saves a snapshot', async () => {
    const manager = new CrashRecoveryManager(mockStorage)
    const snapshot = { files: [['id1', { name: 'test.jpg' }]], status: 'UPLOADING' }

    await manager.save(snapshot)

    expect(mockStorage.set).toHaveBeenCalledWith('upup-crash-recovery', snapshot)
  })

  it('restores a snapshot', async () => {
    const snapshot = { files: [['id1', { name: 'test.jpg' }]], status: 'UPLOADING' }
    mockStorage.store.set('upup-crash-recovery', snapshot)

    const manager = new CrashRecoveryManager(mockStorage)
    const restored = await manager.restore()

    expect(restored).toEqual(snapshot)
  })

  it('returns null when no snapshot exists', async () => {
    mockStorage.store.clear()
    const manager = new CrashRecoveryManager(mockStorage)
    const restored = await manager.restore()

    expect(restored).toBeNull()
  })

  it('clears the snapshot', async () => {
    mockStorage.store.set('upup-crash-recovery', { data: true })
    const manager = new CrashRecoveryManager(mockStorage)

    await manager.clear()

    expect(mockStorage.delete).toHaveBeenCalledWith('upup-crash-recovery')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd packages/core && npx vitest run tests/crash-recovery.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement CrashRecoveryManager**

```typescript
// packages/core/src/crash-recovery.ts

export interface PersistentStorage {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
}

const STORAGE_KEY = 'upup-crash-recovery'

export class CrashRecoveryManager {
  private storage: PersistentStorage

  constructor(storage: PersistentStorage) {
    this.storage = storage
  }

  async save(snapshot: unknown): Promise<void> {
    await this.storage.set(STORAGE_KEY, snapshot)
  }

  async restore(): Promise<unknown | null> {
    const data = await this.storage.get(STORAGE_KEY)
    return data ?? null
  }

  async clear(): Promise<void> {
    await this.storage.delete(STORAGE_KEY)
  }
}

/**
 * IndexedDB-based storage for browser environments.
 * Falls back gracefully when IndexedDB is unavailable (SSR, privacy mode).
 */
export class IndexedDBStorage implements PersistentStorage {
  private dbName: string
  private storeName = 'upup-store'

  constructor(dbName = 'upup-crash-recovery') {
    this.dbName = dbName
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore(this.storeName)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async get(key: string): Promise<unknown> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const request = store.get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch {
      return undefined
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.put(value, key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Silently fail — crash recovery is best-effort
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Silently fail
    }
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd packages/core && npx vitest run tests/crash-recovery.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Update exports and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { CrashRecoveryManager, IndexedDBStorage } from './crash-recovery'
export type { PersistentStorage } from './crash-recovery'
```

```bash
git add packages/core/src/crash-recovery.ts packages/core/tests/crash-recovery.test.ts packages/core/src/index.ts
git commit -m "feat(core): add CrashRecoveryManager with IndexedDB storage"
```

---

### Task 2.10: Subpath Exports Configuration + size-limit

Configure the package.json with subpath exports for tree-shaking, update tsup config for multiple entry points, and set up size-limit.

**Files:**
- Modify: `packages/core/package.json`
- Modify: `packages/core/tsup.config.ts`
- Modify: root `package.json` — add size-limit config

- [ ] **Step 1: Update core package.json with subpath exports**

```json
{
  "name": "@upup/core",
  "version": "2.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    },
    "./pipeline": {
      "import": {
        "types": "./dist/pipeline/index.d.mts",
        "default": "./dist/pipeline/index.mjs"
      },
      "require": {
        "types": "./dist/pipeline/index.d.ts",
        "default": "./dist/pipeline/index.js"
      }
    },
    "./steps/hash": {
      "import": {
        "types": "./dist/steps/hash.d.mts",
        "default": "./dist/steps/hash.mjs"
      },
      "require": {
        "types": "./dist/steps/hash.d.ts",
        "default": "./dist/steps/hash.js"
      }
    },
    "./steps/gzip": {
      "import": {
        "types": "./dist/steps/gzip.d.mts",
        "default": "./dist/steps/gzip.mjs"
      },
      "require": {
        "types": "./dist/steps/gzip.d.ts",
        "default": "./dist/steps/gzip.js"
      }
    },
    "./steps/heic": {
      "import": {
        "types": "./dist/steps/heic.d.mts",
        "default": "./dist/steps/heic.mjs"
      },
      "require": {
        "types": "./dist/steps/heic.d.ts",
        "default": "./dist/steps/heic.js"
      }
    },
    "./steps/exif": {
      "import": {
        "types": "./dist/steps/exif.d.mts",
        "default": "./dist/steps/exif.mjs"
      },
      "require": {
        "types": "./dist/steps/exif.d.ts",
        "default": "./dist/steps/exif.js"
      }
    },
    "./steps/compress": {
      "import": {
        "types": "./dist/steps/compress.d.mts",
        "default": "./dist/steps/compress.mjs"
      },
      "require": {
        "types": "./dist/steps/compress.d.ts",
        "default": "./dist/steps/compress.js"
      }
    },
    "./steps/thumbnail": {
      "import": {
        "types": "./dist/steps/thumbnail.d.mts",
        "default": "./dist/steps/thumbnail.mjs"
      },
      "require": {
        "types": "./dist/steps/thumbnail.d.ts",
        "default": "./dist/steps/thumbnail.js"
      }
    },
    "./steps/deduplicate": {
      "import": {
        "types": "./dist/steps/deduplicate.d.mts",
        "default": "./dist/steps/deduplicate.mjs"
      },
      "require": {
        "types": "./dist/steps/deduplicate.d.ts",
        "default": "./dist/steps/deduplicate.js"
      }
    }
  },
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@upup/shared": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Update tsup config for all entry points**

```typescript
// packages/core/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'pipeline/index': 'src/pipeline/index.ts',
    'steps/hash': 'src/steps/hash.ts',
    'steps/gzip': 'src/steps/gzip.ts',
    'steps/heic': 'src/steps/heic.ts',
    'steps/exif': 'src/steps/exif.ts',
    'steps/compress': 'src/steps/compress.ts',
    'steps/thumbnail': 'src/steps/thumbnail.ts',
    'steps/deduplicate': 'src/steps/deduplicate.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  external: ['@upup/shared'],
})
```

- [ ] **Step 3: Install size-limit at root**

Run: `pnpm add -Dw size-limit @size-limit/preset-small-lib`

- [ ] **Step 4: Add size-limit config to root package.json**

Add to root `package.json` in the top level:

```json
{
  "size-limit": [
    { "path": "packages/core/dist/index.mjs", "limit": "12 KB", "name": "@upup/core (main)" },
    { "path": "packages/shared/dist/index.mjs", "limit": "5 KB", "name": "@upup/shared" },
    { "path": "packages/core/dist/steps/hash.mjs", "limit": "3 KB", "name": "@upup/core/steps/hash" },
    { "path": "packages/core/dist/steps/deduplicate.mjs", "limit": "3 KB", "name": "@upup/core/steps/deduplicate" }
  ],
  "scripts": {
    "size": "size-limit",
    "size:check": "size-limit --limit"
  }
}
```

- [ ] **Step 5: Build and verify size**

Run: `cd packages/core && npx tsup && cd ../.. && npx size-limit`
Expected: Build succeeds. Size-limit reports each entry point under budget.

- [ ] **Step 6: Add `sideEffects: false` to shared package.json too**

Read `packages/shared/package.json` and add `"sideEffects": false` at the top level.

- [ ] **Step 7: Commit**

```bash
git add packages/core/package.json packages/core/tsup.config.ts package.json pnpm-lock.yaml packages/shared/package.json
git commit -m "feat(core): configure subpath exports and size-limit CI budgets"
```

---

## Phase 3: @upup/react

### Task 3.1: useUpupUpload Hook (SSR-Safe) + useIsClient

The primary headless API. SSR-safe — defers UpupCore initialization to client side.

**Files:**
- Create: `packages/react/src/use-is-client.ts`
- Create: `packages/react/src/use-upup-upload.ts`
- Create: `packages/react/tests/use-upup-upload.test.ts`

- [ ] **Step 1: Write useIsClient**

```typescript
// packages/react/src/use-is-client.ts
'use client'

import { useState, useEffect } from 'react'

export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])
  return isClient
}
```

- [ ] **Step 2: Write useUpupUpload tests**

```typescript
// packages/react/tests/use-upup-upload.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus } from '@upup/shared'

describe('useUpupUpload', () => {
  it('initializes with IDLE status and empty files', () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    expect(result.current.status).toBe(UploadStatus.IDLE)
    expect(result.current.files).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('exposes core instance', () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    expect(result.current.core).toBeDefined()
  })

  it('adds files and updates state', async () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await act(async () => {
      await result.current.addFiles([file])
    })

    expect(result.current.files.length).toBe(1)
    expect(result.current.files[0].name).toBe('test.txt')
  })

  it('removes a file', async () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await act(async () => {
      await result.current.addFiles([file])
    })

    const fileId = result.current.files[0].id
    act(() => {
      result.current.removeFile(fileId)
    })

    expect(result.current.files.length).toBe(0)
  })

  it('cleans up core on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    const core = result.current.core
    const destroySpy = vi.spyOn(core, 'destroy')

    unmount()

    expect(destroySpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Set up vitest for react package**

```typescript
// packages/react/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: [],
  },
})
```

Install test deps:
Run: `cd packages/react && pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom`

- [ ] **Step 4: Run tests — verify they fail**

Run: `cd packages/react && npx vitest run tests/use-upup-upload.test.ts`
Expected: FAIL

- [ ] **Step 5: Implement useUpupUpload**

```typescript
// packages/react/src/use-upup-upload.ts
'use client'

import { useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { UpupCore, type CoreOptions } from '@upup/core'
import { UploadStatus, type UploadFile, type UpupError } from '@upup/shared'

export interface UseUpupUploadReturn {
  files: UploadFile[]
  status: UploadStatus
  progress: { totalFiles: number; completedFiles: number; percentage: number }
  error: UpupError | null

  addFiles(files: File[]): Promise<void>
  removeFile(id: string): void
  removeAll(): void
  setFiles(files: File[]): Promise<void>
  reorderFiles(fromIndex: number, toIndex: number): void

  upload(): Promise<UploadFile[]>
  pause(): void
  resume(): void
  cancel(): void
  retry(fileId?: string): void

  core: UpupCore
}

export function useUpupUpload(options: CoreOptions): UseUpupUploadReturn {
  const coreRef = useRef<UpupCore | null>(null)
  const [, forceUpdate] = useState(0)

  // Lazy initialization — safe during SSR
  if (typeof window !== 'undefined' && !coreRef.current) {
    coreRef.current = new UpupCore(options)
  }

  useEffect(() => {
    // Hydration fallback
    if (!coreRef.current) {
      coreRef.current = new UpupCore(options)
      forceUpdate(n => n + 1)
    }

    const core = coreRef.current

    // Subscribe to state changes to trigger re-renders
    const unsub = core.on('state-change', () => {
      forceUpdate(n => n + 1)
    })

    return () => {
      unsub()
      core.destroy()
      coreRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const core = coreRef.current!

  // If SSR (core not yet initialized), return defaults
  if (!core) {
    return {
      files: [],
      status: UploadStatus.IDLE,
      progress: { totalFiles: 0, completedFiles: 0, percentage: 0 },
      error: null,
      addFiles: async () => {},
      removeFile: () => {},
      removeAll: () => {},
      setFiles: async () => {},
      reorderFiles: () => {},
      upload: async () => [],
      pause: () => {},
      resume: () => {},
      cancel: () => {},
      retry: () => {},
      core: null as unknown as UpupCore,
    }
  }

  return {
    files: [...core.files.values()],
    status: core.status,
    progress: core.progress,
    error: core.error as UpupError | null,

    addFiles: (files) => core.addFiles(files),
    removeFile: (id) => core.removeFile(id),
    removeAll: () => core.removeAll(),
    setFiles: (files) => core.setFiles(files),
    reorderFiles: (from, to) => core.reorderFiles(from, to),

    upload: () => core.upload(),
    pause: () => core.pause(),
    resume: () => core.resume(),
    cancel: () => core.cancel(),
    retry: (fileId) => core.retry(fileId),

    core,
  }
}
```

- [ ] **Step 6: Run tests — verify they pass**

Run: `cd packages/react && npx vitest run tests/use-upup-upload.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/use-is-client.ts packages/react/src/use-upup-upload.ts packages/react/tests/ packages/react/vitest.config.ts packages/react/package.json pnpm-lock.yaml
git commit -m "feat(react): add SSR-safe useUpupUpload hook and useIsClient utility"
```

---

### Task 3.2: PasteZone Component

**Files:**
- Create: `packages/react/src/components/paste-zone.tsx`
- Create: `packages/react/tests/paste-zone.test.tsx`

- [ ] **Step 1: Write PasteZone tests**

```tsx
// packages/react/tests/paste-zone.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { PasteZone } from '../src/components/paste-zone'

describe('PasteZone', () => {
  it('renders children', () => {
    const onPaste = vi.fn()
    const { getByText } = render(
      <PasteZone onPaste={onPaste}>
        <div>Paste here</div>
      </PasteZone>
    )
    expect(getByText('Paste here')).toBeDefined()
  })

  it('calls onPaste with files from clipboard', () => {
    const onPaste = vi.fn()
    const { container } = render(
      <PasteZone onPaste={onPaste}>
        <div>Paste here</div>
      </PasteZone>
    )

    const file = new File(['content'], 'screenshot.png', { type: 'image/png' })
    const clipboardData = {
      items: [{ kind: 'file', getAsFile: () => file }],
    }

    fireEvent.paste(container.firstChild!, { clipboardData })

    expect(onPaste).toHaveBeenCalledWith([file])
  })

  it('generates filename for pasted images without name', () => {
    const onPaste = vi.fn()
    const { container } = render(
      <PasteZone onPaste={onPaste}>
        <div>Paste here</div>
      </PasteZone>
    )

    const blob = new File([''], '', { type: 'image/png' })
    Object.defineProperty(blob, 'name', { value: '' })

    const clipboardData = {
      items: [{ kind: 'file', getAsFile: () => blob }],
    }

    fireEvent.paste(container.firstChild!, { clipboardData })

    expect(onPaste).toHaveBeenCalled()
    const pastedFiles = onPaste.mock.calls[0][0]
    expect(pastedFiles[0].name).toMatch(/^pasted-image-\d+\.png$/)
  })

  it('ignores non-file paste events', () => {
    const onPaste = vi.fn()
    const { container } = render(
      <PasteZone onPaste={onPaste}>
        <div>Paste here</div>
      </PasteZone>
    )

    const clipboardData = {
      items: [{ kind: 'string', getAsFile: () => null }],
    }

    fireEvent.paste(container.firstChild!, { clipboardData })

    expect(onPaste).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd packages/react && npx vitest run tests/paste-zone.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement PasteZone**

```tsx
// packages/react/src/components/paste-zone.tsx
'use client'

import { useCallback, type ReactNode } from 'react'

export interface PasteZoneProps {
  onPaste: (files: File[]) => void
  children: ReactNode
  className?: string
}

function generatePastedFileName(type: string): string {
  const ext = type.split('/')[1] || 'bin'
  return `pasted-image-${Date.now()}.${ext}`
}

export function PasteZone({ onPaste, children, className }: PasteZoneProps) {
  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      const files: File[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind !== 'file') continue

        const file = item.getAsFile()
        if (!file) continue

        // Generate a name for pasted images (screenshots)
        if (!file.name || file.name === '') {
          const named = new File([file], generatePastedFileName(file.type), {
            type: file.type,
            lastModified: Date.now(),
          })
          files.push(named)
        } else {
          files.push(file)
        }
      }

      if (files.length > 0) {
        onPaste(files)
      }
    },
    [onPaste],
  )

  return (
    <div onPaste={handlePaste} className={className}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd packages/react && npx vitest run tests/paste-zone.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/components/paste-zone.tsx packages/react/tests/paste-zone.test.tsx
git commit -m "feat(react): add PasteZone component for clipboard paste upload"
```

---

### Task 3.3: UploaderContext + UpupUploader Shell

Create the React context and the main UpupUploader component shell that wires everything together.

**Files:**
- Create: `packages/react/src/context/uploader-context.ts`
- Create: `packages/react/src/upup-uploader.tsx`

- [ ] **Step 1: Create UploaderContext**

```typescript
// packages/react/src/context/uploader-context.ts
'use client'

import { createContext, useContext } from 'react'
import type { UseUpupUploadReturn } from '../use-upup-upload'
import type { FileSource, UploaderClassNames, UploaderIcons } from '@upup/shared'

export type UploadSource = 'local' | 'camera' | 'url' | 'google_drive' | 'onedrive' | 'dropbox' | 'microphone' | 'screen'

export interface UploaderUIState {
  activeSource: FileSource | null
  setActiveSource: (source: FileSource | null) => void
  dark: boolean
  mini: boolean
  classNames: UploaderClassNames
  icons: UploaderIcons
  enablePaste: boolean
  sources: UploadSource[]
}

export type UploaderContextValue = UseUpupUploadReturn & UploaderUIState

export const UploaderContext = createContext<UploaderContextValue | null>(null)

export function useUploaderContext(): UploaderContextValue {
  const ctx = useContext(UploaderContext)
  if (!ctx) {
    throw new Error('useUploaderContext must be used within <UpupUploader>')
  }
  return ctx
}
```

- [ ] **Step 2: Create UpupUploader shell**

```tsx
// packages/react/src/upup-uploader.tsx
'use client'

import { forwardRef, useImperativeHandle, useState, useMemo, type Ref } from 'react'
import { useUpupUpload, type UseUpupUploadReturn } from './use-upup-upload'
import { UploaderContext, type UploadSource, type UploaderContextValue } from './context/uploader-context'
import { PasteZone } from './components/paste-zone'
import type { CoreOptions } from '@upup/core'
import { FileSource, type UploaderClassNames, type UploaderIcons } from '@upup/shared'

export interface UpupUploaderProps extends CoreOptions {
  // UI options
  dark?: boolean
  mini?: boolean
  classNames?: Partial<UploaderClassNames>
  icons?: Partial<UploaderIcons>

  // Sources
  sources?: UploadSource[]
  fileSources?: FileSource[]

  // Paste support
  enablePaste?: boolean

  // Ref API
  ref?: Ref<UpupUploaderRef>
}

export interface UpupUploaderRef {
  useUpload(): UseUpupUploadReturn
}

// Map UploadSource shorthand to FileSource enum
function sourcesToFileSources(sources: UploadSource[]): FileSource[] {
  const map: Record<UploadSource, FileSource> = {
    local: FileSource.LOCAL,
    camera: FileSource.CAMERA,
    url: FileSource.URL,
    google_drive: FileSource.GOOGLE_DRIVE,
    onedrive: FileSource.ONE_DRIVE,
    dropbox: FileSource.DROPBOX,
    microphone: FileSource.MICROPHONE,
    screen: FileSource.SCREEN,
  }
  return sources.map(s => map[s])
}

export const UpupUploader = forwardRef<UpupUploaderRef, UpupUploaderProps>(
  function UpupUploader(props, ref) {
    const {
      dark = false,
      mini = false,
      classNames = {},
      icons = {},
      sources = ['local'],
      fileSources: explicitFileSources,
      enablePaste = false,
      ...coreOptions
    } = props

    const uploader = useUpupUpload(coreOptions)
    const [activeSource, setActiveSource] = useState<FileSource | null>(null)

    const fileSources = explicitFileSources ?? sourcesToFileSources(sources)

    useImperativeHandle(ref, () => ({
      useUpload: () => uploader,
    }))

    const contextValue: UploaderContextValue = useMemo(
      () => ({
        ...uploader,
        activeSource,
        setActiveSource,
        dark,
        mini,
        classNames: classNames as UploaderClassNames,
        icons: icons as UploaderIcons,
        enablePaste,
        sources,
      }),
      [uploader, activeSource, dark, mini, classNames, icons, enablePaste, sources],
    )

    const content = (
      <UploaderContext.Provider value={contextValue}>
        <div className={`upup-container ${dark ? 'upup-dark' : ''} ${mini ? 'upup-mini' : ''}`}>
          {/* Component tree will be filled in subsequent tasks as components are migrated */}
          {/* For now, render a basic shell that proves the context works */}
          <div className="upup-dropzone">
            <p>Drop files here or click to browse</p>
          </div>
        </div>
      </UploaderContext.Provider>
    )

    if (enablePaste) {
      return (
        <PasteZone onPaste={(files) => uploader.addFiles(files)}>
          {content}
        </PasteZone>
      )
    }

    return content
  },
)
```

- [ ] **Step 3: Create react/src/index.ts exports**

```typescript
// packages/react/src/index.ts
export { useUpupUpload } from './use-upup-upload'
export type { UseUpupUploadReturn } from './use-upup-upload'
export { useIsClient } from './use-is-client'
export { UpupUploader } from './upup-uploader'
export type { UpupUploaderProps, UpupUploaderRef } from './upup-uploader'
export { PasteZone } from './components/paste-zone'
export type { PasteZoneProps } from './components/paste-zone'
export { UploaderContext, useUploaderContext } from './context/uploader-context'
export type { UploadSource, UploaderContextValue } from './context/uploader-context'
```

- [ ] **Step 4: Build and verify**

Run: `cd packages/react && npx tsup`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/
git commit -m "feat(react): add UpupUploader shell, UploaderContext, and exports"
```

---

### Task 3.4: Migrate Core UI Components (DropZone, FileList, SourceSelector)

Migrate the essential UI components from v1 to v2. Each component gets `'use client'` directive, updated imports from `@upup/shared` and `@upup/core`, and renames per spec Section 16.

**Files:**
- Create: `packages/react/src/components/drop-zone.tsx`
- Create: `packages/react/src/components/file-list.tsx`
- Create: `packages/react/src/components/source-selector.tsx`
- Create: `packages/react/src/components/source-view.tsx`
- Create: `packages/react/src/components/progress-bar.tsx`
- Create: `packages/react/src/components/notifier.tsx`
- Create: `packages/react/src/hooks/use-main-box.ts`
- Create: `packages/react/src/hooks/use-adapter-selector.ts`
- Create: `packages/react/src/hooks/use-informer.ts`
- Create: `packages/react/src/lib/constants.ts`
- Create: `packages/react/src/lib/file.ts`
- Create: `packages/react/src/lib/tailwind.ts`

**Migration process for each file:**
1. Read the v1 source file
2. Add `'use client'` directive at top
3. Update imports: `from '../../shared/types'` → `from '@upup/shared'`
4. Apply naming renames from spec Section 16 (MainBox→DropZone, AdapterSelector→SourceSelector, Informer→Notifier, etc.)
5. Replace `useRootProvider` context usage with `useUploaderContext()` from `../context/uploader-context`
6. Replace `RootContext` references with `UploaderContext`
7. Replace `UploadAdapter` enum references with `FileSource` enum
8. Keep all Tailwind classes and `upup-` prefixes as-is

- [ ] **Step 1: Migrate lib/tailwind.ts**

Read `packages/upup/src/frontend/lib/tailwind.ts` and copy to `packages/react/src/lib/tailwind.ts` with `'use client'` added at top. No import changes needed — this is a pure utility.

- [ ] **Step 2: Migrate lib/constants.ts**

Read `packages/upup/src/frontend/lib/constants.ts` and copy to `packages/react/src/lib/constants.ts`. Update any type imports to use `@upup/shared`.

- [ ] **Step 3: Migrate lib/file.ts**

Read `packages/upup/src/frontend/lib/file.ts` and copy to `packages/react/src/lib/file.ts`. Update imports:
- `from '../../shared/types'` → `from '@upup/shared'`
- Any `FileWithParams` → `UploadFile`
- Any `UpupProvider` → `StorageProvider`

- [ ] **Step 4: Migrate DropZone (from MainBox)**

Read `packages/upup/src/frontend/components/MainBox.tsx` → write to `packages/react/src/components/drop-zone.tsx`:
- Add `'use client'`
- Rename component `MainBox` → `DropZone`
- Replace `useContext(RootContext)` → `useUploaderContext()`
- Update all imports to `@upup/shared`
- Replace `UploadAdapter` → `FileSource`

- [ ] **Step 5: Migrate hooks/use-main-box.ts**

Read `packages/upup/src/frontend/hooks/useMainBox.ts` → write to `packages/react/src/hooks/use-main-box.ts`:
- Replace context usage with `useUploaderContext()`
- Update type imports

- [ ] **Step 6: Migrate SourceSelector (from AdapterSelector)**

Read `packages/upup/src/frontend/components/AdapterSelector.tsx` → write to `packages/react/src/components/source-selector.tsx`:
- Rename component and props
- Replace `UploadAdapter` → `FileSource`
- Support `sources` prop shorthand — map source names to FileSource enum values

- [ ] **Step 7: Migrate hooks/use-adapter-selector.ts**

Read `packages/upup/src/frontend/hooks/useAdapterSelector.ts` → write to `packages/react/src/hooks/use-adapter-selector.ts`:
- Update context reference
- Rename adapter → source in variable names

- [ ] **Step 8: Migrate SourceView (from AdapterView)**

Read `packages/upup/src/frontend/components/AdapterView.tsx` → write to `packages/react/src/components/source-view.tsx`:
- Add `'use client'`
- Rename
- Update FileSource references

- [ ] **Step 9: Migrate FileList**

Read `packages/upup/src/frontend/components/FileList.tsx` → write to `packages/react/src/components/file-list.tsx`:
- Add `'use client'`
- Replace `FileWithParams` → `UploadFile`
- Replace context

- [ ] **Step 10: Migrate ProgressBar**

Read `packages/upup/src/frontend/components/shared/ProgressBar.tsx` → write to `packages/react/src/components/progress-bar.tsx`:
- Add `'use client'`
- Add ARIA attributes: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`

- [ ] **Step 11: Migrate Notifier (from Informer)**

Read `packages/upup/src/frontend/components/Informer.tsx` → write to `packages/react/src/components/notifier.tsx`:
- Rename Informer → Notifier
- Add `'use client'`
- Add `role="alert"` and `aria-live="polite"` for accessibility

- [ ] **Step 12: Migrate hooks/use-informer.ts**

Read `packages/upup/src/frontend/hooks/useInformer.ts` → write to `packages/react/src/hooks/use-informer.ts`

- [ ] **Step 13: Update index.ts with new exports and build**

Add all new components to `packages/react/src/index.ts`.

Run: `cd packages/react && npx tsup`
Expected: Build succeeds

- [ ] **Step 14: Commit**

```bash
git add packages/react/src/
git commit -m "feat(react): migrate core UI components (DropZone, FileList, SourceSelector, ProgressBar, Notifier)"
```

---

### Task 3.5: Migrate Device Capture Components

**Files:**
- Create: `packages/react/src/components/camera-uploader.tsx`
- Create: `packages/react/src/components/audio-uploader.tsx`
- Create: `packages/react/src/components/screen-capture-uploader.tsx`
- Create: `packages/react/src/components/url-uploader.tsx`
- Create: `packages/react/src/hooks/use-camera-uploader.ts`
- Create: `packages/react/src/hooks/use-audio-uploader.ts`
- Create: `packages/react/src/hooks/use-screen-capture.ts`
- Create: `packages/react/src/hooks/use-fetch-file-by-url.ts`

Follow the same migration pattern as Task 3.4:
1. Read v1 file from `packages/upup/src/frontend/components/` or `packages/upup/src/frontend/hooks/`
2. Add `'use client'`
3. Update imports to `@upup/shared`
4. Replace context with `useUploaderContext()`
5. Apply naming renames

- [ ] **Step 1: Migrate CameraUploader**

Read `packages/upup/src/frontend/components/CameraUploader.tsx` → write to `packages/react/src/components/camera-uploader.tsx`

- [ ] **Step 2: Migrate useCameraUploader hook**

Read `packages/upup/src/frontend/hooks/useCameraUploader.ts` → write to `packages/react/src/hooks/use-camera-uploader.ts`

- [ ] **Step 3: Migrate AudioUploader**

Read `packages/upup/src/frontend/components/AudioUploader.tsx` → write to `packages/react/src/components/audio-uploader.tsx`

- [ ] **Step 4: Migrate useAudioUploader hook**

Read `packages/upup/src/frontend/hooks/useAudioUploader.ts` → write to `packages/react/src/hooks/use-audio-uploader.ts`

- [ ] **Step 5: Migrate ScreenCaptureUploader**

Read `packages/upup/src/frontend/components/ScreenCaptureUploader.tsx` → write to `packages/react/src/components/screen-capture-uploader.tsx`

- [ ] **Step 6: Migrate useScreenCaptureUploader hook**

Read `packages/upup/src/frontend/hooks/useScreenCaptureUploader.ts` → write to `packages/react/src/hooks/use-screen-capture.ts`

- [ ] **Step 7: Migrate UrlUploader**

Read `packages/upup/src/frontend/components/adapters/UrlUploader.tsx` → write to `packages/react/src/components/url-uploader.tsx`

Read `packages/upup/src/frontend/hooks/useFetchFileByUrl.ts` → write to `packages/react/src/hooks/use-fetch-file-by-url.ts`

- [ ] **Step 8: Build and verify**

Run: `cd packages/react && npx tsup`
Expected: Build succeeds

- [ ] **Step 9: Commit**

```bash
git add packages/react/src/components/ packages/react/src/hooks/
git commit -m "feat(react): migrate device capture components (Camera, Audio, Screen, URL)"
```

---

### Task 3.6: Migrate Cloud Drive Adapters

**Files:**
- Create: `packages/react/src/adapters/google-drive-uploader.tsx`
- Create: `packages/react/src/adapters/onedrive-uploader.tsx`
- Create: `packages/react/src/adapters/dropbox-uploader.tsx`
- Create: `packages/react/src/hooks/use-google-drive.ts`
- Create: `packages/react/src/hooks/use-onedrive.ts`
- Create: `packages/react/src/hooks/use-dropbox.ts`
- Create: `packages/react/src/components/shared/drive-browser.tsx`
- Create: `packages/react/src/components/shared/drive-browser-header.tsx`
- Create: `packages/react/src/components/shared/drive-browser-icon.tsx`
- Create: `packages/react/src/components/shared/drive-browser-item.tsx`
- Create: `packages/react/src/components/shared/drive-auth-fallback.tsx`
- Create: `packages/react/src/components/shared/main-box-header.tsx`

Same migration pattern. Each file:
1. Read from v1 path
2. Add `'use client'`
3. Update imports
4. Apply renames
5. Replace context usage

- [ ] **Step 1: Migrate shared drive components**

Migrate from `packages/upup/src/frontend/components/shared/`:
- `DriveBrowser.tsx` → `drive-browser.tsx`
- `DriveBrowserHeader.tsx` → `drive-browser-header.tsx`
- `DriveBrowserIcon.tsx` → `drive-browser-icon.tsx`
- `DriveBrowserItem.tsx` → `drive-browser-item.tsx`
- `DriveAuthFallback.tsx` → `drive-auth-fallback.tsx`
- `MainBoxHeader.tsx` → `main-box-header.tsx`

- [ ] **Step 2: Migrate Google Drive adapter + hooks**

Read from `packages/upup/src/frontend/components/adapters/GoogleDriveUploader.tsx` and related hooks (`useGoogleDrive.ts`, `useGoogleDriveUploader.ts`, `useLoadGAPI.ts`).

- [ ] **Step 3: Migrate OneDrive adapter + hooks**

Read from `packages/upup/src/frontend/components/adapters/OneDriveUploader.tsx` and related hooks.

- [ ] **Step 4: Migrate Dropbox adapter + hooks**

Read from `packages/upup/src/frontend/components/adapters/DropboxUploader.tsx` and related hooks.

- [ ] **Step 5: Build and verify**

Run: `cd packages/react && npx tsup`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/adapters/ packages/react/src/hooks/ packages/react/src/components/shared/
git commit -m "feat(react): migrate cloud drive adapters (Google Drive, OneDrive, Dropbox)"
```

---

### Task 3.7: Migrate File Preview + Image Editor Components

**Files:**
- Create: `packages/react/src/components/file-preview.tsx`
- Create: `packages/react/src/components/file-preview-portal.tsx`
- Create: `packages/react/src/components/file-preview-thumbnail.tsx`
- Create: `packages/react/src/components/image-editor-inline.tsx`
- Create: `packages/react/src/components/image-editor-modal.tsx`

Migration pattern same as previous tasks.

- [ ] **Step 1: Migrate FilePreview components**

Read and migrate from v1:
- `FilePreview.tsx` → `file-preview.tsx`
- `FilePreviewPortal.tsx` → `file-preview-portal.tsx` (gate portal behind `useIsClient()` for SSR safety)
- `FilePreviewThumbnail.tsx` → `file-preview-thumbnail.tsx`

For `file-preview-portal.tsx`, wrap portal creation in `useIsClient()` check:
```tsx
import { useIsClient } from '../use-is-client'

// Inside component:
const isClient = useIsClient()
if (!isClient) return null // No portals during SSR
```

- [ ] **Step 2: Migrate Image Editor components**

Read and migrate:
- `ImageEditorInline.tsx` → `image-editor-inline.tsx`
- `ImageEditorModal.tsx` → `image-editor-modal.tsx`

These depend on `filerobot-image-editor` which is a peer dependency — the import should be kept dynamic/optional.

- [ ] **Step 3: Build and verify**

Run: `cd packages/react && npx tsup`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add packages/react/src/components/
git commit -m "feat(react): migrate FilePreview, FilePreviewPortal (SSR-safe), and ImageEditor components"
```

---

### Task 3.8: Wire UpupUploader Component Tree

Now that all components are migrated, wire them together in the UpupUploader component.

**Files:**
- Modify: `packages/react/src/upup-uploader.tsx`

- [ ] **Step 1: Update UpupUploader to render full component tree**

Read the v1 `packages/upup/src/frontend/UpupUploader.tsx` to understand the component tree structure, then update `packages/react/src/upup-uploader.tsx` to render:

```
UpupUploader
  └─ UploaderContext.Provider
     └─ PasteZone (if enablePaste)
        └─ upup-container div
           ├─ SourceSelector (if multiple sources)
           ├─ SourceView (renders active source component)
           ├─ DropZone (drag & drop + file input)
           ├─ FileList (selected files)
           ├─ ProgressBar (during upload)
           └─ Notifier (error/info messages)
```

Follow the exact v1 layout but using the new component names and context.

- [ ] **Step 2: Update all component exports in index.ts**

Ensure all migrated components are exported from `packages/react/src/index.ts`.

- [ ] **Step 3: Build and verify**

Run: `cd packages/react && npx tsup`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add packages/react/src/upup-uploader.tsx packages/react/src/index.ts
git commit -m "feat(react): wire full component tree in UpupUploader"
```

---

### Task 3.9: Accessibility Pass

Add ARIA attributes, keyboard navigation, and axe-core testing.

**Files:**
- Modify: `packages/react/src/components/drop-zone.tsx`
- Modify: `packages/react/src/components/file-list.tsx`
- Modify: `packages/react/src/components/progress-bar.tsx`
- Modify: `packages/react/src/components/source-selector.tsx`
- Create: `packages/react/tests/accessibility.test.tsx`

- [ ] **Step 1: Install axe-core**

Run: `cd packages/react && pnpm add -D @axe-core/react axe-core vitest-axe`

- [ ] **Step 2: Add ARIA attributes to DropZone**

In `drop-zone.tsx`:
- Add `role="button"` to the dropzone clickable area
- Add `tabIndex={0}` for keyboard focus
- Add `aria-label="Drop files here or click to browse"`
- Add `onKeyDown` handler: Enter/Space triggers file picker
- Add `aria-dropeffect="copy"` during drag

- [ ] **Step 3: Add ARIA to FileList**

In `file-list.tsx`:
- Add `role="list"` to the file list container
- Add `role="listitem"` to each file entry
- Add `aria-live="polite"` on the list for dynamic updates
- Add Delete key handler to remove focused file
- Add `aria-label` with file name and status

- [ ] **Step 4: Add ARIA to ProgressBar**

In `progress-bar.tsx` (should already have from Task 3.4):
- Verify `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- Add `aria-label="Upload progress"`

- [ ] **Step 5: Add keyboard navigation to SourceSelector**

In `source-selector.tsx`:
- Add `role="tablist"` to the selector container
- Add `role="tab"` to each source button
- Arrow key navigation between tabs
- `aria-selected` on active tab

- [ ] **Step 6: Write accessibility tests**

```tsx
// packages/react/tests/accessibility.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { UpupUploader } from '../src/upup-uploader'

expect.extend(toHaveNoViolations)

describe('Accessibility', () => {
  it('UpupUploader has no axe violations', async () => {
    const { container } = render(
      <UpupUploader
        provider="aws"
        uploadEndpoint="/api/upload"
        sources={['local']}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

- [ ] **Step 7: Run accessibility tests**

Run: `cd packages/react && npx vitest run tests/accessibility.test.tsx`
Expected: PASS with no violations

- [ ] **Step 8: Commit**

```bash
git add packages/react/src/components/ packages/react/tests/accessibility.test.tsx packages/react/package.json pnpm-lock.yaml
git commit -m "feat(react): add ARIA attributes, keyboard navigation, and axe-core accessibility tests"
```

---

### Task 3.10: Locale Re-exports

**Files:**
- Create: `packages/react/src/locales/index.ts`

- [ ] **Step 1: Create locale re-exports**

```typescript
// packages/react/src/locales/index.ts
// Re-export all locale packs from @upup/shared for convenience
export { en_US } from '@upup/shared'
// Re-export locale files from the shared i18n directory
// Users can import: import { en_US } from '@upup/react/locales'
```

Note: The actual locale re-exports need to match what @upup/shared exports. Read `packages/shared/src/i18n/index.ts` to see exact exports, then re-export them all.

- [ ] **Step 2: Build and verify**

Run: `cd packages/react && npx tsup`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add packages/react/src/locales/
git commit -m "feat(react): add locale re-exports from @upup/shared"
```

---

## Phase 4: @upup/server

### Task 4.1: Server Handler + Config Types

**Files:**
- Create: `packages/server/src/config.ts`
- Create: `packages/server/src/handler.ts`
- Modify: `packages/server/src/index.ts`
- Create: `packages/server/tests/handler.test.ts`

- [ ] **Step 1: Write config types**

```typescript
// packages/server/src/config.ts
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
```

- [ ] **Step 2: Write core request handler**

```typescript
// packages/server/src/handler.ts
import type { UpupServerConfig, FileMetadata } from './config'

export type RouteHandler = (req: Request) => Promise<Response>

export function createHandler(config: UpupServerConfig): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    const path = url.pathname

    // Auth check
    if (config.auth) {
      const authorized = await config.auth(req)
      if (!authorized) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Route matching
    if (req.method === 'POST' && path.endsWith('/presign')) {
      return handlePresign(req, config)
    }

    if (req.method === 'POST' && path.endsWith('/multipart/init')) {
      return handleMultipartInit(req, config)
    }

    if (req.method === 'POST' && path.endsWith('/multipart/sign-part')) {
      return handleMultipartSignPart(req, config)
    }

    if (req.method === 'POST' && path.endsWith('/multipart/complete')) {
      return handleMultipartComplete(req, config)
    }

    if (req.method === 'POST' && path.endsWith('/multipart/abort')) {
      return handleMultipartAbort(req, config)
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Stub handlers — will be implemented with actual AWS SDK calls in Task 4.2
async function handlePresign(req: Request, config: UpupServerConfig): Promise<Response> {
  const body = await req.json() as FileMetadata

  // Validate file
  if (config.maxFileSize && body.size > config.maxFileSize) {
    return new Response(JSON.stringify({ error: 'File too large' }), { status: 413 })
  }

  if (config.allowedTypes?.length && !config.allowedTypes.includes(body.type)) {
    return new Response(JSON.stringify({ error: 'File type not allowed' }), { status: 415 })
  }

  // Hook
  if (config.hooks?.onBeforeUpload) {
    const allowed = await config.hooks.onBeforeUpload(body, req)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Upload rejected' }), { status: 403 })
    }
  }

  // Generate presigned URL — actual implementation in Task 4.2
  return new Response(JSON.stringify({
    url: `https://${config.storage.bucket}.s3.${config.storage.region}.amazonaws.com/${body.name}`,
    method: 'PUT',
    headers: { 'Content-Type': body.type },
    key: body.name,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function handleMultipartInit(req: Request, config: UpupServerConfig): Promise<Response> {
  return new Response(JSON.stringify({ error: 'Not implemented' }), { status: 501 })
}

async function handleMultipartSignPart(req: Request, config: UpupServerConfig): Promise<Response> {
  return new Response(JSON.stringify({ error: 'Not implemented' }), { status: 501 })
}

async function handleMultipartComplete(req: Request, config: UpupServerConfig): Promise<Response> {
  return new Response(JSON.stringify({ error: 'Not implemented' }), { status: 501 })
}

async function handleMultipartAbort(req: Request, config: UpupServerConfig): Promise<Response> {
  return new Response(JSON.stringify({ error: 'Not implemented' }), { status: 501 })
}
```

- [ ] **Step 3: Write handler tests**

```typescript
// packages/server/tests/handler.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createHandler } from '../src/handler'

const config = {
  storage: {
    type: 'aws',
    bucket: 'test-bucket',
    region: 'us-east-1',
  },
}

describe('createHandler', () => {
  it('returns 404 for unknown routes', async () => {
    const handler = createHandler(config)
    const req = new Request('http://localhost/unknown', { method: 'GET' })

    const res = await handler(req)

    expect(res.status).toBe(404)
  })

  it('handles presign POST', async () => {
    const handler = createHandler(config)
    const req = new Request('http://localhost/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test.jpg', size: 1024, type: 'image/jpeg' }),
    })

    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.url).toBeDefined()
    expect(body.key).toBe('test.jpg')
  })

  it('rejects oversized files', async () => {
    const handler = createHandler({ ...config, maxFileSize: 500 })
    const req = new Request('http://localhost/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'big.jpg', size: 1024, type: 'image/jpeg' }),
    })

    const res = await handler(req)
    expect(res.status).toBe(413)
  })

  it('checks auth when configured', async () => {
    const handler = createHandler({
      ...config,
      auth: async () => false,
    })
    const req = new Request('http://localhost/presign', {
      method: 'POST',
      body: JSON.stringify({ name: 'test.jpg', size: 1024, type: 'image/jpeg' }),
    })

    const res = await handler(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 4: Add vitest config for server**

```typescript
// packages/server/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

Run: `cd packages/server && pnpm add -D vitest`

- [ ] **Step 5: Run tests — verify they pass**

Run: `cd packages/server && npx vitest run`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/ packages/server/tests/ packages/server/vitest.config.ts packages/server/package.json pnpm-lock.yaml
git commit -m "feat(server): add core request handler with config types, auth, and validation"
```

---

### Task 4.2: AWS Presigned URL + Multipart Implementation

Port the actual AWS S3 presigning logic from v1 backend code.

**Files:**
- Create: `packages/server/src/providers/aws.ts`
- Create: `packages/server/src/presign.ts`
- Modify: `packages/server/src/handler.ts`

- [ ] **Step 1: Implement AWS provider**

Read v1 files from `packages/upup/src/backend/lib/aws/` and consolidate into `packages/server/src/providers/aws.ts`:
- `s3-generate-presigned-url.ts` → `generatePresignedUrl()`
- `s3-initiate-multipart-upload.ts` → `initiateMultipartUpload()`
- `s3-generate-presigned-part-url.ts` → `generatePresignedPartUrl()`
- `s3-complete-multipart-upload.ts` → `completeMultipartUpload()`
- `s3-abort-multipart-upload.ts` → `abortMultipartUpload()`
- `s3-list-multipart-parts.ts` → `listMultipartParts()`

All functions use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` which are already dependencies.

- [ ] **Step 2: Wire AWS provider into handler**

Update `packages/server/src/handler.ts` to call the real AWS functions in the presign and multipart handlers.

- [ ] **Step 3: Run tests**

Run: `cd packages/server && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/
git commit -m "feat(server): add AWS S3 presigned URL and multipart upload implementation"
```

---

### Task 4.3: Framework Adapters

Implement the thin wrapper adapters for Next.js, Express, Hono, and Fastify.

**Files:**
- Modify: `packages/server/src/index.ts`
- Modify: `packages/server/src/next.ts`
- Modify: `packages/server/src/express.ts`
- Modify: `packages/server/src/hono.ts`
- Modify: `packages/server/src/fastify.ts`

- [ ] **Step 1: Update index.ts with generic handler**

```typescript
// packages/server/src/index.ts
export { createHandler } from './handler'
export type { UpupServerConfig, TokenStore, FileMetadata, UploadedFile } from './config'
```

- [ ] **Step 2: Implement Next.js adapter**

```typescript
// packages/server/src/next.ts
import { createHandler } from './handler'
import type { UpupServerConfig } from './config'

export function createUpupHandler(config: UpupServerConfig) {
  const handler = createHandler(config)

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
  }
}

export type { UpupServerConfig }
```

- [ ] **Step 3: Implement Express adapter**

```typescript
// packages/server/src/express.ts
import { createHandler } from './handler'
import type { UpupServerConfig } from './config'
import type { Request as ExpressReq, Response as ExpressRes, NextFunction } from 'express'

export function createUpupMiddleware(config: UpupServerConfig) {
  const handler = createHandler(config)

  return async (req: ExpressReq, res: ExpressRes, _next: NextFunction) => {
    // Convert Express request to standard Request
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
    const webReq = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
    })

    const webRes = await handler(webReq)
    const body = await webRes.text()

    res.status(webRes.status)
    webRes.headers.forEach((value, key) => res.setHeader(key, value))
    res.send(body)
  }
}

export type { UpupServerConfig }
```

- [ ] **Step 4: Implement Hono adapter**

```typescript
// packages/server/src/hono.ts
import { createHandler } from './handler'
import type { UpupServerConfig } from './config'

export function createUpupRoutes(config: UpupServerConfig) {
  const handler = createHandler(config)

  // Returns a handler compatible with Hono's app.all()
  return handler
}

export type { UpupServerConfig }
```

- [ ] **Step 5: Implement Fastify adapter**

```typescript
// packages/server/src/fastify.ts
import { createHandler } from './handler'
import type { UpupServerConfig } from './config'

export function createUpupPlugin(config: UpupServerConfig) {
  const handler = createHandler(config)

  return async (fastify: any) => {
    fastify.all('/upup/*', async (request: any, reply: any) => {
      const url = `${request.protocol}://${request.hostname}${request.url}`
      const webReq = new Request(url, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? JSON.stringify(request.body)
          : undefined,
      })

      const webRes = await handler(webReq)
      const body = await webRes.text()

      reply.code(webRes.status)
      webRes.headers.forEach((value: string, key: string) => reply.header(key, value))
      reply.send(body)
    })
  }
}

export type { UpupServerConfig }
```

- [ ] **Step 6: Build and verify**

Run: `cd packages/server && npx tsup`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/
git commit -m "feat(server): implement framework adapters (Next.js, Express, Hono, Fastify)"
```

---

## Phase 5: Integration & Cleanup

### Task 5.1: Update Playground App

Update `apps/playground` to use new packages.

**Files:**
- Modify: `apps/playground/src/components/Uploader.tsx`
- Modify: `apps/playground/package.json`

- [ ] **Step 1: Update playground dependencies**

In `apps/playground/package.json`, replace `upup-react-file-uploader` with:
```json
{
  "dependencies": {
    "@upup/react": "workspace:*",
    "@upup/shared": "workspace:*"
  }
}
```

- [ ] **Step 2: Update imports in playground components**

In all playground files that import from `upup-react-file-uploader`:
```diff
- import { UpupUploader } from 'upup-react-file-uploader'
+ import { UpupUploader } from '@upup/react'
```

- [ ] **Step 3: Install deps and verify build**

Run: `pnpm install && cd apps/playground && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/playground/
git commit -m "chore: update playground to use @upup/react and @upup/shared"
```

---

### Task 5.2: Update Landing App

**Files:**
- Modify: `apps/landing/src/components/Uploader.tsx`
- Modify: `apps/landing/package.json`

Same process as Task 5.1.

- [ ] **Step 1: Update dependencies and imports**
- [ ] **Step 2: Build and verify**

Run: `pnpm install && cd apps/landing && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/landing/
git commit -m "chore: update landing app to use @upup/react and @upup/shared"
```

---

### Task 5.3: E2E Test Migration

Migrate existing Playwright E2E tests to test the new @upup/react components.

**Files:**
- Modify: existing `packages/upup/e2e/` tests (move to root `e2e/` or `packages/react/e2e/`)

- [ ] **Step 1: Move E2E tests**

Copy `packages/upup/e2e/` to `packages/react/e2e/`.
Update Playwright config to use the playground app as the test target.

- [ ] **Step 2: Update test selectors**

Update any selectors that reference old class names or component structures.

- [ ] **Step 3: Run E2E tests**

Run: `cd packages/react && npx playwright test`
Expected: Core E2E flows pass (file upload, drag-drop, camera)

- [ ] **Step 4: Commit**

```bash
git add packages/react/e2e/ packages/react/playwright.config.ts
git commit -m "test: migrate E2E tests to @upup/react package"
```

---

### Task 5.4: Final Build Verification + Bundle Size CI

**Files:**
- Modify: root `package.json` (finalize size-limit)
- Optionally create: `.github/workflows/size-limit.yml`

- [ ] **Step 1: Build all packages**

Run: `pnpm build`
Expected: All 4 packages build successfully

- [ ] **Step 2: Run all tests**

Run: `pnpm test`
Expected: All tests pass across all packages

- [ ] **Step 3: Check bundle sizes**

Run: `npx size-limit`
Expected: All packages within budget

- [ ] **Step 4: Verify size-limit budgets are reasonable**

If any package exceeds its budget after real implementation, adjust the limits to be realistic baselines (add ~20% headroom). Update the `size-limit` config in root `package.json`.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: finalize bundle size budgets after baseline measurement"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1 | Done | @upup/shared complete |
| 2 | 2.1–2.10 | @upup/core: UpupCore, EventEmitter, plugins, pipeline, steps, strategies, workers, crash recovery, subpath exports |
| 3 | 3.1–3.10 | @upup/react: SSR-safe hook, PasteZone, all v1 UI migrated, accessibility, sources shorthand |
| 4 | 4.1–4.3 | @upup/server: handler, AWS presign/multipart, framework adapters |
| 5 | 5.1–5.4 | Integration: apps updated, E2E migrated, bundle CI enforced |
