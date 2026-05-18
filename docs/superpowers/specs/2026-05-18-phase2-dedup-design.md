# Phase 2 Deduplication — Design Spec

**Goal:** Complete the deduplication of `@upup/react` and `@upup/vue` by centralizing types, context shapes, business logic, CSS, and barrel exports in `@upup/core`.

**Prerequisite:** Phase 1 dedup is complete (15 tasks, utilities moved, `bindAdapterEvents` created).

**Public API:** No changes. Consumers of `@upup/react` and `@upup/vue` see zero difference.

**Estimated effort:** 3 days

---

## Part 1 — Barrel Re-export Flattening

### Problem

`core/index.ts` has 3 wildcard re-export chains:
```
core/index.ts → export * from './contracts'
contracts.ts  → export * from './types' → export * from './errors' → export * from './contracts-strategies' → ...
types/index.ts → export * from './upload-file' → export * from './upload-result' → ...
```

An agent (or human) needs to chase 3 levels to find where `UploadFile` is defined.

### Design

Replace all `export *` chains in `core/index.ts` with explicit named exports. One level, all symbols visible at the barrel.

**Before:**
```ts
export * from './contracts'
export * from './i18n'
export * from './theme'
```

**After:**
```ts
// Types
export type { UploadFile, UploadFileWithProgress } from './types/upload-file'
export type { UploadResult } from './types/upload-result'
export { FileSource } from './types/file-source'
export { StorageProvider } from './types/storage-provider'
export { UploadStatus } from './types/upload-status'
// ... every named export listed explicitly
```

`contracts.ts` can stay as an internal barrel for files that import `from '../contracts'` within core — but `core/index.ts` (the public barrel) becomes fully explicit.

---

## Part 2 — Shared Types Cleanup

### Problem

Both `react/src/shared/types.ts` (324 lines) and `vue/src/shared/types.ts` (213 lines):
- Import types from `@upup/core` and re-export them
- Define their own types like `ImageEditorOptions`, `UpupUploaderProps`, `UploadSource`
- Same type name defined in both files with near-identical shapes

### Design

**Move to core (framework-agnostic types):**
- `ImageEditorOptions` — no framework dep, just option shapes
- `ResolvedImageEditorOptions` — computed from `ImageEditorOptions`
- `UploadSource` — string union type
- `UploadProvider` — string union type
- `UpupUploaderPropsIcons` — icon name mapping

**Create:** `core/src/types/uploader-options.ts`

**Stays in each package (framework-specific):**
- `UpupUploaderProps` — React version has `FC` callback types, Vue version has Vue-specific types
- Re-exports of core types (can be removed since consumers should import from `@upup/core` directly)

**After cleanup, each package's `shared/types.ts` shrinks to ~50 lines** — only the framework-specific `UpupUploaderProps` definition and a few adapting types.

Stop re-exporting core types through `shared/types.ts`. Files that need `Translations` import directly from `@upup/core`.

---

## Part 3 — Context Shape Types

### Problem

10 context shape types (`ContextUpload`, `ContextRuntime`, `ContextSource`, etc.) are defined independently in both:
- `react/src/context/RootContext.ts` (403 lines)
- `vue/src/context/root-context.ts` (242 lines)

They're structurally identical except Vue wraps some fields with `Ref<>`.

### Design

**Create:** `core/src/types/context-shapes.ts`

Define the base context shapes as framework-agnostic interfaces:

```ts
export interface BaseContextUpload {
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

export interface BaseContextRuntime {
    core: UpupCore | null
    mode: 'client' | 'server'
    serverUrl?: string
    openFilePicker: () => void
    isOnline: boolean
}

// ... BaseContextSource, BaseContextI18n, BaseContextFiles,
// BaseContextUploadControls, BaseContextView, BaseContextEditor,
// BaseContextTheme, BaseContextProps
```

React uses these directly (no wrapping needed). Vue wraps with `Ref<>` where it needs reactive primitive fields:

```ts
// vue/src/context/root-context.ts
import type { BaseContextRuntime } from '@upup/core'
import type { Ref } from 'vue'

export type ContextRuntime = Omit<BaseContextRuntime, 'core'> & {
    core: UpupCore | null  // not wrapped in Ref — passed as-is
    inputRef: Ref<HTMLInputElement | null>  // Vue-specific addition
}
```

The framework-specific fields (`inputRef: Ref<...>` in Vue, `inputRef: RefObject<...>` in React) are added by each package. The shared shape covers ~80% of the fields.

---

## Part 4 — CSS Reconciliation

### Problem

React's `tailwind.css` (49 lines) has custom `@layer` rules:
- `.upup-shadow-wrapper` — component shadow
- `.upup-preview-scroll` — custom scrollbar styling
- `.upup-shadow-top/right/bottom/left` — directional shadows

Vue's `tailwind.css` is just 3 lines (`@tailwind base/components/utilities`).

### Design

**Check which classes Vue actually uses:**
- Grep Vue components for `upup-shadow-wrapper`, `upup-preview-scroll`, `upup-shadow-top`, etc.
- If used: copy the CSS rules from React to Vue's `tailwind.css`
- If not used: Vue has different component structure, no action needed

**Do NOT create shared CSS in core.** CSS bundling from a non-framework package adds complexity (PostCSS config, import chains). The pragmatic fix is: if Vue needs the same rules, copy them to Vue's `tailwind.css`. Two copies of 46 lines of CSS is acceptable — CSS duplication is not the same maintenance burden as logic duplication.

---

## Part 5 — UploaderOrchestrator

### Problem

`useRootProvider` is 784 lines (React) and 777 lines (Vue) of near-identical business logic. Every feature change must be applied twice.

### Design

**Create:** `core/src/orchestrator.ts` (~500 lines)

The `UploaderOrchestrator` is a framework-agnostic class that owns:
- All state (files, upload status, progress, editor state, crash recovery, etc.)
- All business logic (add/remove files, upload, pause/resume/cancel, image editor, plugin registration)
- All `core.on()` event subscriptions (wired up in `init()`, torn down in `destroy()`)

**State management pattern:** `subscribe/getSnapshot` — React uses `useSyncExternalStore`, Vue uses `shallowRef` + subscription callback.

```ts
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
    isProcessing: boolean
}

export interface OrchestratorCallbacks {
    onError?: (message: string) => void
    onWarn?: (message: string) => void
    onUploadComplete?: (files: UploadFile[]) => void
    onFileUploadStart?: (file: UploadFile) => void
    onFileUploadProgress?: (file: UploadFile, progress: number) => void
    onFileUploadComplete?: (file: UploadFile) => void
    onFilesUploadProgress?: (totalProgress: number) => void
    onFilesUploadComplete?: (files: UploadFile[]) => void
    onUploadStart?: () => void
    onFileRemoved?: (file: UploadFile) => void
    onFileDrop?: (files: File[]) => void
}

export class UploaderOrchestrator {
    private state: OrchestratorState
    private listeners = new Set<() => void>()
    private core: UpupCore
    private callbacks: OrchestratorCallbacks
    private unsubs: (() => void)[] = []

    constructor(core: UpupCore, callbacks: OrchestratorCallbacks, initialProps: OrchestratorProps)

    // --- External store protocol ---
    subscribe(listener: () => void): () => void
    getSnapshot(): OrchestratorState

    // --- Lifecycle ---
    init(): void       // wire up core.on() subscriptions, crash recovery, plugins
    destroy(): void    // tear down subscriptions, cleanup

    // --- File management ---
    addFiles(files: File[]): Promise<void>
    removeFile(fileId: string): void
    replaceFile(fileId: string, newFile: UploadFile): void
    dynamicUpload(files: File[] | UploadFile[]): Promise<UploadFile[] | undefined>
    dynamicallyReplaceFiles(files: File[] | UploadFile[]): void

    // --- Upload control ---
    proceedUpload(): Promise<UploadFile[] | undefined>
    retryUpload(fileId?: string): Promise<UploadFile[] | undefined>
    cancelUpload(): void
    pauseUpload(): void
    resumeUpload(): void
    handleDone(): void
    resetState(): void

    // --- Image editor ---
    openImageEditor(file: UploadFile): void
    closeImageEditor(): void
    saveImageEdit(dataUrl: string, mimeType?: string): void

    // --- Adapter ---
    setActiveAdapter(adapter: FileSource | undefined): void

    // --- View ---
    setViewMode(mode: 'grid' | 'list'): void
    setIsAddingMore(value: boolean): void

    // --- Internal ---
    private notify(): void  // calls all listeners
    private setState(partial: Partial<OrchestratorState>): void
    private registerPlugins(): void
    private setupCrashRecovery(): void
    private wireUpCoreEvents(): void
}
```

**React adapter** (`useRootProvider` shrinks to ~100 lines):

```ts
export default function useRootProvider(props: UpupUploaderProps): IRootContext {
    const coreRef = useRef<UpupCore | null>(null)
    const orchRef = useRef<UploaderOrchestrator | null>(null)
    
    // Create core + orchestrator once
    if (!coreRef.current) {
        coreRef.current = new UpupCore(options)
        orchRef.current = new UploaderOrchestrator(coreRef.current, callbacks, props)
    }
    
    // Subscribe to orchestrator state
    const state = useSyncExternalStore(
        orchRef.current.subscribe,
        orchRef.current.getSnapshot,
    )
    
    // Lifecycle
    useEffect(() => {
        orchRef.current?.init()
        return () => orchRef.current?.destroy()
    }, [])
    
    // Map to IRootContext (same shape as before)
    return {
        upload: { ...state upload fields... },
        files: state.files,
        setFiles: orchRef.current.addFiles,
        // ...
    }
}
```

**Vue adapter** (`useRootProvider` shrinks to ~100 lines):

```ts
export default function useRootProvider(props: UpupUploaderProps): IRootContext {
    const core = new UpupCore(options)
    const orch = new UploaderOrchestrator(core, callbacks, props)
    
    const state = shallowRef(orch.getSnapshot())
    orch.subscribe(() => { state.value = orch.getSnapshot() })
    
    onMounted(() => orch.init())
    onUnmounted(() => orch.destroy())
    
    // Map to IRootContext
    return {
        upload: computed(() => ({ ...state.value upload fields })),
        files: computed(() => state.value.files),
        setFiles: orch.addFiles.bind(orch),
        // ...
    }
}
```

### Migration Strategy

The orchestrator is built incrementally:
1. Create the class with the `subscribe/getSnapshot` protocol
2. Move functions one group at a time (file management first, then upload, then editor, etc.)
3. Each group: move logic to orchestrator, update BOTH adapters, test
4. After all groups moved, the adapters are thin and the orchestrator owns everything

This avoids an all-or-nothing migration. At each step, the package builds and tests pass.

---

## Execution Order

| Step | What | Depends on | Risk |
|------|------|-----------|------|
| 1 | Barrel flattening | Nothing | Low |
| 2 | Shared types to core | Step 1 (cleaner imports) | Low |
| 3 | Context shapes to core | Step 2 (types available) | Low |
| 4 | CSS audit | Nothing (independent) | Low |
| 5 | UploaderOrchestrator | Steps 2+3 (types ready) | Medium |

Steps 1 and 4 can run in parallel. Steps 2 and 3 are sequential. Step 5 is the big one.
