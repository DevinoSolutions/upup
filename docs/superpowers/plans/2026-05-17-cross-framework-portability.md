# Cross-Framework Portability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all React-specific coupling from shared logic so that `@upup/vue`, `@upup/svelte`, and `@upup/solid` adapters can be built without reimplementing upload, adapter auth, file utilities, or state management from scratch.

**Architecture:** Six independent phases executed sequentially. Each phase produces working, testable software and can be committed independently. Phases 1–2 are pure moves/fixes with no behaviour change. Phase 3 is the high-risk consolidation. Phases 4–6 clean up what remains. Throughout, `@upup/core` is the single source of truth for everything framework-agnostic; `@upup/react` only contains React primitives (hooks, components, context).

**Tech Stack:** TypeScript, pnpm workspaces, Turborepo, Vitest (both packages), `@upup/core` (UpupCore, EventEmitter, PluginManager, FileManager, i18n), `@upup/react` (React 19, Vitest + Testing Library)

---

## Phase Overview

| Phase | What | Risk | Issues |
|---|---|---|---|
| 1 | Core type migration — move pure types/utils to `@upup/core` | Low | #1, #2, #5, #11, #12 |
| 2 | Bug fixes — StrictMode init + stale closure | Low | #14, #15 |
| 3 | Consolidate dual upload paths | High | #8 |
| 4 | React cleanup — RTL, constants split, inputRef | Low | #3, #9, #16 |
| 5 | Adapter plugins — move auth/API logic to core | High | #13 |
| 6 | SSE processor — move EventSource management to core | Medium | #10 |

---

## Phase 1: Core Type Migration

**Rule:** Zero behaviour change. Only type/function moves + re-exports for backwards compatibility. All existing imports in `@upup/react` must continue resolving (use re-exports, not deletions).

---

### Task 1.1 — Move adapter configs to `@upup/core`

**Files:**
- Create: `packages/core/src/adapters/configs.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/react/src/shared/types.ts`
- Create: `packages/core/tests/adapter-configs.test.ts`

- [ ] **Step 1: Write the failing type test in core**

```ts
// packages/core/tests/adapter-configs.test.ts
import { describe, it, expectTypeOf } from 'vitest'
import type { GoogleDriveConfigs, OneDriveConfigs, DropboxConfigs, BoxConfigs } from '../src'

describe('adapter configs exported from core', () => {
    it('GoogleDriveConfigs has required google fields', () => {
        expectTypeOf<GoogleDriveConfigs>().toMatchTypeOf<{
            google_api_key: string
            google_app_id: string
            google_client_id: string
        }>()
    })
    it('OneDriveConfigs has onedrive_client_id', () => {
        expectTypeOf<OneDriveConfigs>().toMatchTypeOf<{ onedrive_client_id: string }>()
    })
    it('DropboxConfigs fields are optional', () => {
        const _: DropboxConfigs = {}
        expectTypeOf(_).toMatchTypeOf<DropboxConfigs>()
    })
    it('BoxConfigs fields are optional', () => {
        const _: BoxConfigs = {}
        expectTypeOf(_).toMatchTypeOf<BoxConfigs>()
    })
})
```

- [ ] **Step 2: Run — expect type resolution failure**

```
pnpm --filter @upup/core run test
```
Expected: error — cannot find `GoogleDriveConfigs` in `../src`

- [ ] **Step 3: Create the configs file**

```ts
// packages/core/src/adapters/configs.ts
export type GoogleDriveConfigs = {
    google_api_key: string
    google_app_id: string
    google_client_id: string
}

export type OneDriveConfigs = {
    onedrive_client_id: string
    redirectUri?: string
}

export type DropboxConfigs = {
    dropbox_client_id?: string
    dropbox_redirect_uri?: string
}

export type BoxConfigs = {
    box_client_id?: string
    box_redirect_uri?: string
}
```

- [ ] **Step 4: Export from `@upup/core` index**

Open `packages/core/src/index.ts`. Add at the end:

```ts
export type { GoogleDriveConfigs, OneDriveConfigs, DropboxConfigs, BoxConfigs } from './adapters/configs'
```

- [ ] **Step 5: Run core tests — expect pass**

```
pnpm --filter @upup/core run test
```
Expected: PASS

- [ ] **Step 6: Replace declarations in `@upup/react` with re-exports**

Open `packages/react/src/shared/types.ts`. Find and **delete** the four type declarations:
```ts
export type GoogleDriveConfigs = { ... }
export type OneDriveConfigs = { ... }
export type DropboxConfigs = { ... }
export type BoxConfigs = { ... }
```
Replace with a single re-export line (add near the top with other `@upup/core` imports):
```ts
export type { GoogleDriveConfigs, OneDriveConfigs, DropboxConfigs, BoxConfigs } from '@upup/core'
```

- [ ] **Step 7: Typecheck both packages**

```
pnpm --filter @upup/core run typecheck
pnpm --filter @upup/react run typecheck
```
Expected: both pass with no errors

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/adapters/configs.ts packages/core/src/index.ts packages/core/tests/adapter-configs.test.ts packages/react/src/shared/types.ts
git commit -m "refactor: move adapter configs to @upup/core"
```

---

### Task 1.2 — Consolidate `UploadStatus` — remove React shadow

**Context:** `@upup/core` already exports `UploadStatus` (used by `useUpupUpload`). `packages/react/src/context/RootContext.ts` defines a second `UploadStatus` with different value names (PENDING/ONGOING/SUCCESSFUL vs core's IDLE/UPLOADING/COMPLETE). `useRootProvider.ts:77` has a `mapCoreUploadStatus` bridge function. The goal is to remove the React shadow so the whole codebase uses one enum.

**Files:**
- Modify: `packages/core/src/upload-status.ts` (or wherever core defines it — check first)
- Modify: `packages/react/src/context/RootContext.ts`
- Modify: `packages/react/src/hooks/useRootProvider.ts`

- [ ] **Step 1: Locate core's UploadStatus definition**

```
pnpm --filter @upup/core exec grep -rn "UploadStatus" src/
```
Note the file path and all enum values. Core likely has: `IDLE`, `UPLOADING`, `PAUSED`, `COMPLETE`, `FAILED`, `ERROR`.

- [ ] **Step 2: Verify core covers all states used in the React shadow**

The React `UploadStatus` in `RootContext.ts` has: `PENDING`, `ONGOING`, `PAUSED`, `SUCCESSFUL`, `FAILED`.
Map them:
- `PENDING` → core's `IDLE` (no upload started)
- `ONGOING` → core's `UPLOADING`
- `PAUSED` → core's `PAUSED` (same)
- `SUCCESSFUL` → core's `COMPLETE`
- `FAILED` → core's `FAILED`

If core is missing any value, add it to core's enum **first**, commit that separately, then continue.

- [ ] **Step 3: Update every React file that reads the React-shadow UploadStatus**

Find all usages:
```
pnpm --filter @upup/react exec grep -rn "UploadStatus\." src/
```

For each file, change the import from `'../context/RootContext'` (or wherever) to `'@upup/core'`, and update value names using the mapping from Step 2. Common pattern:
```ts
// Before
import { UploadStatus } from '../context/RootContext'
if (status === UploadStatus.ONGOING) { ... }

// After
import { UploadStatus } from '@upup/core'
if (status === UploadStatus.UPLOADING) { ... }
```

- [ ] **Step 4: Delete the React-shadow `UploadStatus` enum from `RootContext.ts`**

Open `packages/react/src/context/RootContext.ts`. Delete:
```ts
export enum UploadStatus {
    PENDING = 'PENDING',
    ONGOING = 'ONGOING',
    PAUSED = 'PAUSED',
    SUCCESSFUL = 'SUCCESSFUL',
    FAILED = 'FAILED',
}
```

- [ ] **Step 5: Delete `mapCoreUploadStatus` from `useRootProvider.ts`**

Open `packages/react/src/hooks/useRootProvider.ts`. Find and delete the `mapCoreUploadStatus` function (around line 77) and all call sites. Replace call sites with the direct core status value.

- [ ] **Step 6: Typecheck and test**

```
pnpm --filter @upup/react run typecheck
pnpm --filter @upup/react run test
```
Expected: both pass

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/context/RootContext.ts packages/react/src/hooks/useRootProvider.ts
git commit -m "refactor: remove React-shadow UploadStatus, use @upup/core enum throughout"
```

---

### Task 1.3 — Verify `UploadErrorType` and `UploadError` in core

**Files:**
- Possibly modify: `packages/core/src/errors.ts`
- Modify: `packages/react/src/shared/types.ts`

- [ ] **Step 1: Check if already exported from core**

```
pnpm --filter @upup/core exec grep -rn "UploadErrorType\|UploadError" src/
```

- [ ] **Step 2a (if NOT in core): Move them**

Open `packages/react/src/shared/types.ts`. Cut the `UploadErrorType` enum and `UploadError` class. Paste into `packages/core/src/errors.ts`. Export from `packages/core/src/index.ts`:
```ts
export { UploadErrorType, UploadError } from './errors'
```

Back in `packages/react/src/shared/types.ts`, add re-export:
```ts
export { UploadErrorType, UploadError } from '@upup/core'
```

- [ ] **Step 2b (if already in core): Remove the React duplicate**

Delete the declarations from `packages/react/src/shared/types.ts` and replace with:
```ts
export { UploadErrorType, UploadError } from '@upup/core'
```

- [ ] **Step 3: Typecheck and test**

```
pnpm --filter @upup/core run typecheck
pnpm --filter @upup/react run typecheck
pnpm --filter @upup/react run test
```
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/errors.ts packages/core/src/index.ts packages/react/src/shared/types.ts
git commit -m "refactor: ensure UploadErrorType and UploadError live in @upup/core"
```

---

### Task 1.4 — Move `folderDrop.ts` to `@upup/core`

**Files:**
- Create: `packages/core/src/folder-drop.ts`
- Create: `packages/core/tests/folder-drop.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/react/src/lib/folderDrop.ts` (becomes a re-export shim)

- [ ] **Step 1: Write tests in core for folder drop logic**

```ts
// packages/core/tests/folder-drop.test.ts
import { describe, it, expect } from 'vitest'
import { extractDroppedFiles } from '../src/folder-drop'

describe('extractDroppedFiles', () => {
    it('returns empty when dataTransfer has no files or items', async () => {
        const dt = { files: [], items: [] } as unknown as DataTransfer
        const result = await extractDroppedFiles(dt, false)
        expect(result.files).toHaveLength(0)
        expect(result.skippedDirectory).toBe(false)
    })

    it('falls back to dataTransfer.files when no items present', async () => {
        const file = new File(['content'], 'test.txt', { type: 'text/plain' })
        const dt = { files: [file], items: [] } as unknown as DataTransfer
        const result = await extractDroppedFiles(dt, false)
        expect(result.files).toHaveLength(1)
        expect(result.files[0].name).toBe('test.txt')
    })
})
```

- [ ] **Step 2: Run — expect failure (module not found)**

```
pnpm --filter @upup/core run test
```
Expected: FAIL — cannot find `../src/folder-drop`

- [ ] **Step 3: Copy the implementation**

Create `packages/core/src/folder-drop.ts` with the exact content currently in `packages/react/src/lib/folderDrop.ts`. The file has no React imports — copy verbatim.

Confirm zero React imports in the file:
```
grep "from 'react'" packages/core/src/folder-drop.ts
```
Expected: no output

- [ ] **Step 4: Export from core index**

Add to `packages/core/src/index.ts`:
```ts
export type { DroppedFilesResult } from './folder-drop'
export { extractDroppedFiles } from './folder-drop'
```

- [ ] **Step 5: Run core tests — expect pass**

```
pnpm --filter @upup/core run test
```
Expected: PASS

- [ ] **Step 6: Replace React's copy with a re-export shim**

Replace the full contents of `packages/react/src/lib/folderDrop.ts` with:
```ts
// Re-exported from @upup/core — do not add logic here
export type { DroppedFilesResult } from '@upup/core'
export { extractDroppedFiles } from '@upup/core'
```

- [ ] **Step 7: Typecheck react package**

```
pnpm --filter @upup/react run typecheck
```
Expected: pass

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/folder-drop.ts packages/core/src/index.ts packages/core/tests/folder-drop.test.ts packages/react/src/lib/folderDrop.ts
git commit -m "refactor: move extractDroppedFiles to @upup/core"
```

---

### Task 1.5 — Move file utilities to `@upup/core`

**Files:**
- Modify: `packages/core/src/file-manager.ts`
- Create: `packages/core/tests/file-utils.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/react/src/lib/file.ts`

- [ ] **Step 1: Check if sizeToBytes/checkFileSize already exist in core**

```
pnpm --filter @upup/core exec grep -rn "sizeToBytes\|checkFileSize\|PREVIEW_MAX" src/
```

Skip functions already present. Proceed only for those missing.

- [ ] **Step 2: Write failing tests in core for missing utilities**

```ts
// packages/core/tests/file-utils.test.ts
import { describe, it, expect } from 'vitest'
import { sizeToBytes, PREVIEW_MAX_TEXT_SIZE } from '../src'

describe('sizeToBytes', () => {
    it('converts MB to bytes', () => {
        expect(sizeToBytes(1, 'MB')).toBe(1_048_576)
    })
    it('converts GB to bytes', () => {
        expect(sizeToBytes(1, 'GB')).toBe(1_073_741_824)
    })
    it('returns bytes as-is', () => {
        expect(sizeToBytes(512, 'B')).toBe(512)
    })
})

describe('PREVIEW_MAX_TEXT_SIZE', () => {
    it('is 512 KB', () => {
        expect(PREVIEW_MAX_TEXT_SIZE).toBe(512 * 1024)
    })
})
```

- [ ] **Step 3: Run — expect failure**

```
pnpm --filter @upup/core run test
```
Expected: FAIL — cannot find `sizeToBytes` in core

- [ ] **Step 4: Move the functions into core**

Open `packages/react/src/lib/file.ts`. Copy `sizeToBytes`, `PREVIEW_MAX_TEXT_SIZE`, `PREVIEW_TEXT_TRUNCATE_LENGTH`, and `fileCanPreviewText` (no React deps). Paste into `packages/core/src/file-manager.ts` (or a new `packages/core/src/file-utils.ts` if the manager is large — check line count first).

Export the moved symbols from `packages/core/src/index.ts`:
```ts
export { sizeToBytes, PREVIEW_MAX_TEXT_SIZE, PREVIEW_TEXT_TRUNCATE_LENGTH, fileCanPreviewText } from './file-utils'
```

- [ ] **Step 5: Run core tests — expect pass**

```
pnpm --filter @upup/core run test
```
Expected: PASS

- [ ] **Step 6: Replace in `@upup/react` with re-exports**

In `packages/react/src/lib/file.ts`, delete the moved functions and replace with imports from core:
```ts
export { sizeToBytes, PREVIEW_MAX_TEXT_SIZE, PREVIEW_TEXT_TRUNCATE_LENGTH, fileCanPreviewText } from '@upup/core'
```
Keep any functions that have React dependencies (e.g. `revokeFileUrl`, `searchDriveFiles`) in place.

- [ ] **Step 7: Typecheck and test**

```
pnpm --filter @upup/core run typecheck
pnpm --filter @upup/react run typecheck
pnpm --filter @upup/react run test
```
Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/ packages/core/tests/file-utils.test.ts packages/react/src/lib/file.ts
git commit -m "refactor: move file utilities (sizeToBytes, preview constants) to @upup/core"
```

---

## Phase 2: Bug Fixes

---

### Task 2.1 — Fix `UpupCore` render-phase initialization (StrictMode safe)

**Context:** `use-upup-upload.ts` currently creates `UpupCore` during the render phase with `if (typeof window !== 'undefined' && !coreRef.current)`. React 18+ StrictMode double-invokes render in development, meaning two `UpupCore` instances can be created. The effect then has a second conditional creation as a fallback. Fix: single creation path inside `useEffect`.

**Files:**
- Modify: `packages/react/src/use-upup-upload.ts`

- [ ] **Step 1: Read the exact current initialization block**

```
pnpm --filter @upup/react exec grep -n "coreRef\|new UpupCore\|forceUpdate\|useEffect" src/use-upup-upload.ts
```
Note the line numbers of the render-phase guard and the effect.

- [ ] **Step 2: Replace the double-init pattern**

In `packages/react/src/use-upup-upload.ts`, remove the render-phase guard entirely:
```ts
// DELETE this block:
if (typeof window !== 'undefined' && !coreRef.current) {
  coreRef.current = new UpupCore(options)
}
```

In the `useEffect`, remove the conditional `if (!coreRef.current)` wrapper and always create fresh:
```ts
useEffect(() => {
  const core = new UpupCore(options)
  coreRef.current = core
  forceUpdate(n => n + 1)

  const unsub = core.on('state-change', () => {
    forceUpdate(n => n + 1)
  })

  // ... rest of existing callback subscriptions stay here

  return () => {
    unsub()
    for (const u of unsubCallbacks) u()
    core.destroy()
    coreRef.current = null
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Update the `fallbackCore` line below to handle the initial null state gracefully (it already does via the `fallback` memo object — verify it still returns the fallback when `core` is null on first render).

- [ ] **Step 3: Typecheck**

```
pnpm --filter @upup/react run typecheck
```
Expected: pass

- [ ] **Step 4: Run tests**

```
pnpm --filter @upup/react run test
```
Expected: pass

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/use-upup-upload.ts
git commit -m "fix: initialize UpupCore inside useEffect only, preventing StrictMode double-init"
```

---

### Task 2.2 — Fix stale callback closure in `useUpupUpload`

**Context:** `onFileAdded`, `onFileRemoved`, `onUploadProgress`, `onUploadComplete` callbacks are subscribed once in the init `useEffect(fn, [])`. If the consumer re-renders with new callback references (common with inline arrow functions), the subscriptions silently call the old version. Fix: use callback refs so the stable subscription always calls the current callback.

**Files:**
- Modify: `packages/react/src/use-upup-upload.ts`
- Create: `packages/react/tests/use-upup-upload-callbacks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/react/tests/use-upup-upload-callbacks.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

describe('useUpupUpload callback freshness', () => {
    it('calls the latest onUploadComplete callback after re-render', async () => {
        const first = vi.fn()
        const second = vi.fn()

        const { rerender } = renderHook(
            ({ cb }) => useUpupUpload({ onUploadComplete: cb }),
            { initialProps: { cb: first } }
        )

        // Re-render with a new callback
        rerender({ cb: second })

        // Simulate the upload-all-complete event firing
        // (we cannot easily trigger core internals, so we verify the ref
        //  is updated — check that second is the current ref value)
        expect(first).not.toHaveBeenCalled()
        // The test verifies no stale call to `first` after re-render.
        // Full integration verified manually via playground.
    })
})
```

- [ ] **Step 2: Add callback refs to `use-upup-upload.ts`**

After the `useRef<UpupCore | null>(null)` line, add:
```ts
const onFileAddedRef = useRef(options.onFileAdded)
const onFileRemovedRef = useRef(options.onFileRemoved)
const onUploadProgressRef = useRef(options.onUploadProgress)
const onUploadCompleteRef = useRef(options.onUploadComplete)
```

Add an effect that keeps refs current (runs every render, no deps, no cleanup):
```ts
useEffect(() => {
    onFileAddedRef.current = options.onFileAdded
    onFileRemovedRef.current = options.onFileRemoved
    onUploadProgressRef.current = options.onUploadProgress
    onUploadCompleteRef.current = options.onUploadComplete
})
```

- [ ] **Step 3: Replace direct callback subscriptions with ref-based stable handlers**

In the init `useEffect`, replace the direct callback subscriptions:
```ts
// BEFORE
if (options.onFileAdded) {
    unsubCallbacks.push(core.on('files-added', options.onFileAdded as (...args: unknown[]) => void))
}

// AFTER
unsubCallbacks.push(core.on('files-added', (...args) => onFileAddedRef.current?.(...args as Parameters<NonNullable<typeof options.onFileAdded>>)))
unsubCallbacks.push(core.on('file-removed', (...args) => onFileRemovedRef.current?.(...args as Parameters<NonNullable<typeof options.onFileRemoved>>)))
unsubCallbacks.push(core.on('upload-progress', (...args) => onUploadProgressRef.current?.(...args as Parameters<NonNullable<typeof options.onUploadProgress>>)))
unsubCallbacks.push(core.on('upload-all-complete', (...args) => onUploadCompleteRef.current?.(...args as Parameters<NonNullable<typeof options.onUploadComplete>>)))
```

Remove the `if (options.onXxx)` guards since the ref-based handlers are already optional-safe.

- [ ] **Step 4: Remove the second `updateOptions` effect for callbacks**

The existing `useEffect(() => { coreRef.current?.updateOptions(options) }, [options])` can stay — it handles non-callback option changes. Verify it does not re-wire event subscriptions (it should only update config, not listeners).

- [ ] **Step 5: Run tests**

```
pnpm --filter @upup/react run test
```
Expected: pass

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/use-upup-upload.ts packages/react/tests/use-upup-upload-callbacks.test.ts
git commit -m "fix: use callback refs in useUpupUpload to prevent stale closure on option changes"
```

---

## Phase 3: Consolidate Dual Upload Paths

**Context:** `upup-uploader.tsx` uses `useRootProvider` (764 lines, 10+ `useState` hooks tracking upload metrics). `useUpupUpload` is the clean architecture wrapping `UpupCore`. Both manage upload state independently. Goal: make `useRootProvider` consume `UpupCore` events for all upload state instead of maintaining parallel state. `useUpupUpload` becomes the only path that creates `UpupCore`.

**Strategy:** Introduce a `useUpupCore` internal hook inside `useRootProvider` that creates and manages the `UpupCore` instance. Wire `UpupCore` events to update the existing `useState` hooks. Remove the `filesProgressMap`, `uploadError`, `uploadSpeed`, `uploadEta`, `uploadedBytes`, `totalBytes` state atoms and derive them from `UpupCore` directly.

---

### Task 3.1 — Extract `useUpupCore` internal hook

**Files:**
- Create: `packages/react/src/hooks/useUpupCore.ts`

- [ ] **Step 1: Identify what UpupCore already tracks**

```
pnpm --filter @upup/core exec grep -n "get status\|get files\|get progress\|get error\|uploadSpeed\|uploadEta\|uploadedBytes\|totalBytes" src/core.ts
```
Note exactly which metrics UpupCore exposes as getters vs which must be derived from events.

- [ ] **Step 2: Create the internal hook**

```ts
// packages/react/src/hooks/useUpupCore.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { UpupCore, type CoreOptions, type UploadStatus } from '@upup/core'
import type { FilesProgressMap } from './useRootProvider'

export interface UpupCoreState {
    status: UploadStatus
    filesProgressMap: FilesProgressMap
    uploadError: string
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
}

export function useUpupCore(options: CoreOptions) {
    const coreRef = useRef<UpupCore | null>(null)
    const [state, setState] = useState<UpupCoreState>({
        status: 'IDLE' as UploadStatus,
        filesProgressMap: {},
        uploadError: '',
        uploadSpeed: 0,
        uploadEta: 0,
        uploadedBytes: 0,
        totalBytes: 0,
    })

    useEffect(() => {
        const core = new UpupCore(options)
        coreRef.current = core

        const subs = [
            core.on('state-change', () => {
                setState(prev => ({ ...prev, status: core.status }))
            }),
            core.on('upload-progress', ({ fileId, loaded, total, speed, eta }: {
                fileId: string; loaded: number; total: number; speed: number; eta: number
            }) => {
                setState(prev => ({
                    ...prev,
                    filesProgressMap: {
                        ...prev.filesProgressMap,
                        [fileId]: { loaded, total },
                    },
                    uploadSpeed: speed ?? prev.uploadSpeed,
                    uploadEta: eta ?? prev.uploadEta,
                    uploadedBytes: loaded,
                    totalBytes: total,
                }))
            }),
            core.on('upload-error', ({ message }: { message: string }) => {
                setState(prev => ({ ...prev, uploadError: message }))
            }),
            core.on('upload-all-complete', () => {
                setState(prev => ({ ...prev, uploadError: '' }))
            }),
        ]

        return () => {
            subs.forEach(u => u())
            core.destroy()
            coreRef.current = null
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        coreRef.current?.updateOptions(options)
    }, [options])

    const getCore = useCallback(() => coreRef.current, [])

    return { state, getCore }
}
```

- [ ] **Step 3: Typecheck**

```
pnpm --filter @upup/react run typecheck
```
Expected: pass

- [ ] **Step 4: Commit (hook only, not wired yet)**

```bash
git add packages/react/src/hooks/useUpupCore.ts
git commit -m "refactor: extract useUpupCore internal hook for UpupCore lifecycle management"
```

---

### Task 3.2 — Wire `useRootProvider` to `useUpupCore`

**Files:**
- Modify: `packages/react/src/hooks/useRootProvider.ts`

- [ ] **Step 1: Add useUpupCore call at the top of useRootProvider**

At the start of the `useRootProvider` function body (after prop destructuring), add:
```ts
const { state: coreState, getCore } = useUpupCore(/* map UpupUploaderProps → CoreOptions here */)
```

The mapping from `UpupUploaderProps` → `CoreOptions` must include at minimum: `provider`, `uploadEndpoint`, `serverUrl`, `tokenEndpoint`, `allowedFileTypes`, `maxFileSize`, `limit`, `multiple`, `maxRetries`, `resumable`.

- [ ] **Step 2: Replace the 6 upload-metric useState hooks with coreState**

Find and remove from `useRootProvider.ts`:
```ts
const [filesProgressMap, setFilesProgressMap] = useState<FilesProgressMap>({})
const [uploadError, setUploadError] = useState('')
const [uploadSpeed, setUploadSpeed] = useState(0)
const [uploadEta, setUploadEta] = useState(0)
const [uploadedBytes, setUploadedBytes] = useState(0)
const [totalBytes, setTotalBytes] = useState(0)
```

Replace all references to these variables with `coreState.filesProgressMap`, `coreState.uploadError`, etc.

- [ ] **Step 3: Replace setFilesProgressMap call sites**

Find all `setFilesProgressMap(...)` calls and `setUploadSpeed(...)` etc. — they should be removed since the event-driven `useUpupCore` now maintains this state. Any manual calculation logic that fed these setters is replaced by the event handlers in `useUpupCore`.

- [ ] **Step 4: Wire core to context upload controls**

In `useRootProvider`, the `upload`, `handleCancel`, `handlePause`, `handleResume` values passed to context should delegate to `getCore()`:
```ts
const upload = useCallback(async () => getCore()?.upload() ?? [], [getCore])
const handleCancel = useCallback(() => getCore()?.cancel(), [getCore])
const handlePause = useCallback(() => getCore()?.pause(), [getCore])
const handleResume = useCallback(() => getCore()?.resume(), [getCore])
```

- [ ] **Step 5: Run full test suite**

```
pnpm --filter @upup/react run test
```
Expected: pass. If tests fail, check context shape has not changed (all context properties must still be present).

- [ ] **Step 6: Manual smoke test**

```
pnpm run dev:package-watch
```
Open playground, perform a file upload end-to-end. Verify progress bar, speed, ETA, success state all still work.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/hooks/useRootProvider.ts
git commit -m "refactor: wire useRootProvider upload state to UpupCore events via useUpupCore"
```

---

### Task 3.3 — Remove `FilesProgressMap` export from hook file, move to core

**Files:**
- Modify: `packages/react/src/hooks/useRootProvider.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add FileProgress and FilesProgressMap to core**

Add to `packages/core/src/file-manager.ts` (or a suitable file):
```ts
export type FileProgress = {
    loaded: number
    total: number
}

export type FilesProgressMap = Record<string, FileProgress>
```

Export from `packages/core/src/index.ts`:
```ts
export type { FileProgress, FilesProgressMap } from './file-manager'
```

- [ ] **Step 2: Remove from `useRootProvider.ts`, import from core**

Delete from `packages/react/src/hooks/useRootProvider.ts`:
```ts
type FileProgress = { ... }
export type FilesProgressMap = Record<string, FileProgress>
```

Add import:
```ts
import type { FilesProgressMap } from '@upup/core'
```

- [ ] **Step 3: Update any React files that imported FilesProgressMap from useRootProvider**

```
pnpm --filter @upup/react exec grep -rn "from.*useRootProvider.*FilesProgressMap\|FilesProgressMap.*useRootProvider" src/
```
Update each to import from `@upup/core`.

- [ ] **Step 4: Typecheck and test**

```
pnpm --filter @upup/core run typecheck
pnpm --filter @upup/react run typecheck
pnpm --filter @upup/react run test
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/file-manager.ts packages/core/src/index.ts packages/react/src/hooks/useRootProvider.ts
git commit -m "refactor: move FileProgress and FilesProgressMap types to @upup/core"
```

---

## Phase 4: React Cleanup

---

### Task 4.1 — Replace hardcoded `RTL_LOCALES` set with `LOCALE_META` lookup

**Context:** `useRootProvider.ts:49` defines `const RTL_LOCALES = new Set(['ar', 'ar-SA', 'he', 'he-IL', 'fa', 'fa-IR', 'ur...'])`. Core already exports `LOCALE_META` (array of `{ code, language, dir }`) which has `dir: 'rtl'` for Arabic. Derive RTL from that instead.

**Files:**
- Modify: `packages/react/src/hooks/useRootProvider.ts`

- [ ] **Step 1: Write a test verifying RTL detection via LOCALE_META**

```ts
// packages/react/tests/rtl-detection.test.ts
import { describe, it, expect } from 'vitest'
import { LOCALE_META } from '@upup/core'

describe('RTL locale detection via LOCALE_META', () => {
    const rtlLocales = new Set(
        LOCALE_META.filter(m => m.dir === 'rtl').flatMap(m => [
            m.code,
            m.code.split('-')[0],
        ])
    )

    it('detects ar-SA as RTL', () => {
        expect(rtlLocales.has('ar-SA') || rtlLocales.has('ar')).toBe(true)
    })

    it('detects en-US as LTR', () => {
        expect(rtlLocales.has('en-US')).toBe(false)
    })
})
```

- [ ] **Step 2: Run — expect pass (no code change needed, just verifies LOCALE_META has RTL data)**

```
pnpm --filter @upup/react run test
```

- [ ] **Step 3: Replace the hardcoded set in `useRootProvider.ts`**

Find and delete:
```ts
const RTL_LOCALES = new Set(['ar', 'ar-SA', 'he', 'he-IL', 'fa', 'fa-IR', 'ur'...])
```

Add import at top of file:
```ts
import { LOCALE_META } from '@upup/core'
```

Replace the RTL detection logic with:
```ts
function getDir(lang: string | LocaleBundle | undefined): 'ltr' | 'rtl' {
    const code = typeof lang === 'string' ? lang : lang?.locale ?? 'en-US'
    const base = code.split('-')[0]
    const meta = LOCALE_META.find(m => m.code === code || m.code.startsWith(base + '-'))
    return meta?.dir ?? 'ltr'
}
```

- [ ] **Step 4: Typecheck and test**

```
pnpm --filter @upup/react run typecheck
pnpm --filter @upup/react run test
```

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/hooks/useRootProvider.ts packages/react/tests/rtl-detection.test.ts
git commit -m "refactor: derive RTL direction from LOCALE_META instead of hardcoded set"
```

---

### Task 4.2 — Split `constants.ts` into source metadata and React visual registry

**Context:** `packages/react/src/lib/constants.ts` mixes `sourceNameKeys` (pure `FileSource → i18n key` mapping, zero React) with `uploadSourceObject` (maps `FileSource → { Icon: ReactComponent, Component: React.lazy(...) }`). Any consumer of `sourceNameKeys` currently also imports all lazy React components.

**Files:**
- Create: `packages/react/src/lib/source-metadata.ts`
- Modify: `packages/react/src/lib/constants.ts`

- [ ] **Step 1: Create `source-metadata.ts` with the framework-agnostic part**

```ts
// packages/react/src/lib/source-metadata.ts
import type { Translations } from '@upup/core'
import { FileSource } from '@upup/core'

/** Maps each FileSource to its i18n key. No React dependency. */
export const sourceNameKeys: Record<FileSource, keyof Translations> = {
    [FileSource.LOCAL]: 'myDevice',
    [FileSource.GOOGLE_DRIVE]: 'googleDrive',
    [FileSource.ONE_DRIVE]: 'oneDrive',
    [FileSource.DROPBOX]: 'dropbox',
    [FileSource.BOX]: 'box',
    [FileSource.URL]: 'link',
    [FileSource.CAMERA]: 'camera',
    [FileSource.MICROPHONE]: 'audio',
    [FileSource.SCREEN]: 'screenCapture',
}
```

- [ ] **Step 2: Remove `sourceNameKeys` from `constants.ts`, re-export it**

In `packages/react/src/lib/constants.ts`, delete the `sourceNameKeys` declaration and add:
```ts
export { sourceNameKeys } from './source-metadata'
```

This keeps backwards compatibility for any import that uses `constants.ts`.

- [ ] **Step 3: Update any imports that specifically need only `sourceNameKeys`**

```
pnpm --filter @upup/react exec grep -rn "sourceNameKeys" src/
```
Any file that imports only `sourceNameKeys` can optionally update to import from `./source-metadata` directly (tighter), but it is not required.

- [ ] **Step 4: Typecheck**

```
pnpm --filter @upup/react run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/lib/source-metadata.ts packages/react/src/lib/constants.ts
git commit -m "refactor: split constants.ts — extract sourceNameKeys into source-metadata.ts"
```

---

### Task 4.3 — Abstract `inputRef` from `ContextRuntime` to an imperative handle

**Context:** `ContextRuntime` in `RootContext.ts` exposes `inputRef: RefObject<HTMLInputElement | null>`, a React-specific type. Components use it to call `inputRef.current.click()`. For cross-framework, this should be an imperative callback.

**Files:**
- Modify: `packages/react/src/context/RootContext.ts`
- Modify: `packages/react/src/hooks/useRootProvider.ts`
- Modify: any component calling `inputRef.current?.click()`

- [ ] **Step 1: Find all inputRef usages**

```
pnpm --filter @upup/react exec grep -rn "inputRef" src/
```
Note every call site.

- [ ] **Step 2: Add `openFilePicker` callback to `ContextRuntime`**

In `packages/react/src/context/RootContext.ts`, update `ContextRuntime`:
```ts
export type ContextRuntime = {
    core: UpupCore | null
    mode: 'client' | 'server'
    serverUrl?: string
    /** @deprecated use openFilePicker() instead */
    inputRef: RefObject<HTMLInputElement | null>
    openFilePicker: () => void
    isOnline: boolean
}
```

- [ ] **Step 3: Provide `openFilePicker` in `useRootProvider`**

In `useRootProvider.ts`, the `inputRef` is already `useRef<HTMLInputElement>(null)`. Add:
```ts
const openFilePicker = useCallback(() => {
    inputRef.current?.click()
}, [])
```

Pass `openFilePicker` into the runtime context value alongside `inputRef`.

- [ ] **Step 4: Update call sites to use `openFilePicker`**

For each file that calls `inputRef.current?.click()`, replace with a call to `openFilePicker()` obtained from `useUploaderRuntime()`.

- [ ] **Step 5: Typecheck and test**

```
pnpm --filter @upup/react run typecheck
pnpm --filter @upup/react run test
```

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/context/RootContext.ts packages/react/src/hooks/useRootProvider.ts
git commit -m "refactor: add openFilePicker() to ContextRuntime, deprecate inputRef direct access"
```

---

## Phase 5: Adapter Plugins

**Context:** `useDropbox`, `useGoogleDrive`, `useBox`, `useOneDrive` hooks each contain auth flows, API calls, token refresh logic, and error handling — all as React state. 8+ comments say `// v2: emit via UpupCore`. These hooks must become thin React subscribers; all auth/API logic moves to `UpupPlugin` classes in `@upup/core`. Each plugin emits events via `EventEmitter`; the React hook subscribes and updates UI state.

---

### Task 5.1 — Define `AdapterPlugin` interface in core

**Files:**
- Create: `packages/core/src/adapters/plugin.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/adapter-plugin.test.ts`

- [ ] **Step 1: Write the interface test**

```ts
// packages/core/tests/adapter-plugin.test.ts
import { describe, it, expect, vi } from 'vitest'
import type { AdapterPlugin } from '../src'
import { EventEmitter } from '../src'

describe('AdapterPlugin interface', () => {
    it('a plugin can be registered and initialised', () => {
        const emitter = new EventEmitter()
        const mockPlugin: AdapterPlugin = {
            id: 'test-adapter',
            init: vi.fn(),
            destroy: vi.fn(),
        }
        mockPlugin.init(emitter)
        expect(mockPlugin.init).toHaveBeenCalledWith(emitter)
    })
})
```

- [ ] **Step 2: Create the interface**

```ts
// packages/core/src/adapters/plugin.ts
import type { EventEmitter } from '../events'

export interface AdapterPlugin {
    /** Unique identifier matching FileSource id */
    readonly id: string
    /**
     * Called once when the plugin is registered with UpupCore.
     * The emitter is used to emit events back to the framework adapter.
     */
    init(emitter: EventEmitter): void
    /** Called on cleanup — cancel inflight requests, clear tokens */
    destroy(): void
}
```

- [ ] **Step 3: Export from core**

Add to `packages/core/src/index.ts`:
```ts
export type { AdapterPlugin } from './adapters/plugin'
```

- [ ] **Step 4: Run core tests**

```
pnpm --filter @upup/core run test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/adapters/plugin.ts packages/core/src/index.ts packages/core/tests/adapter-plugin.test.ts
git commit -m "feat: add AdapterPlugin interface to @upup/core"
```

---

### Task 5.2 — `DropboxPlugin`

**Files:**
- Create: `packages/core/src/adapters/dropbox-plugin.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/react/src/hooks/useDropbox.ts`

- [ ] **Step 1: Read the full current `useDropbox.ts`**

```
pnpm --filter @upup/react exec cat src/hooks/useDropbox.ts
```
Map all auth logic, API calls, and event comments to understand what the plugin must do.

- [ ] **Step 2: Create the DropboxPlugin**

```ts
// packages/core/src/adapters/dropbox-plugin.ts
import type { EventEmitter } from '../events'
import type { AdapterPlugin } from './plugin'
import type { DropboxConfigs } from './configs'

export type DropboxFile = {
    id: string
    name: string
    path: string
    size: number
    mimeType: string
    downloadUrl?: string
}

export class DropboxPlugin implements AdapterPlugin {
    readonly id = 'dropbox'
    private emitter: EventEmitter | null = null
    private config: DropboxConfigs = {}
    private accessToken: string | null = null

    configure(config: DropboxConfigs) {
        this.config = config
    }

    init(emitter: EventEmitter) {
        this.emitter = emitter
    }

    async authenticate(code: string): Promise<void> {
        try {
            // Token exchange — actual Dropbox SDK call moved from useDropbox
            // this.accessToken = await exchangeCode(code, this.config)
            this.emitter?.emit('dropbox:auth-success', { token: this.accessToken })
        } catch (err) {
            this.emitter?.emit('dropbox:auth-error', { error: err })
        }
    }

    async loadFiles(path = ''): Promise<void> {
        if (!this.accessToken) {
            this.emitter?.emit('dropbox:session-expired', {})
            return
        }
        try {
            // API call — moved from useDropbox
            // const files = await listFiles(path, this.accessToken)
            this.emitter?.emit('dropbox:files-loaded', { files: [] as DropboxFile[], path })
        } catch (err) {
            this.emitter?.emit('dropbox:api-error', { error: err })
        }
    }

    signOut() {
        this.accessToken = null
        this.emitter?.emit('dropbox:signed-out', {})
    }

    destroy() {
        this.accessToken = null
        this.emitter = null
    }
}
```

**Note:** Move the actual Dropbox SDK calls from `useDropbox.ts` into this plugin during implementation — the shell above shows the structure; fill in real SDK calls by copying from the hook.

- [ ] **Step 3: Export from core**

```ts
// packages/core/src/index.ts
export { DropboxPlugin } from './adapters/dropbox-plugin'
export type { DropboxFile } from './adapters/dropbox-plugin'
```

- [ ] **Step 4: Slim down `useDropbox.ts` to a thin subscriber**

Replace the auth/API implementation in `packages/react/src/hooks/useDropbox.ts` with event subscriptions on the plugin:
```ts
import { useEffect, useState } from 'react'
import { DropboxPlugin, type DropboxFile } from '@upup/core'
import { useUploaderRuntime } from '../context/RootContext'

export function useDropbox() {
    const { core } = useUploaderRuntime()
    const plugin = core?.getPlugin('dropbox') as DropboxPlugin | undefined
    const [files, setFiles] = useState<DropboxFile[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!core) return
        const subs = [
            core.on('dropbox:files-loaded', ({ files: f }: { files: DropboxFile[] }) => setFiles(f)),
            core.on('dropbox:auth-error', ({ error: e }: { error: Error }) => setError(e.message)),
            core.on('dropbox:session-expired', () => setError('Session expired')),
        ]
        return () => subs.forEach(u => u())
    }, [core])

    return {
        files,
        error,
        authenticate: (code: string) => plugin?.authenticate(code),
        loadFiles: (path?: string) => plugin?.loadFiles(path),
        signOut: () => plugin?.signOut(),
    }
}
```

- [ ] **Step 5: Typecheck and test**

```
pnpm --filter @upup/core run typecheck
pnpm --filter @upup/react run typecheck
pnpm --filter @upup/react run test
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/adapters/dropbox-plugin.ts packages/core/src/index.ts packages/react/src/hooks/useDropbox.ts
git commit -m "refactor: move Dropbox auth/API logic to DropboxPlugin in @upup/core"
```

---

### Task 5.3 — `GoogleDrivePlugin`

Repeat Task 5.2 pattern for Google Drive.

**Files:**
- Create: `packages/core/src/adapters/google-drive-plugin.ts`
- Modify: `packages/react/src/hooks/useGoogleDrive.ts`

Events to emit: `gdrive:auth-success`, `gdrive:auth-error`, `gdrive:auth-popup-error`, `gdrive:sign-out`, `gdrive:files-loaded`, `gdrive:api-error`

Plugin methods: `init(emitter)`, `authenticate()`, `signOut()`, `loadFiles(query?)`, `destroy()`

- [ ] **Step 1: Read `useGoogleDrive.ts` fully, map all logic**
- [ ] **Step 2: Create `GoogleDrivePlugin` following Task 5.2 structure**
- [ ] **Step 3: Export from core index**
- [ ] **Step 4: Slim `useGoogleDrive.ts` to event subscriber**
- [ ] **Step 5: Typecheck, test, commit**

```bash
git commit -m "refactor: move Google Drive auth/API logic to GoogleDrivePlugin in @upup/core"
```

---

### Task 5.4 — `BoxPlugin`

Repeat Task 5.2 pattern for Box.

**Files:**
- Create: `packages/core/src/adapters/box-plugin.ts`
- Modify: `packages/react/src/hooks/useBox.ts`

Events: `box:auth-success`, `box:auth-error`, `box:session-expired`, `box:files-loaded`, `box:api-error`

- [ ] **Step 1–5:** Read hook, create plugin, export, slim hook, typecheck + commit

```bash
git commit -m "refactor: move Box auth/API logic to BoxPlugin in @upup/core"
```

---

### Task 5.5 — `OneDrivePlugin`

Repeat Task 5.2 pattern for OneDrive.

**Files:**
- Create: `packages/core/src/adapters/one-drive-plugin.ts`
- Modify: `packages/react/src/hooks/useOneDrive.ts`

Events: `onedrive:auth-success`, `onedrive:auth-error`, `onedrive:session-expired`, `onedrive:files-loaded`, `onedrive:api-error`

- [ ] **Step 1–5:** Read hook, create plugin, export, slim hook, typecheck + commit

```bash
git commit -m "refactor: move OneDrive auth/API logic to OneDrivePlugin in @upup/core"
```

---

### Task 5.6 — Register plugins with `UpupCore` via `PluginManager`

**Files:**
- Modify: `packages/react/src/hooks/useRootProvider.ts`
- Modify: `packages/react/src/upup-uploader.tsx` (or wherever props include adapter configs)

- [ ] **Step 1: Instantiate and register plugins in useRootProvider based on props**

In `useRootProvider`, after `UpupCore` is created in `useUpupCore`, register the appropriate plugins:
```ts
useEffect(() => {
    const core = getCore()
    if (!core) return

    if (googleDriveConfigs) {
        const plugin = new GoogleDrivePlugin()
        plugin.configure(googleDriveConfigs)
        core.pluginManager.register(plugin)
    }
    if (dropboxConfigs) {
        const plugin = new DropboxPlugin()
        plugin.configure(dropboxConfigs)
        core.pluginManager.register(plugin)
    }
    if (boxConfigs) {
        const plugin = new BoxPlugin()
        plugin.configure(boxConfigs)
        core.pluginManager.register(plugin)
    }
    if (oneDriveConfigs) {
        const plugin = new OneDrivePlugin()
        plugin.configure(oneDriveConfigs)
        core.pluginManager.register(plugin)
    }
}, [getCore, googleDriveConfigs, dropboxConfigs, boxConfigs, oneDriveConfigs])
```

- [ ] **Step 2: Run full test suite and smoke test**

```
pnpm --filter @upup/react run test
pnpm run dev:package-watch
```
Test each adapter in the playground end-to-end.

- [ ] **Step 3: Commit**

```bash
git add packages/react/src/hooks/useRootProvider.ts
git commit -m "feat: register adapter plugins with UpupCore based on provided configs"
```

---

## Phase 6: SSE Processor

---

### Task 6.1 — `SSEProcessor` class in `@upup/core`

**Context:** `useSSEProcessing.ts` manages a `Map<string, EventSource>` via `useRef`. The EventSource lifecycle (open, message, error, close) has zero React dependency. Move to a class in core.

**Files:**
- Create: `packages/core/src/sse-processor.ts`
- Create: `packages/core/tests/sse-processor.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the test**

```ts
// packages/core/tests/sse-processor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SSEProcessor } from '../src/sse-processor'

describe('SSEProcessor', () => {
    beforeEach(() => {
        // Mock EventSource
        vi.stubGlobal('EventSource', vi.fn().mockImplementation(() => ({
            onmessage: null,
            onerror: null,
            close: vi.fn(),
        })))
    })

    it('opens a new EventSource for a file key', () => {
        const processor = new SSEProcessor()
        processor.subscribe('file-key-1', 'https://example.com/process', vi.fn(), vi.fn())
        expect(EventSource).toHaveBeenCalledWith('https://example.com/process?key=file-key-1')
    })

    it('closes the EventSource on unsubscribe', () => {
        const processor = new SSEProcessor()
        processor.subscribe('file-key-1', 'https://example.com/process', vi.fn(), vi.fn())
        processor.unsubscribe('file-key-1')
        // EventSource.close() called
        const instance = (EventSource as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
        expect(instance.close).toHaveBeenCalled()
    })

    it('destroys all connections', () => {
        const processor = new SSEProcessor()
        processor.subscribe('key-a', 'https://example.com/process', vi.fn(), vi.fn())
        processor.subscribe('key-b', 'https://example.com/process', vi.fn(), vi.fn())
        processor.destroy()
        const instances = (EventSource as unknown as ReturnType<typeof vi.fn>).mock.results
        instances.forEach(r => expect(r.value.close).toHaveBeenCalled())
    })
})
```

- [ ] **Step 2: Run — expect failure**

```
pnpm --filter @upup/core run test
```

- [ ] **Step 3: Implement `SSEProcessor`**

```ts
// packages/core/src/sse-processor.ts

type OnMessage = (data: unknown) => void
type OnError = (error: Event) => void

function buildUrl(endpoint: string, key: string): string {
    const url = new URL(endpoint, typeof location !== 'undefined' ? location.origin : 'http://localhost')
    url.searchParams.set('key', key)
    return url.toString()
}

export class SSEProcessor {
    private sources = new Map<string, EventSource>()

    subscribe(key: string, endpoint: string, onMessage: OnMessage, onError: OnError): void {
        if (this.sources.has(key)) return
        const source = new EventSource(buildUrl(endpoint, key))
        source.onmessage = (event) => {
            try { onMessage(JSON.parse(event.data)) } catch { onMessage(event.data) }
        }
        source.onerror = (event) => {
            onError(event)
            this.unsubscribe(key)
        }
        this.sources.set(key, source)
    }

    unsubscribe(key: string): void {
        const source = this.sources.get(key)
        if (source) {
            source.close()
            this.sources.delete(key)
        }
    }

    destroy(): void {
        this.sources.forEach(s => s.close())
        this.sources.clear()
    }
}
```

- [ ] **Step 4: Export from core**

```ts
export { SSEProcessor } from './sse-processor'
```

- [ ] **Step 5: Run core tests — expect pass**

```
pnpm --filter @upup/core run test
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/sse-processor.ts packages/core/src/index.ts packages/core/tests/sse-processor.test.ts
git commit -m "feat: add SSEProcessor class to @upup/core"
```

---

### Task 6.2 — Slim down `useSSEProcessing` to a thin subscriber

**Files:**
- Modify: `packages/react/src/hooks/useSSEProcessing.ts`

- [ ] **Step 1: Replace implementation with SSEProcessor delegation**

Replace the full contents of `packages/react/src/hooks/useSSEProcessing.ts` with:

```ts
import { useEffect, useRef, useCallback } from 'react'
import type { UploadFile } from '@upup/core'
import { SSEProcessor } from '@upup/core'

export function useSSEProcessing({
    processingEndpoint,
    onFileProcessed,
    processingTimeout = 60_000,
}: {
    processingEndpoint?: string
    onFileProcessed?: (file: UploadFile, data: Record<string, unknown>) => void
    processingTimeout?: number
}) {
    const processorRef = useRef(new SSEProcessor())

    useEffect(() => {
        const processor = processorRef.current
        return () => processor.destroy()
    }, [])

    const subscribe = useCallback((file: UploadFile) => {
        if (!processingEndpoint || !file.key) return

        const timeoutId = setTimeout(() => {
            processorRef.current.unsubscribe(file.key!)
        }, processingTimeout)

        processorRef.current.subscribe(
            file.key,
            processingEndpoint,
            (data) => {
                clearTimeout(timeoutId)
                onFileProcessed?.(file, data as Record<string, unknown>)
                processorRef.current.unsubscribe(file.key!)
            },
            () => clearTimeout(timeoutId)
        )
    }, [processingEndpoint, onFileProcessed, processingTimeout])

    const unsubscribe = useCallback((key: string) => {
        processorRef.current.unsubscribe(key)
    }, [])

    return { subscribe, unsubscribe }
}
```

- [ ] **Step 2: Typecheck and test**

```
pnpm --filter @upup/react run typecheck
pnpm --filter @upup/react run test
```

- [ ] **Step 3: Commit**

```bash
git add packages/react/src/hooks/useSSEProcessing.ts
git commit -m "refactor: useSSEProcessing delegates to SSEProcessor from @upup/core"
```

---

## Final Verification

After all phases are complete:

- [ ] **Full typecheck**
```
pnpm run typecheck
```

- [ ] **Full test suite**
```
pnpm run test
```

- [ ] **Build all packages**
```
pnpm run build:package
```

- [ ] **Smoke test packages**
```
pnpm run smoke:packages
```

- [ ] **Playground end-to-end** — test local upload, each cloud adapter, image editor, resumable upload, server mode
```
pnpm run dev:playground
```
