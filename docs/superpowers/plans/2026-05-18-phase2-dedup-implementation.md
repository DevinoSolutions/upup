# Phase 2 Deduplication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete deduplication by centralizing types, context shapes, business logic (UploaderOrchestrator), CSS, and barrel exports in `@upup/core`. Eliminates ~1,500+ lines of duplication.

**Architecture:** Framework-agnostic types and business logic live in `@upup/core`. The `UploaderOrchestrator` class owns all stateful logic with a `subscribe/getSnapshot` protocol. React connects via `useSyncExternalStore`, Vue via `shallowRef` subscription. Public API unchanged.

**Tech Stack:** TypeScript, Vitest, pnpm monorepo

**Spec:** `docs/superpowers/specs/2026-05-18-phase2-dedup-design.md`

---

## Milestones

| # | Milestone | Tasks | Risk |
|---|-----------|-------|------|
| A | Barrel re-export flattening | 1 | Low |
| B | Shared types to core | 2–3 | Low |
| C | Context shapes to core | 4–5 | Low |
| D | CSS reconciliation | 6 | Low |
| E | UploaderOrchestrator | 7–15 | Medium |
| F | Final verification | 16 | Low |

---

## Milestone A — Barrel Re-export Flattening

### Task 1: Replace wildcard exports in core/index.ts with explicit named exports

**Files:**
- Modify: `packages/core/src/index.ts`

The goal: replace the 3 `export *` lines at the top of `packages/core/src/index.ts` with explicit named exports so every public symbol is visible in one place.

- [ ] **Step 1: Enumerate all symbols exported through the wildcard chains**

Run this to discover what `export * from './contracts'` actually exports:

```bash
node -e "
const ts = require('typescript');
const fs = require('fs');
// Quick enumeration: grep all export statements from the chain
const files = [
  'packages/core/src/contracts.ts',
  'packages/core/src/types/index.ts',
  'packages/core/src/errors.ts',
  'packages/core/src/contracts-strategies.ts',
  'packages/core/src/contracts-pipeline.ts',
  'packages/core/src/i18n/index.ts',
  'packages/core/src/theme/index.ts',
];
for (const f of files) {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    const exports = content.match(/export\s+(type\s+)?\{[^}]+\}|export\s+(type|interface|enum|const|function|class)\s+\w+/g) || [];
    if (exports.length) console.log('--- ' + f + ' ---');
    exports.forEach(e => console.log('  ' + e.trim()));
  }
}
"
```

This gives the full list of symbols. Some are in the sub-files that `types/index.ts` re-exports (e.g., `types/upload-file.ts`, `types/file-source.ts`, etc.).

- [ ] **Step 2: Replace the 3 wildcard lines in `packages/core/src/index.ts`**

Replace:
```ts
export * from './contracts'
export * from './i18n'
export * from './theme'
```

With explicit named exports for every symbol. Group by source module. For example:

```ts
// ── Types (from ./types/) ────────────────────────────────
export type { UploadFile, UploadFileWithProgress } from './types/upload-file'
export type { UploadResult } from './types/upload-result'
export { FileSource } from './types/file-source'
export { StorageProvider } from './types/storage-provider'
export { UploadStatus } from './types/upload-status'
// ... continue for every exported symbol from types/

// ── Errors ───────────────────────────────────────────────
export { UploadError, UploadErrorType } from './errors'

// ── Strategy contracts ───────────────────────────────────
export type { ... } from './contracts-strategies'

// ── Pipeline contracts ───────────────────────────────────
export type { ... } from './contracts-pipeline'

// ── i18n ─────────────────────────────────────────────────
export { createTranslator, enUS, frFR, ... } from './i18n'
export type { Translations, LocaleBundle, Translator, ... } from './i18n'

// ── Theme ────────────────────────────────────────────────
export { resolveTheme, flattenSlotsToClassNames, ... } from './theme'
export type { UpupThemeConfig, UpupThemeTokens, ... } from './theme'
```

The internal barrel `contracts.ts` can stay for internal `import { X } from '../contracts'` usage within core. Only the PUBLIC barrel (`index.ts`) gets flattened.

IMPORTANT: Enumerate EVERY symbol. Missing one = breaking change for consumers. Run `pnpm --filter @upup/core build` after each batch of changes.

- [ ] **Step 3: Build core + react + vue to verify nothing broke**

```bash
pnpm --filter @upup/core build && pnpm --filter @upup/react build && pnpm --filter @upup/vue build
```

- [ ] **Step 4: Run all tests**

```bash
pnpm --filter @upup/core test && pnpm --filter @upup/react test
```

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(core): replace wildcard barrel exports with explicit named exports"
```

---

## Milestone B — Shared Types to Core

### Task 2: Move framework-agnostic types from shared/types.ts to core

**Files:**
- Create: `packages/core/src/types/uploader-options.ts`
- Modify: `packages/core/src/types/index.ts` (or `packages/core/src/index.ts` if barrel is flattened)
- Modify: `packages/react/src/shared/types.ts`
- Modify: `packages/vue/src/shared/types.ts`

These types are identical in both packages and have ZERO framework dependency:
- `ImageEditorOptions`
- `ResolvedImageEditorOptions`
- `UploadSource`
- `UploadProvider`

`UpupUploaderPropsIcons` is framework-specific (React uses `FC`, Vue uses `Component`) — stays.

- [ ] **Step 1: Create `packages/core/src/types/uploader-options.ts`**

```ts
import type { UploadFile } from './upload-file'
import type { FileSource } from './file-source'
import type { StorageProvider } from './storage-provider'

export type ImageEditorOptions = {
    enabled?: boolean
    display?: 'inline' | 'modal'
    autoOpen?: 'never' | 'single' | 'always'
    output?: {
        mimeType?: string
        quality?: number
        fileName?: (original: File) => string
    }
    tabs?: (
        | 'Adjust'
        | 'Annotate'
        | 'Filters'
        | 'Finetune'
        | 'Resize'
        | 'Watermark'
    )[]
    tools?: (
        | 'Crop'
        | 'Rotate'
        | 'Flip'
        | 'Brightness'
        | 'Contrast'
        | 'HSV'
        | 'Blur'
        | 'Text'
        | 'Line'
        | 'Rect'
        | 'Ellipse'
        | 'Polygon'
        | 'Pen'
        | 'Arrow'
        | 'Image'
    )[]
    onOpen?: (file: UploadFile) => void
    onCancel?: (file: UploadFile) => void
    onSave?: (editedFile: UploadFile, originalFile: UploadFile) => void
}

export type ResolvedImageEditorOptions = Required<
    Pick<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>
> &
    Omit<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>

export type UploadSource =
    | FileSource
    | 'local'
    | 'url'
    | 'camera'
    | 'microphone'
    | 'screen'
    | 'googleDrive'
    | 'oneDrive'
    | 'dropbox'
    | 'box'

export type UploadProvider = StorageProvider | (string & {})
```

- [ ] **Step 2: Export from core**

Add to `packages/core/src/index.ts`:
```ts
export type { ImageEditorOptions, ResolvedImageEditorOptions, UploadSource, UploadProvider } from './types/uploader-options'
```

If `types/index.ts` still exists as an internal barrel, also add `export * from './uploader-options'` there.

- [ ] **Step 3: Update React's `shared/types.ts`**

Remove `ImageEditorOptions`, `ResolvedImageEditorOptions`, `UploadSource`, `UploadProvider` type definitions. Replace with:
```ts
export type { ImageEditorOptions, ResolvedImageEditorOptions, UploadSource, UploadProvider } from '@upup/core'
```

Also remove all the unnecessary re-exports of core types (`Translations`, `GoogleDriveConfigs`, `MaxFileSizeObject`, etc.). Files that need these should import directly from `@upup/core`.

- [ ] **Step 4: Update Vue's `shared/types.ts`**

Same as Step 3 — remove definitions, re-export from `@upup/core`. Remove unnecessary pass-through re-exports.

- [ ] **Step 5: Find and fix any files that were importing these types from `shared/types` but should now import from `@upup/core`**

```bash
grep -rn "from.*shared/types" packages/react/src packages/vue/src --include='*.ts' --include='*.tsx' --include='*.vue'
```

For each hit: check if the import is for a type that now lives in core. If so, change to `from '@upup/core'`. If it's for `UpupUploaderProps` (framework-specific), it stays.

- [ ] **Step 6: Build + test all packages**

```bash
pnpm --filter @upup/core build && pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: move ImageEditorOptions, UploadSource, UploadProvider to @upup/core"
```

---

### Task 3: Clean up remaining re-exports in shared/types.ts

**Files:**
- Modify: `packages/react/src/shared/types.ts`
- Modify: `packages/vue/src/shared/types.ts`
- Modify: Various files in both packages that import re-exported core types through shared/types

After Task 2, both `shared/types.ts` files still have lines like:
```ts
export type { Translations }
export type { GoogleDriveConfigs, OneDriveConfigs, DropboxConfigs, BoxConfigs }
export type { MaxFileSizeObject, MultipartAbortResponse, ... }
```

These are pure pass-throughs of `@upup/core` types. They add no value — consumers should import directly.

- [ ] **Step 1: In React's `shared/types.ts`, remove all re-export-only lines**

Delete every `export type { X }` line where `X` was imported from `@upup/core` and has no local modification.

Keep only:
- `UpupUploaderProps` (React-specific: has `React.CSSProperties`, `FC`)
- `UpupUploaderPropsIcons` (React-specific: uses `FC`)
- Re-exports from core that the React `index.ts` depends on (check if `index.ts` re-exports anything through `shared/types`)

- [ ] **Step 2: Fix all broken imports in React**

Files that were importing `Translations` or `MaxFileSizeObject` etc. from `'../shared/types'` now need to import from `'@upup/core'`.

```bash
grep -rn "from.*shared/types" packages/react/src --include='*.ts' --include='*.tsx'
```

For each hit, check what symbols it imports. If they're core types, change to `from '@upup/core'`.

- [ ] **Step 3: Same for Vue's `shared/types.ts`**

Remove re-export lines, fix broken imports.

- [ ] **Step 4: Build + test**

```bash
pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor: remove pass-through re-exports from shared/types.ts, import core types directly"
```

---

## Milestone C — Context Shapes to Core

### Task 4: Define base context shape types in core

**Files:**
- Create: `packages/core/src/types/context-shapes.ts`
- Modify: `packages/core/src/index.ts`

These context shape types are structurally identical between React and Vue. Define them once in core.

- [ ] **Step 1: Create `packages/core/src/types/context-shapes.ts`**

```ts
import type { FileSource } from './file-source'
import type { UploadFile } from './upload-file'
import type { UploadStatus } from './upload-status'
import type { FilesProgressMap } from '../file-utils'
import type { Translations, Translator } from '../i18n'
import type { UpupCore } from '../core'
import type { ResolvedImageEditorOptions, UploadSource } from './uploader-options'
import type {
    UpupResolvedTheme,
    UpupThemeMode,
    UpupThemeTokens,
    InternalFlatClassNames,
    DeepPartialSlots,
} from '../theme'
import type { MaxFileSizeObject, ResumableUploadOptions } from './upload-protocols'

export type BaseContextUpload = {
    uploadStatus: UploadStatus
    uploadError?: string
    totalProgress: number
    filesProgressMap: FilesProgressMap
    proceedUpload: () => Promise<UploadFile[] | undefined>
    retryUpload: (fileId?: string) => Promise<UploadFile[] | undefined>
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
}

export type BaseContextRuntime = {
    core: UpupCore | null
    mode: 'client' | 'server'
    serverUrl?: string
    openFilePicker: () => void
    isOnline: boolean
}

export type BaseContextSource = {
    activeAdapter?: FileSource
    setActiveAdapter: (adapter: FileSource | undefined) => void
    oneDriveConfigs?: Record<string, string | undefined>
    googleDriveConfigs?: Record<string, string>
    dropboxConfigs?: Record<string, string | undefined>
    boxConfigs?: Record<string, string | undefined>
}

export type BaseContextI18n = {
    translations: Translations
    translator?: Translator
    lang: string
    dir: 'ltr' | 'rtl'
}

export type BaseContextFiles = {
    files: Map<string, UploadFile>
    setFiles: (newFiles: File[]) => void
    dynamicallyReplaceFiles: (files: File[] | UploadFile[]) => void
    resetState: () => void
    dynamicUpload: (files: File[] | UploadFile[]) => Promise<UploadFile[] | undefined>
    handleFileRemove: (fileId: string) => void
}

export type BaseContextUploadControls = {
    upload: BaseContextUpload
    handleDone: () => void
    handleCancel: () => void
    handlePause: () => void
    handleResume: () => void
}

export type BaseContextView = {
    isAddingMore: boolean
    setIsAddingMore: (value: boolean) => void
    viewMode: 'grid' | 'list'
    setViewMode: (mode: 'grid' | 'list') => void
}

export type BaseContextEditor = {
    editingFile: UploadFile | null
    openImageEditor: (file: UploadFile) => void
    closeImageEditor: () => void
    saveImageEdit: (editedImageData: string, mimeType?: string) => void
    replaceFile: (fileId: string, newFile: UploadFile) => void
}

export type BaseContextTheme = {
    themeMode: Exclude<UpupThemeMode, 'system'>
    isDark: boolean
    tokens: UpupThemeTokens
    resolved: UpupResolvedTheme
    slotOverrides: InternalFlatClassNames
    slots: DeepPartialSlots
}
```

Note: Some imports may need adjustment depending on what's exported from each module. Read the actual source if an import doesn't resolve.

- [ ] **Step 2: Export from `packages/core/src/index.ts`**

```ts
export type {
    BaseContextUpload, BaseContextRuntime, BaseContextSource,
    BaseContextI18n, BaseContextFiles, BaseContextUploadControls,
    BaseContextView, BaseContextEditor, BaseContextTheme,
} from './types/context-shapes'
```

- [ ] **Step 3: Build core**

```bash
pnpm --filter @upup/core build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(core): add base context shape types for framework adapters"
```

---

### Task 5: Update React and Vue context files to extend base types

**Files:**
- Modify: `packages/react/src/context/RootContext.ts`
- Modify: `packages/vue/src/context/root-context.ts`

- [ ] **Step 1: Update React's `RootContext.ts`**

Replace the local type definitions with imports from core:

```ts
import type {
    BaseContextUpload, BaseContextRuntime, BaseContextSource,
    BaseContextI18n, BaseContextFiles, BaseContextUploadControls,
    BaseContextView, BaseContextEditor, BaseContextTheme,
} from '@upup/core'

// React uses the base types directly for most contexts
export type ContextUpload = BaseContextUpload
export type ContextSource = BaseContextSource
export type ContextI18n = BaseContextI18n
export type ContextFiles = BaseContextFiles
export type ContextUploadControls = BaseContextUploadControls
export type ContextView = BaseContextView
export type ContextEditor = BaseContextEditor
export type ContextTheme = BaseContextTheme

// Runtime adds React-specific inputRef type
export type ContextRuntime = BaseContextRuntime & {
    inputRef: React.RefObject<HTMLInputElement | null>
}
```

Keep the `ContextProps`, `IRootContext`, `RootContextProvider`, and all the `useUploader*` hook functions — those are React-specific.

- [ ] **Step 2: Update Vue's `root-context.ts`**

```ts
import type {
    BaseContextUpload, BaseContextRuntime, BaseContextSource,
    BaseContextI18n, BaseContextFiles, BaseContextUploadControls,
    BaseContextView, BaseContextEditor, BaseContextTheme,
} from '@upup/core'
import type { Ref } from 'vue'

export type ContextUpload = BaseContextUpload
export type ContextSource = BaseContextSource
export type ContextI18n = BaseContextI18n
export type ContextFiles = BaseContextFiles
export type ContextUploadControls = BaseContextUploadControls
export type ContextView = BaseContextView
export type ContextEditor = BaseContextEditor

// Runtime adds Vue-specific Ref<> inputRef
export type ContextRuntime = BaseContextRuntime & {
    inputRef: Ref<HTMLInputElement | null>
}

// Theme wraps UpupResolvedTheme differently for Vue
type VueResolvedTheme = Omit<UpupResolvedTheme, 'mode'> & {
    mode: Exclude<UpupThemeMode, 'system'>
}
export type ContextTheme = Omit<BaseContextTheme, 'resolved'> & {
    resolved: VueResolvedTheme
}
```

Keep `ContextProps`, `IRootContext`, injection keys, `provideRootContext`, and all `useUploader*` functions.

- [ ] **Step 3: Build + test**

```bash
pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: context shape types now extend base types from @upup/core"
```

---

## Milestone D — CSS Reconciliation

### Task 6: Copy missing CSS rules to Vue's tailwind.css

**Files:**
- Modify: `packages/vue/src/tailwind.css`

Vue components use `upup-preview-scroll` (1×), `upup-shadow-bottom` (4×), `upup-shadow-top` (1×) but Vue's CSS is missing the `@layer` rules that define them.

- [ ] **Step 1: Append the missing rules to `packages/vue/src/tailwind.css`**

Add after the existing `@tailwind utilities;` line:

```css
@layer components {
    .upup-shadow-wrapper {
        box-shadow:
            0px 4px 50px 0px rgba(0, 0, 0, 0.08),
            0px 4px 6px 0px rgba(0, 0, 0, 0.05);
    }

    .upup-preview-scroll {
        &::-webkit-scrollbar {
            width: 6px;
        }
        &::-webkit-scrollbar-track {
            background: #eaeaea;
            border-radius: 10px;
        }
        &::-webkit-scrollbar-thumb {
            background: #c5cafb;
            border-radius: 10px;
        }
        &::-webkit-scrollbar-thumb:hover {
            background: #c5cafb;
        }
    }
}

@layer utilities {
    .upup-shadow-top {
        box-shadow: 0 -1px 0 0 rgba(128, 128, 128, 0.35);
    }
    .upup-shadow-right {
        box-shadow: 1px 0 0 0 rgba(128, 128, 128, 0.35);
    }
    .upup-shadow-bottom {
        box-shadow: 0 1px 0 0 rgba(128, 128, 128, 0.35);
    }
    .upup-shadow-left {
        box-shadow: -1px 0 0 0 rgba(128, 128, 128, 0.35);
    }
}
```

- [ ] **Step 2: Build Vue to verify CSS compiles**

```bash
pnpm --filter @upup/vue build
```

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(vue): add missing upup-shadow and upup-preview-scroll CSS rules"
```

---

## Milestone E — UploaderOrchestrator

Built incrementally. Each task moves one group of logic, both adapters are updated, and everything builds+tests at each step.

### Task 7: Create orchestrator skeleton with state types and subscribe/getSnapshot

**Files:**
- Create: `packages/core/src/orchestrator/types.ts`
- Create: `packages/core/src/orchestrator/uploader-orchestrator.ts`
- Create: `packages/core/tests/uploader-orchestrator.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the test**

```ts
// packages/core/tests/uploader-orchestrator.test.ts
import { describe, it, expect, vi } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'

function createMockCore() {
    return {
        on: vi.fn(() => () => {}),
        addFiles: vi.fn(),
        removeFile: vi.fn(),
        upload: vi.fn(),
        destroy: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        retry: vi.fn(),
        getPlugin: vi.fn(),
    } as any
}

describe('UploaderOrchestrator', () => {
    it('creates with initial state', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        const state = orch.getSnapshot()
        expect(state.files.size).toBe(0)
        expect(state.uploadStatus).toBe('idle')
        expect(state.editingFile).toBeNull()
    })

    it('subscribe/getSnapshot protocol works', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        const listener = vi.fn()
        const unsub = orch.subscribe(listener)
        expect(listener).not.toHaveBeenCalled()
        unsub()
    })

    it('unsubscribe stops notifications', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        const listener = vi.fn()
        const unsub = orch.subscribe(listener)
        unsub()
        // After unsub, listener should not be called on state changes
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @upup/core test -- uploader-orchestrator
```

- [ ] **Step 3: Create `packages/core/src/orchestrator/types.ts`**

```ts
import type { UploadFile } from '../types/upload-file'
import type { UploadStatus } from '../types/upload-status'
import type { FileSource } from '../types/file-source'
import type { FilesProgressMap } from '../file-utils'

export interface OrchestratorState {
    files: Map<string, UploadFile>
    uploadStatus: UploadStatus
    uploadError: string
    totalProgress: number
    filesProgressMap: FilesProgressMap
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
    activeAdapter?: FileSource
    editingFile: UploadFile | null
    editorQueue: UploadFile[]
    isAddingMore: boolean
    viewMode: 'grid' | 'list'
    isOnline: boolean
}

export interface OrchestratorCallbacks {
    onError?: (message: string) => void
    onWarn?: (message: string) => void
    onUploadComplete?: (files: UploadFile[]) => void
    onUploadStart?: () => void
    onFileUploadStart?: (file: UploadFile) => void
    onFileUploadProgress?: (file: UploadFile, progress: number) => void
    onFileUploadComplete?: (file: UploadFile) => void
    onFilesUploadProgress?: (totalProgress: number) => void
    onFilesUploadComplete?: (files: UploadFile[]) => void
    onFileRemoved?: (file: UploadFile) => void
    onFileDrop?: (files: File[]) => void
}
```

- [ ] **Step 4: Create `packages/core/src/orchestrator/uploader-orchestrator.ts`**

Start with just the skeleton — state + subscribe/getSnapshot:

```ts
import { UploadStatus } from '../types/upload-status'
import type { UpupCore } from '../core'
import type { OrchestratorState, OrchestratorCallbacks } from './types'

export class UploaderOrchestrator {
    private state: OrchestratorState
    private listeners = new Set<() => void>()
    private core: UpupCore
    private callbacks: OrchestratorCallbacks
    private unsubs: (() => void)[] = []

    constructor(core: UpupCore, callbacks: OrchestratorCallbacks) {
        this.core = core
        this.callbacks = callbacks
        this.state = {
            files: new Map(),
            uploadStatus: UploadStatus.IDLE,
            uploadError: '',
            totalProgress: 0,
            filesProgressMap: {},
            uploadSpeed: 0,
            uploadEta: 0,
            uploadedBytes: 0,
            totalBytes: 0,
            activeAdapter: undefined,
            editingFile: null,
            editorQueue: [],
            isAddingMore: false,
            viewMode: 'grid',
            isOnline: true,
        }
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getSnapshot = (): OrchestratorState => {
        return this.state
    }

    protected setState(partial: Partial<OrchestratorState>): void {
        this.state = { ...this.state, ...partial }
        this.notify()
    }

    private notify(): void {
        this.listeners.forEach(fn => fn())
    }

    init(): void {
        // Will be filled in subsequent tasks
    }

    destroy(): void {
        this.unsubs.forEach(u => u())
        this.unsubs = []
        this.listeners.clear()
    }
}
```

- [ ] **Step 5: Export from `packages/core/src/index.ts`**

```ts
export { UploaderOrchestrator } from './orchestrator/uploader-orchestrator'
export type { OrchestratorState, OrchestratorCallbacks } from './orchestrator/types'
```

- [ ] **Step 6: Run tests, build**

```bash
pnpm --filter @upup/core test -- uploader-orchestrator && pnpm --filter @upup/core build
```

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(core): add UploaderOrchestrator skeleton with subscribe/getSnapshot protocol"
```

---

### Task 8: Move file management logic to orchestrator

**Files:**
- Modify: `packages/core/src/orchestrator/uploader-orchestrator.ts`
- Modify: `packages/core/tests/uploader-orchestrator.test.ts`

- [ ] **Step 1: Add file management tests**

```ts
describe('file management', () => {
    it('removeFile removes from state and calls revokeFileUrl', () => {
        const core = createMockCore()
        const onFileRemoved = vi.fn()
        const orch = new UploaderOrchestrator(core, { onFileRemoved })
        // Manually set a file in state for testing
        orch.getSnapshot().files.set('test-id', { id: 'test-id', name: 'test.txt', url: 'blob:test' } as any)
        orch.removeFile('test-id')
        expect(orch.getSnapshot().files.has('test-id')).toBe(false)
        expect(core.removeFile).toHaveBeenCalledWith('test-id')
    })

    it('setActiveAdapter updates state', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        orch.setActiveAdapter('box' as any)
        expect(orch.getSnapshot().activeAdapter).toBe('box')
    })

    it('setViewMode updates state', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        orch.setViewMode('list')
        expect(orch.getSnapshot().viewMode).toBe('list')
    })
})
```

- [ ] **Step 2: Implement the methods**

Read the `handleFileRemove`, `setActiveAdapter`, `setViewMode`, `setIsAddingMore`, `dynamicallyReplaceFiles` implementations from `packages/react/src/hooks/useRootProvider.ts` and port them as class methods. The business logic is identical — just change `setFiles(...)` to `this.setState({ files: ... })`.

Add to `UploaderOrchestrator`:
```ts
removeFile(fileId: string): void { ... }
setActiveAdapter(adapter: FileSource | undefined): void { ... }
setViewMode(mode: 'grid' | 'list'): void { ... }
setIsAddingMore(value: boolean): void { ... }
dynamicallyReplaceFiles(newFiles: File[] | UploadFile[]): void { ... }
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @upup/core test -- uploader-orchestrator
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(core): add file management methods to UploaderOrchestrator"
```

---

### Task 9: Move upload control logic to orchestrator

**Files:**
- Modify: `packages/core/src/orchestrator/uploader-orchestrator.ts`
- Modify: `packages/core/tests/uploader-orchestrator.test.ts`

Port from `useRootProvider`: `proceedUpload`, `retryUpload`, `handleCancel`, `handlePause`, `handleResume`, `handleDone`, `resetState`.

- [ ] **Step 1: Add tests for upload controls**

Test that `handleCancel` resets state, `handlePause`/`handleResume` call core methods, etc.

- [ ] **Step 2: Read the React useRootProvider implementations of these functions**

Read `packages/react/src/hooks/useRootProvider.ts` lines around `proceedUpload`, `handleCancel`, `handlePause`, `handleResume`, `handleDone`, `resetState`. Port the business logic as class methods.

- [ ] **Step 3: Implement the methods**

Each method follows the pattern: do business logic → `this.setState(...)` → call `this.callbacks.onX?.(...)` if applicable.

- [ ] **Step 4: Run tests + build**

```bash
pnpm --filter @upup/core test -- uploader-orchestrator && pnpm --filter @upup/core build
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): add upload control methods to UploaderOrchestrator"
```

---

### Task 10: Move image editor logic to orchestrator

**Files:**
- Modify: `packages/core/src/orchestrator/uploader-orchestrator.ts`
- Modify: `packages/core/tests/uploader-orchestrator.test.ts`

Port: `openImageEditor`, `closeImageEditor`, `saveImageEdit`, `replaceFile`, editor queue management.

- [ ] **Step 1: Add tests**

- [ ] **Step 2: Read React implementations, port as class methods**

Read the `openImageEditor`, `closeImageEditor`, `saveImageEdit`, `replaceFile` implementations. These use `blobToUploadFile` and `dataURLtoBlob` (already in core). The editor queue logic (`editorQueue` state + auto-open next) is identical in both packages.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests + build**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): add image editor methods to UploaderOrchestrator"
```

---

### Task 11: Move lifecycle logic to orchestrator (init/destroy)

**Files:**
- Modify: `packages/core/src/orchestrator/uploader-orchestrator.ts`
- Modify: `packages/core/tests/uploader-orchestrator.test.ts`

The `init()` method wires up all `core.on()` subscriptions. The `destroy()` method tears them down.

- [ ] **Step 1: Add tests**

```ts
describe('lifecycle', () => {
    it('init wires up core event subscriptions', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        orch.init()
        expect(core.on).toHaveBeenCalled()
    })

    it('destroy unsubscribes all events', () => {
        const unsub = vi.fn()
        const core = { ...createMockCore(), on: vi.fn(() => unsub) }
        const orch = new UploaderOrchestrator(core as any, {})
        orch.init()
        orch.destroy()
        expect(unsub).toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Implement `init()`**

Read the `useEffect` blocks in `useRootProvider` that subscribe to core events:
- `core.on('files-added', ...)` — updates files state
- `core.on('file-removed', ...)` — removes from files  
- `core.on('upload-start', ...)` — sets uploadStatus
- `core.on('file-upload-progress', ...)` — updates filesProgressMap
- `core.on('upload-complete', ...)` — sets uploadStatus DONE
- Online/offline detection (`window.addEventListener('online'/'offline', ...)`)

Port all of these into `init()`, storing unsubscribe functions in `this.unsubs`.

- [ ] **Step 3: Implement plugin registration in `init()`**

Read the `registerPlugins` function from useRootProvider. It creates Dropbox/Google/Box/OneDrive plugins based on cloud drive configs. Port this as a method called from `init()`.

The orchestrator needs cloud drive config as a constructor parameter or via an `updateProps()` method.

- [ ] **Step 4: Implement crash recovery setup in `init()`**

Read the crash recovery `useEffect` from useRootProvider.

- [ ] **Step 5: Run tests + build**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(core): implement init/destroy lifecycle in UploaderOrchestrator"
```

---

### Task 12: Move helper functions (getDir, normalizeSource) to core

**Files:**
- Create: `packages/core/src/orchestrator/helpers.ts`
- Modify: `packages/core/src/index.ts`

Both packages define identical standalone helpers: `getDir()`, `normalizeSource()`, `DEFAULT_SOURCES`, `DEFAULT_MAX_FILE_SIZE`.

- [ ] **Step 1: Create `packages/core/src/orchestrator/helpers.ts`**

```ts
import { FileSource } from '../types/file-source'
import { LOCALE_META } from '../i18n'
import type { LocaleBundle } from '../i18n'

export function getDir(locale: string | LocaleBundle | undefined): 'ltr' | 'rtl' {
    if (locale && typeof locale === 'object' && 'dir' in locale) return locale.dir
    const code = typeof locale === 'string' ? locale : 'en-US'
    const base = code.split('-')[0]
    const meta = LOCALE_META[code]
        ?? Object.values(LOCALE_META).find(m => m.code.startsWith(base + '-'))
    return meta?.dir ?? 'ltr'
}

export function normalizeSource(source: string): FileSource | undefined {
    return (Object.values(FileSource) as string[]).includes(source)
        ? source as FileSource
        : undefined
}

export const DEFAULT_SOURCES = [
    FileSource.LOCAL,
    FileSource.URL,
    FileSource.CAMERA,
    FileSource.MICROPHONE,
    FileSource.SCREEN,
]

export const DEFAULT_MAX_FILE_SIZE = { size: 1, unit: 'GB' as const }
```

- [ ] **Step 2: Export from core index**

```ts
export { getDir, normalizeSource, DEFAULT_SOURCES, DEFAULT_MAX_FILE_SIZE } from './orchestrator/helpers'
```

- [ ] **Step 3: Update both useRootProvider files to import from `@upup/core`**

Delete the local `getDir()` and `normalizeSource()` function definitions from both:
- `packages/react/src/hooks/useRootProvider.ts`
- `packages/vue/src/composables/useRootProvider.ts`

Replace with: `import { getDir, normalizeSource, DEFAULT_SOURCES, DEFAULT_MAX_FILE_SIZE } from '@upup/core'`

- [ ] **Step 4: Build + test**

```bash
pnpm --filter @upup/core build && pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor: move getDir, normalizeSource, DEFAULT_SOURCES to @upup/core"
```

---

### Task 13: Rewrite React's useRootProvider to use UploaderOrchestrator

**Files:**
- Modify: `packages/react/src/hooks/useRootProvider.ts`

This is the big integration task for React. The hook shrinks from ~784 lines to ~150-200 lines.

- [ ] **Step 1: Read the current React useRootProvider completely**

Understand every piece of state, every computed value, every effect, every callback. Categorize:
- **Moves to orchestrator:** file state, upload state, editor state, core event subscriptions, plugin registration, crash recovery, online/offline
- **Stays in hook:** theme resolution (`useMemo` with framework memoization), i18n resolution, icon resolution, cloud drive config derivation, `inputRef`, `IRootContext` assembly

- [ ] **Step 2: Rewrite the hook**

The new structure:

```ts
import { useSyncExternalStore, useCallback, useEffect, useMemo, useRef } from 'react'
import { UploaderOrchestrator, type OrchestratorCallbacks } from '@upup/core'

export default function useRootProvider(props: UpupUploaderProps): IRootContext {
    // 1. Create core + orchestrator (once, via ref)
    const coreRef = useRef<UpupCore | null>(null)
    const orchRef = useRef<UploaderOrchestrator | null>(null)

    if (!coreRef.current) {
        coreRef.current = new UpupCore(coreOptions)
        const callbacks: OrchestratorCallbacks = {
            onError: props.onError,
            onUploadComplete: props.onUploadComplete,
            // ... map all callback props
        }
        orchRef.current = new UploaderOrchestrator(coreRef.current, callbacks)
    }

    // 2. Subscribe to orchestrator state (React 18 pattern)
    const state = useSyncExternalStore(
        orchRef.current!.subscribe,
        orchRef.current!.getSnapshot,
    )

    // 3. Lifecycle
    useEffect(() => {
        orchRef.current?.init()
        return () => orchRef.current?.destroy()
    }, [])

    // 4. Framework-specific computed values (theme, i18n, sources, icons)
    const themeMode = useResolvedThemeMode(theme?.mode)
    const resolvedTheme = useMemo(() => resolveTheme(theme, themeMode), [theme, themeMode])
    // ... other useMemo computations stay here

    // 5. Assemble IRootContext from orchestrator state + computed values
    return {
        core: coreRef.current,
        mode: props.mode ?? 'client',
        // ... from state:
        files: state.files,
        upload: {
            uploadStatus: state.uploadStatus,
            totalProgress: state.totalProgress,
            proceedUpload: orchRef.current!.proceedUpload.bind(orchRef.current!),
            // ...
        },
        // ... from computed:
        theme: { themeMode, resolved: resolvedTheme, ... },
        // ... methods bound to orchestrator:
        setFiles: orchRef.current!.addFiles.bind(orchRef.current!),
        handleFileRemove: orchRef.current!.removeFile.bind(orchRef.current!),
        handleCancel: orchRef.current!.cancelUpload.bind(orchRef.current!),
        // ...
    }
}
```

- [ ] **Step 3: Build + test React thoroughly**

```bash
pnpm --filter @upup/react build && pnpm --filter @upup/react test
```

All 659+ tests must pass. If tests fail, the orchestrator method signatures or behavior don't match — fix in the orchestrator, not in the tests (unless the test was testing internal implementation details).

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(react): useRootProvider now delegates to UploaderOrchestrator"
```

---

### Task 14: Rewrite Vue's useRootProvider to use UploaderOrchestrator

**Files:**
- Modify: `packages/vue/src/composables/useRootProvider.ts`

Same approach as Task 13 but with Vue's reactivity primitives.

- [ ] **Step 1: Rewrite the composable**

```ts
import { shallowRef, computed, onMounted, onUnmounted } from 'vue'
import { UploaderOrchestrator, type OrchestratorCallbacks } from '@upup/core'

export default function useRootProvider(props: UpupUploaderProps): IRootContext {
    // 1. Create core + orchestrator
    const core = new UpupCore(coreOptions)
    const callbacks: OrchestratorCallbacks = { ... }
    const orch = new UploaderOrchestrator(core, callbacks)

    // 2. Subscribe to orchestrator state (Vue pattern)
    const state = shallowRef(orch.getSnapshot())
    const unsub = orch.subscribe(() => {
        state.value = orch.getSnapshot()
    })

    // 3. Lifecycle
    onMounted(() => orch.init())
    onUnmounted(() => {
        orch.destroy()
        unsub()
    })

    // 4. Framework-specific computed values
    const themeMode = computed(() => { ... })
    const resolvedTheme = computed(() => resolveTheme(theme, themeMode.value))

    // 5. Assemble IRootContext
    return {
        core,
        files: computed(() => state.value.files),
        upload: {
            uploadStatus: computed(() => state.value.uploadStatus),
            proceedUpload: orch.proceedUpload.bind(orch),
            // ...
        },
        // ...
    }
}
```

- [ ] **Step 2: Build Vue**

```bash
pnpm --filter @upup/vue build
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(vue): useRootProvider now delegates to UploaderOrchestrator"
```

---

### Task 15: Delete dead code from useRootProvider files

**Files:**
- Modify: `packages/react/src/hooks/useRootProvider.ts`
- Modify: `packages/vue/src/composables/useRootProvider.ts`

After Tasks 13–14, the old inline business logic should be unreachable. Clean up any leftover dead code.

- [ ] **Step 1: Verify both files are now under 200 lines each**

```bash
wc -l packages/react/src/hooks/useRootProvider.ts packages/vue/src/composables/useRootProvider.ts
```

If either is still over 250 lines, there's dead code to remove.

- [ ] **Step 2: Remove any commented-out code, unused imports, or unreachable functions**

- [ ] **Step 3: Build + test everything**

```bash
pnpm --filter @upup/core build && pnpm --filter @upup/core test && pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead code from useRootProvider after orchestrator migration"
```

---

## Milestone F — Final Verification

### Task 16: Full monorepo verification

- [ ] **Step 1: Full build**

```bash
pnpm build
```

- [ ] **Step 2: Full test suite**

```bash
pnpm test
```

- [ ] **Step 3: Verify line reduction**

```bash
wc -l packages/react/src/hooks/useRootProvider.ts packages/vue/src/composables/useRootProvider.ts
```

Expected: Each under 200 lines (down from ~780).

```bash
wc -l packages/react/src/shared/types.ts packages/vue/src/shared/types.ts
```

Expected: Each under 80 lines (down from 324/213).

- [ ] **Step 4: Verify no remaining unnecessary duplicates**

```bash
# Context types should reference base types from core
grep -c "BaseContext" packages/react/src/context/RootContext.ts packages/vue/src/context/root-context.ts
```

Expected: Non-zero count in both files.

- [ ] **Step 5: Commit any final fixups**

```bash
git commit -m "chore: Phase 2 deduplication complete — orchestrator, types, context, CSS, barrel"
```
