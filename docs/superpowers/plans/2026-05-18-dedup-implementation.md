# Shared Utilities Deduplication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate ~3,700 lines of duplicated code across `@upup/react` and `@upup/vue` by centralizing framework-agnostic logic in `@upup/core`.

**Architecture:** Utilities, types, and business logic that have no framework dependency move to `@upup/core/src/utils/`. React and Vue packages import from `@upup/core` instead of maintaining local copies. Structural duplication (cloud hooks, orchestrator) is addressed by extracting framework-agnostic base functions into core that both packages call.

**Tech Stack:** TypeScript, Vitest, pnpm monorepo, Turborepo

**Analysis doc:** `docs/superpowers/plans/2026-05-18-shared-utils-deduplication.md`

---

## Milestones

| # | Milestone | Tasks | Lines cut | Risk |
|---|-----------|-------|-----------|------|
| A | Byte-identical utility moves + tests | 1–4 | ~250 | Low |
| B | Reconcile + newly discovered dedup | 5–8 | ~385 | Low |
| C | Cleanup (ghost deps, exports, imports) | 9–11 | ~10 | Low |
| D | Cloud hook consolidation | 12–14 | ~1,376 | Medium |
| E | CoreOrchestrator (separate plan) | — | ~860 | High |

Milestone E (`useRootProvider` → `CoreOrchestrator`) is too large for this plan. It warrants its own brainstorm + plan cycle after Milestones A–D ship.

---

## Milestone A — Byte-identical utility moves

### Task 1: Move byte-identical utilities to `@upup/core/src/utils/`

**Files:**
- Create: `packages/core/src/utils/accept-presets.ts`
- Create: `packages/core/src/utils/status-helpers.ts`
- Create: `packages/core/src/utils/encoder.ts`
- Create: `packages/core/src/utils/tailwind.ts`
- Create: `packages/core/src/utils/source-metadata.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/package.json` (add `clsx`, `tailwind-merge` deps)

Each file is a verbatim copy from `packages/react/src/` — these are byte-identical between react and vue (confirmed by diff).

- [ ] **Step 1: Create `packages/core/src/utils/accept-presets.ts`**

Copy from `packages/react/src/shared/lib/acceptPresets.ts` verbatim (157 lines). No changes needed — no framework imports.

- [ ] **Step 2: Create `packages/core/src/utils/status-helpers.ts`**

Copy from `packages/react/src/lib/status-helpers.ts` verbatim:

```ts
import { UploadStatus } from '../contracts'

export function isUploadActive(status: UploadStatus): boolean {
    return status === UploadStatus.UPLOADING || status === UploadStatus.PROCESSING
}

export function isUploadIdle(status: UploadStatus): boolean {
    return status === UploadStatus.IDLE || status === UploadStatus.READY
}
```

Note: Change import from `'@upup/core'` to relative `'../contracts'` since we're now inside core.

- [ ] **Step 3: Create `packages/core/src/utils/encoder.ts`**

Copy from `packages/react/src/shared/lib/encoder.ts` verbatim:

```ts
export function b64EncodeUnicode(str: string): string {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16)),
        ),
    )
}
```

- [ ] **Step 4: Create `packages/core/src/utils/tailwind.ts`**

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Create `packages/core/src/utils/source-metadata.ts`**

```ts
import type { Translations } from '../i18n'
import { FileSource } from '../contracts'

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

- [ ] **Step 6: Add `clsx` and `tailwind-merge` to core's `package.json` dependencies**

```bash
cd packages/core && pnpm add clsx tailwind-merge
```

- [ ] **Step 7: Export all new utilities from `packages/core/src/index.ts`**

Add these lines at the end of `packages/core/src/index.ts`:

```ts
// ── Shared utilities ─────────────────────────────────────
export { ACCEPT_PRESETS, resolveAccept } from './utils/accept-presets'
export type { AcceptPreset, AcceptPresetDefinition } from './utils/accept-presets'
export { isUploadActive, isUploadIdle } from './utils/status-helpers'
export { b64EncodeUnicode } from './utils/encoder'
export { cn } from './utils/tailwind'
export { sourceNameKeys } from './utils/source-metadata'
```

- [ ] **Step 8: Build core to verify exports compile**

```bash
pnpm --filter @upup/core build
```

Expected: Clean build, no errors.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/utils/ packages/core/src/index.ts packages/core/package.json packages/core/pnpm-lock.yaml
git commit -m "feat(core): add shared utility modules (accept-presets, status-helpers, encoder, cn, source-metadata)"
```

---

### Task 2: Rewire React imports to use `@upup/core` utilities

**Files:**
- Modify: All files in `packages/react/src/` that import from the local utility copies
- Delete: `packages/react/src/shared/lib/acceptPresets.ts`
- Delete: `packages/react/src/lib/status-helpers.ts`
- Delete: `packages/react/src/shared/lib/encoder.ts`
- Delete: `packages/react/src/lib/tailwind.ts`
- Delete: `packages/react/src/lib/source-metadata.ts`
- Modify: `packages/react/src/index.ts` (re-export from core, remove `cn` export)

- [ ] **Step 1: Find all React imports of the 5 utility modules**

```bash
grep -rn "from.*shared/lib/acceptPresets\|from.*lib/status-helpers\|from.*shared/lib/encoder\|from.*lib/tailwind\|from.*lib/source-metadata" packages/react/src --include='*.ts' --include='*.tsx'
```

- [ ] **Step 2: Replace each import with `@upup/core`**

For each file found in Step 1, change the import path. Examples:

- `from '../shared/lib/acceptPresets'` → `from '@upup/core'`
- `from '../lib/status-helpers'` → `from '@upup/core'`
- `from '../shared/lib/encoder'` → `from '@upup/core'`
- `from './lib/tailwind'` → `from '@upup/core'`
- `from '../lib/source-metadata'` → `from '@upup/core'`

When the file already has an `import ... from '@upup/core'` line, merge the symbols into that existing import instead of adding a duplicate.

- [ ] **Step 3: Update `packages/react/src/index.ts`**

Change the accept presets re-export:
```ts
// BEFORE
export { ACCEPT_PRESETS, resolveAccept } from './shared/lib/acceptPresets'
export type { AcceptPreset, AcceptPresetDefinition } from './shared/lib/acceptPresets'

// AFTER
export { ACCEPT_PRESETS, resolveAccept } from '@upup/core'
export type { AcceptPreset, AcceptPresetDefinition } from '@upup/core'
```

Remove the `cn` export entirely (Finding #7 — internal utility should not be public API):
```ts
// DELETE this line
export { cn } from './lib/tailwind'
```

- [ ] **Step 4: Delete the 5 local utility files from React**

```bash
rm packages/react/src/shared/lib/acceptPresets.ts
rm packages/react/src/lib/status-helpers.ts
rm packages/react/src/shared/lib/encoder.ts
rm packages/react/src/lib/tailwind.ts
rm packages/react/src/lib/source-metadata.ts
```

- [ ] **Step 5: Build React and run tests**

```bash
pnpm --filter @upup/react build && pnpm --filter @upup/react test
```

Expected: All tests pass. If `cn-util.test.ts` imports from the deleted local path, update its import to `from '@upup/core'`.

- [ ] **Step 6: Commit**

```bash
git add packages/react/
git commit -m "refactor(react): import shared utilities from @upup/core instead of local copies"
```

---

### Task 3: Rewire Vue imports to use `@upup/core` utilities

**Files:**
- Modify: All files in `packages/vue/src/` that import from the local utility copies
- Delete: `packages/vue/src/shared/lib/acceptPresets.ts`
- Delete: `packages/vue/src/lib/status-helpers.ts`
- Delete: `packages/vue/src/shared/lib/encoder.ts`
- Delete: `packages/vue/src/lib/tailwind.ts`
- Delete: `packages/vue/src/lib/source-metadata.ts`

- [ ] **Step 1: Find all Vue imports of the 5 utility modules**

```bash
grep -rn "from.*shared/lib/acceptPresets\|from.*lib/status-helpers\|from.*shared/lib/encoder\|from.*lib/tailwind\|from.*lib/source-metadata" packages/vue/src --include='*.ts' --include='*.vue'
```

- [ ] **Step 2: Replace each import with `@upup/core`**

Same approach as Task 2 Step 2. Merge into existing `@upup/core` imports where one already exists.

- [ ] **Step 3: Delete the 5 local utility files from Vue**

```bash
rm packages/vue/src/shared/lib/acceptPresets.ts
rm packages/vue/src/lib/status-helpers.ts
rm packages/vue/src/shared/lib/encoder.ts
rm packages/vue/src/lib/tailwind.ts
rm packages/vue/src/lib/source-metadata.ts
```

- [ ] **Step 4: Build Vue**

```bash
pnpm --filter @upup/vue build
```

Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add packages/vue/
git commit -m "refactor(vue): import shared utilities from @upup/core instead of local copies"
```

---

### Task 4: Move utility tests from React to Core

**Files:**
- Move: `packages/react/tests/encoder.test.ts` → `packages/core/tests/encoder.test.ts`
- Move: `packages/react/tests/cn-util.test.ts` → `packages/core/tests/cn-util.test.ts`
- Move: `packages/react/tests/check-file-type.test.ts` → `packages/core/tests/check-file-type.test.ts` (if it tests pure logic)

- [ ] **Step 1: Copy test files to core, update imports**

For each test file, copy it to `packages/core/tests/` and change imports from `'../src/shared/lib/encoder'` (or similar) to `'../src/utils/encoder'`.

If any test imports React-specific things (`render`, `screen`, etc.), it stays in React. Only move tests that import pure utility functions.

- [ ] **Step 2: Run core tests**

```bash
pnpm --filter @upup/core test
```

Expected: Moved tests pass in core's test runner.

- [ ] **Step 3: Delete the moved test files from React**

Only delete the originals from `packages/react/tests/` after confirming they pass in core.

- [ ] **Step 4: Commit**

```bash
git add packages/core/tests/ packages/react/tests/
git commit -m "refactor: move pure utility tests from react to core"
```

---

## Milestone B — Reconcile + newly discovered dedup

### Task 5: Move `file-helpers.ts` to core (reconcile React superset)

**Files:**
- Create: `packages/core/src/utils/file-helpers.ts`
- Modify: `packages/core/src/index.ts`
- Modify: React and Vue files importing from `lib/file.ts`
- Delete: `packages/react/src/lib/file.ts`, `packages/vue/src/lib/file.ts`

React's version has `compressFile` (which uses `pako`) that Vue's doesn't. Move `fileAppendParams` and `revokeFileUrl` to core. `compressFile` stays in React since it depends on `pako`.

- [ ] **Step 1: Create `packages/core/src/utils/file-helpers.ts`**

```ts
import { FileSource } from '../contracts'
import { UploadStatus } from '../contracts'
import type { UploadFile } from '../contracts'
import { b64EncodeUnicode } from './encoder'

export const fileAppendParams = (file: File) => {
    const partial = file as Partial<UploadFile>
    const rel = partial.relativePath
        || (file as File & { webkitRelativePath?: string }).webkitRelativePath
        || file.name
    Object.assign(file, {
        id: partial.id || b64EncodeUnicode(rel),
        url: partial.url || URL.createObjectURL(file),
        source: partial.source || FileSource.LOCAL,
        status: partial.status || UploadStatus.READY,
        metadata: partial.metadata || {},
    })
    return file as UploadFile
}

export const revokeFileUrl = (file: UploadFile) => {
    if (file.url?.startsWith('blob:')) {
        URL.revokeObjectURL(file.url)
    }
}
```

- [ ] **Step 2: Export from `packages/core/src/index.ts`**

```ts
export { fileAppendParams, revokeFileUrl } from './utils/file-helpers'
```

- [ ] **Step 3: Update React's `lib/file.ts` to re-export from core + keep `compressFile` locally**

Replace `packages/react/src/lib/file.ts` contents with:

```ts
import pako from 'pako'
import type { UploadFile } from '@upup/core'
import { fileAppendParams, revokeFileUrl } from '@upup/core'

export { fileAppendParams, revokeFileUrl }
export {
    bytesToSize, sizeToBytes, checkFileSize,
    PREVIEW_MAX_TEXT_SIZE, PREVIEW_TEXT_TRUNCATE_LENGTH,
    fileGetIsImage, fileGetIsPdf, fileGetIsText,
    fileCanPreviewText, fileGetExtension, fileIs3D,
    searchDriveFiles,
} from '@upup/core'

export async function compressFile(oldFile: UploadFile) {
    const buffer = await oldFile.arrayBuffer()
    const compressed = new File([pako.gzip(buffer)], oldFile.name + '.gz', {
        type: 'application/octet-stream',
        lastModified: oldFile.lastModified,
    })
    const newUploadFile = fileAppendParams(compressed)
    newUploadFile.id = oldFile.id
    newUploadFile.thumbnail = oldFile.thumbnail
    newUploadFile.fileHash = oldFile.fileHash
    newUploadFile.key = oldFile.key
    newUploadFile.source = oldFile.source
    newUploadFile.status = oldFile.status
    newUploadFile.metadata = oldFile.metadata
    revokeFileUrl(oldFile)
    return newUploadFile
}
```

- [ ] **Step 4: Update Vue's imports — delete `packages/vue/src/lib/file.ts`**

Find all Vue files importing from `../lib/file` and change to import `fileAppendParams`, `revokeFileUrl` from `'@upup/core'`. Then delete `packages/vue/src/lib/file.ts`.

- [ ] **Step 5: Move `packages/react/tests/file-helpers.test.ts` to `packages/core/tests/`**

Update test imports to point to `'../src/utils/file-helpers'`.

- [ ] **Step 6: Build + test all three packages**

```bash
pnpm --filter @upup/core build && pnpm --filter @upup/core test && pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/ packages/react/ packages/vue/
git commit -m "refactor: move fileAppendParams and revokeFileUrl to @upup/core"
```

---

### Task 6: Move `multipartSessionStore.ts` to core (use React superset)

**Files:**
- Create: `packages/core/src/utils/multipart-session-store.ts`
- Modify: `packages/core/src/index.ts`
- Delete: `packages/react/src/lib/resumable/multipartSessionStore.ts`
- Delete: `packages/vue/src/lib/resumable/multipartSessionStore.ts`

React's version is the superset (has `saveSession`, `updateSessionProgress`, `clearAllSessions`).

- [ ] **Step 1: Copy React's `multipartSessionStore.ts` to `packages/core/src/utils/multipart-session-store.ts`**

Copy verbatim. No framework imports to change — it only uses `localStorage`.

- [ ] **Step 2: Export from `packages/core/src/index.ts`**

```ts
export {
    saveSession, loadSession, removeSession,
    updateSessionProgress, clearAllSessions,
    type MultipartSession,
} from './utils/multipart-session-store'
```

- [ ] **Step 3: Update React and Vue imports to `'@upup/core'`, delete local copies**

- [ ] **Step 4: Move `packages/react/tests/resumable-session-store.test.ts` to core**

- [ ] **Step 5: Build + test**

```bash
pnpm --filter @upup/core build && pnpm --filter @upup/core test && pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor: move multipartSessionStore to @upup/core (react superset)"
```

---

### Task 7: Move `image-editor-helpers` to core

**Files:**
- Create: `packages/core/src/utils/image-helpers.ts`
- Modify: `packages/core/src/index.ts`
- Delete: `packages/react/src/lib/imageEditorHelpers.ts` (camelCase!)
- Delete: `packages/vue/src/lib/image-editor-helpers.ts` (kebab-case!)

- [ ] **Step 1: Copy React's `imageEditorHelpers.ts` to `packages/core/src/utils/image-helpers.ts`**

React's version (286 lines) is the superset. Change any `@upup/core` imports to relative paths.

- [ ] **Step 2: Export from `packages/core/src/index.ts`**

```ts
export { dataURLtoBlob, blobToUploadFile } from './utils/image-helpers'
```

- [ ] **Step 3: Update React + Vue imports, delete local copies**

Note the different filenames: React uses `imageEditorHelpers.ts`, Vue uses `image-editor-helpers.ts`.

- [ ] **Step 4: Move `packages/react/tests/image-editor-helpers.test.ts` to core**

- [ ] **Step 5: Build + test**

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor: move image editor helpers to @upup/core"
```

---

### Task 8: Extract `useFetchFileByUrl` pure helpers to core

**Files:**
- Create: `packages/core/src/utils/fetch-helpers.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/react/src/hooks/useFetchFileByUrl.ts`
- Modify: `packages/vue/src/composables/useFetchFileByUrl.ts`

5 shared pure functions move to core. The framework hook wrappers stay in each package.

- [ ] **Step 1: Create `packages/core/src/utils/fetch-helpers.ts`**

Extract these functions (they have zero framework deps):

```ts
export const MIME_EXTENSION_MAP: Record<string, string> = {
    'application/json': 'json',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
}

export function sanitizeFileName(name: string): string {
    // Copy from react/src/hooks/useFetchFileByUrl.ts verbatim
}

export function extensionFromMime(mime: string): string {
    // Copy from react/src/hooks/useFetchFileByUrl.ts verbatim
}

export function fileNameFromContentDisposition(header: string | null): string | undefined {
    // Copy from react/src/hooks/useFetchFileByUrl.ts verbatim
}

export function deriveFetchedFileName(response: Response, blob: Blob, url: string): string {
    // Copy from react/src/hooks/useFetchFileByUrl.ts verbatim
}
```

Copy each function body verbatim from the React hook. They're pure — no `useState`, no `useCallback`.

- [ ] **Step 2: Export from `packages/core/src/index.ts`**

```ts
export {
    MIME_EXTENSION_MAP, sanitizeFileName, extensionFromMime,
    fileNameFromContentDisposition, deriveFetchedFileName,
} from './utils/fetch-helpers'
```

- [ ] **Step 3: Update React's `useFetchFileByUrl.ts`**

Remove the 5 function definitions. Add:
```ts
import {
    sanitizeFileName, extensionFromMime,
    fileNameFromContentDisposition, deriveFetchedFileName,
} from '@upup/core'
```

Keep the React hook wrapper (`useFetchFileByUrl` function using `useState`, `useCallback`).

- [ ] **Step 4: Update Vue's `useFetchFileByUrl.ts`**

Same — remove 5 function definitions, import from `'@upup/core'`. Keep the Vue composable wrapper. Remove the local `uuid()` function, use `crypto.randomUUID()` inline.

- [ ] **Step 5: Move `packages/react/tests/url-fetch-file-name.test.ts` to core**

- [ ] **Step 6: Build + test**

```bash
pnpm --filter @upup/core build && pnpm --filter @upup/core test && pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: extract fetch-file helpers (sanitizeFileName, extensionFromMime, etc.) to @upup/core"
```

---

## Milestone C — Cleanup

### Task 9: Delete `folderDrop` re-exports and remove ghost deps

**Files:**
- Delete: `packages/react/src/lib/folderDrop.ts`
- Delete: `packages/vue/src/lib/folderDrop.ts`
- Modify: `packages/react/package.json` (remove ghost deps)

- [ ] **Step 1: Find anything importing from `folderDrop` in react or vue**

```bash
grep -rn "from.*lib/folderDrop\|from.*lib/folder-drop" packages/react/src packages/vue/src --include='*.ts' --include='*.tsx' --include='*.vue'
```

For each hit, change the import to `from '@upup/core'` (importing `collectDroppedFiles` and `DroppedFilesResult`).

- [ ] **Step 2: Delete both `folderDrop.ts` files**

```bash
rm packages/react/src/lib/folderDrop.ts packages/vue/src/lib/folderDrop.ts
```

- [ ] **Step 3: Remove ghost dependencies from React's `package.json`**

Remove these from `dependencies` (they are never imported in `packages/react/src/`):
- `@azure/msal-browser`
- `@microsoft/microsoft-graph-client`
- `dropbox`

```bash
cd packages/react && pnpm remove @azure/msal-browser @microsoft/microsoft-graph-client dropbox
```

- [ ] **Step 4: Build + test**

```bash
pnpm --filter @upup/react build && pnpm --filter @upup/react test && pnpm --filter @upup/vue build
```

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: delete folderDrop re-exports, remove ghost deps from react"
```

---

### Task 10: Fix `interactive-example` importing `ACCEPT_PRESETS` from React

**Files:**
- Modify: `packages/interactive-example/src/categories/limits.ts`
- Modify: `packages/interactive-example/src/icons/source-meta.tsx` (if it imports non-component things from react)

- [ ] **Step 1: Update the import**

In `packages/interactive-example/src/categories/limits.ts` line 3:

```ts
// BEFORE
import { ACCEPT_PRESETS } from '@upup/react'

// AFTER
import { ACCEPT_PRESETS } from '@upup/core'
```

- [ ] **Step 2: Add `@upup/core` to interactive-example's dependencies if not already present**

```bash
cd packages/interactive-example && pnpm add @upup/core
```

- [ ] **Step 3: Build interactive-example**

```bash
pnpm --filter @upup/interactive-example build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(interactive-example): import ACCEPT_PRESETS from @upup/core instead of @upup/react"
```

---

### Task 11: Move `useLoadGAPI` to core

**Files:**
- Create: `packages/core/src/utils/load-gapi.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/react/src/hooks/useLoadGAPI.ts`
- Modify: `packages/vue/src/composables/useLoadGAPI.ts`
- Modify: `packages/core/package.json` (add `load-script` dep)

- [ ] **Step 1: Read both `useLoadGAPI` files to identify the shared logic**

The core of both files is: `load('https://apis.google.com/js/api.js', callback)`. The framework-specific parts are `useEffect`/`onMounted` lifecycle.

- [ ] **Step 2: Create `packages/core/src/utils/load-gapi.ts`**

Extract the framework-agnostic script loading:

```ts
import load from 'load-script'

let gapiPromise: Promise<void> | null = null

export function loadGoogleApi(): Promise<void> {
    if (gapiPromise) return gapiPromise
    gapiPromise = new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && (window as any).gapi) {
            resolve()
            return
        }
        load('https://apis.google.com/js/api.js', (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
    return gapiPromise
}
```

- [ ] **Step 3: Add `load-script` dep to core, export from index**

```bash
cd packages/core && pnpm add load-script && pnpm add -D @types/load-script
```

```ts
export { loadGoogleApi } from './utils/load-gapi'
```

- [ ] **Step 4: Simplify React's `useLoadGAPI.ts`**

```ts
import { useEffect, useState } from 'react'
import { loadGoogleApi } from '@upup/core'

export function useLoadGAPI() {
    const [loaded, setLoaded] = useState(false)
    useEffect(() => { loadGoogleApi().then(() => setLoaded(true)) }, [])
    return loaded
}
```

- [ ] **Step 5: Simplify Vue's `useLoadGAPI.ts`**

```ts
import { ref, onMounted } from 'vue'
import { loadGoogleApi } from '@upup/core'

export function useLoadGAPI() {
    const loaded = ref(false)
    onMounted(() => { loadGoogleApi().then(() => { loaded.value = true }) })
    return loaded
}
```

- [ ] **Step 6: Build + test**

```bash
pnpm --filter @upup/core build && pnpm --filter @upup/react build && pnpm --filter @upup/vue build
```

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: extract loadGoogleApi to @upup/core, simplify useLoadGAPI in react/vue"
```

---

## Milestone D — Cloud Hook Consolidation

### Task 12: Create `bindAdapterEvents` in core

**Files:**
- Create: `packages/core/src/adapters/bind-adapter-events.ts`
- Create: `packages/core/tests/bind-adapter-events.test.ts`
- Modify: `packages/core/src/index.ts`

This addresses Findings #9 and #13 — the 48 copy-pasted `core.on()` calls.

- [ ] **Step 1: Write the test**

```ts
// packages/core/tests/bind-adapter-events.test.ts
import { describe, it, expect, vi } from 'vitest'
import { bindAdapterEvents } from '../src/adapters/bind-adapter-events'

function createMockEmitter() {
    const listeners = new Map<string, Function>()
    return {
        on: vi.fn((event: string, cb: Function) => {
            listeners.set(event, cb)
            return () => listeners.delete(event)
        }),
        emit(event: string, payload?: unknown) {
            listeners.get(event)?.(payload)
        },
    }
}

describe('bindAdapterEvents', () => {
    it('subscribes to all 6 standard adapter events', () => {
        const emitter = createMockEmitter()
        const callbacks = {
            onAuthenticated: vi.fn(),
            onSignedOut: vi.fn(),
            onSessionExpired: vi.fn(),
            onFilesLoaded: vi.fn(),
            onStateChange: vi.fn(),
            onError: vi.fn(),
        }

        const unsub = bindAdapterEvents(emitter as any, 'box', callbacks)

        expect(emitter.on).toHaveBeenCalledTimes(6)
        expect(emitter.on).toHaveBeenCalledWith('box:authenticated', expect.any(Function))
        expect(emitter.on).toHaveBeenCalledWith('box:signed-out', expect.any(Function))

        emitter.emit('box:authenticated', { user: { name: 'Test' } })
        expect(callbacks.onAuthenticated).toHaveBeenCalledWith({ user: { name: 'Test' } })

        unsub()
    })

    it('works with any provider name', () => {
        const emitter = createMockEmitter()
        const callbacks = {
            onAuthenticated: vi.fn(),
            onSignedOut: vi.fn(),
            onSessionExpired: vi.fn(),
            onFilesLoaded: vi.fn(),
            onStateChange: vi.fn(),
            onError: vi.fn(),
        }

        bindAdapterEvents(emitter as any, 'google-drive', callbacks)
        expect(emitter.on).toHaveBeenCalledWith('google-drive:authenticated', expect.any(Function))
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @upup/core test -- bind-adapter-events
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/core/src/adapters/bind-adapter-events.ts`**

```ts
import type { UpupCore } from '../core'

export interface AdapterEventCallbacks {
    onAuthenticated: (payload: unknown) => void
    onSignedOut: () => void
    onSessionExpired: () => void
    onFilesLoaded: (payload: unknown) => void
    onStateChange: (payload: unknown) => void
    onError: (payload?: unknown) => void
}

export function bindAdapterEvents(
    core: UpupCore,
    provider: string,
    callbacks: AdapterEventCallbacks,
): () => void {
    const unsubs = [
        core.on(`${provider}:authenticated`, callbacks.onAuthenticated),
        core.on(`${provider}:signed-out`, callbacks.onSignedOut),
        core.on(`${provider}:session-expired`, callbacks.onSessionExpired),
        core.on(`${provider}:files-loaded`, callbacks.onFilesLoaded),
        core.on(`${provider}:state-change`, callbacks.onStateChange),
        core.on(`${provider}:error`, callbacks.onError),
    ]
    return () => unsubs.forEach(u => u())
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @upup/core test -- bind-adapter-events
```

Expected: PASS.

- [ ] **Step 5: Export from `packages/core/src/index.ts`**

```ts
export { bindAdapterEvents, type AdapterEventCallbacks } from './adapters/bind-adapter-events'
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(core): add bindAdapterEvents — single function to subscribe to all adapter events"
```

---

### Task 13: Refactor React cloud hooks to use `bindAdapterEvents`

**Files:**
- Modify: `packages/react/src/hooks/useBox.ts`
- Modify: `packages/react/src/hooks/useDropbox.ts`
- Modify: `packages/react/src/hooks/useGoogleDrive.ts`
- Modify: `packages/react/src/hooks/useOneDrive.ts`

Each hook currently has ~6 inline `core.on()` calls. Replace with a single `bindAdapterEvents()` call.

- [ ] **Step 1: Refactor `useBox.ts`**

Replace the 6 `core.on(...)` calls with:

```ts
import { bindAdapterEvents, type DriveFile, type DriveFolder, type DriveUser } from '@upup/core'

// Inside the useEffect:
const unsub = bindAdapterEvents(core, 'box', {
    onAuthenticated: (payload: unknown) => {
        const data = payload as { user?: DriveUser }
        if (data.user) setUser(data.user)
        setIsAuthenticated(true)
        setIsLoading(false)
    },
    onSignedOut: () => {
        setUser(undefined)
        setBoxFiles(undefined)
        setIsAuthenticated(false)
        setPath([])
        setSelectedFiles([])
    },
    onSessionExpired: () => {
        setUser(undefined)
        setBoxFiles(undefined)
        setIsAuthenticated(false)
        setPath([])
    },
    onFilesLoaded: (payload: unknown) => {
        const data = payload as { files: DriveFile[]; folderId: string }
        const root: DriveFolder = {
            id: data.folderId || '0',
            name: data.folderId === '0' || !data.folderId ? 'Box' : data.folderId,
            path: '',
            size: 0,
            mimeType: '',
            isFolder: true,
            children: data.files,
        }
        setBoxFiles(root)
        setIsClickLoading(false)
    },
    onStateChange: (payload: unknown) => {
        const data = payload as { state: string }
        setIsLoading(data.state === 'authenticating' || data.state === 'browsing')
    },
    onError: () => {
        setIsLoading(false)
    },
})

// Replace all individual unsubs with single unsub
return unsub
```

Remove the `const unsubs = [...]` array and `return () => unsubs.forEach(u => u())` pattern.

- [ ] **Step 2: Repeat for `useDropbox.ts`, `useGoogleDrive.ts`, `useOneDrive.ts`**

Same pattern — replace 6 `core.on()` calls with one `bindAdapterEvents()` call. The callback bodies differ slightly per provider (e.g. Google Drive has `GisToken` handling, OneDrive uses `onedrive:` prefix).

For each file: read the existing event callbacks, copy the callback bodies into the `bindAdapterEvents` call.

- [ ] **Step 3: Build + test React**

```bash
pnpm --filter @upup/react build && pnpm --filter @upup/react test
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(react): use bindAdapterEvents in all 4 cloud hooks"
```

---

### Task 14: Refactor Vue cloud hooks to use `bindAdapterEvents`

**Files:**
- Modify: `packages/vue/src/composables/useBox.ts`
- Modify: `packages/vue/src/composables/useDropbox.ts`
- Modify: `packages/vue/src/composables/useGoogleDrive.ts`
- Modify: `packages/vue/src/composables/useOneDrive.ts`

Identical approach to Task 13. The callback bodies are identical to React's (confirmed by diff).

- [ ] **Step 1: Refactor all 4 Vue composables**

Same as Task 13 but using Vue's `.value` syntax in callbacks.

- [ ] **Step 2: Build Vue**

```bash
pnpm --filter @upup/vue build
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(vue): use bindAdapterEvents in all 4 cloud composables"
```

---

## Final verification

### Task 15: Full monorepo build + test

- [ ] **Step 1: Full build**

```bash
pnpm build
```

Expected: All packages build cleanly.

- [ ] **Step 2: Full test suite**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 3: Verify no remaining duplicates**

```bash
# Should return 0 — no local utility copies should remain
find packages/react/src/shared/lib packages/vue/src/shared/lib -name '*.ts' 2>/dev/null | wc -l
```

Expected: `0` (or only `checkFileType.ts` in React which is React-only).

- [ ] **Step 4: Commit any final fixups, then tag milestone**

```bash
git commit -m "chore: final verification — shared utils deduplication complete"
```

---

## Deferred to separate plans

These items are documented in the analysis but too large for this plan:

| Finding | What | Why deferred |
|---------|------|-------------|
| #10 CoreOrchestrator | Extract 1,561 lines of `useRootProvider` business logic | Needs its own brainstorm cycle — touches every feature path |
| #2 shared/types.ts cleanup | Move shared types to core, stop re-exporting | Requires auditing all 537 lines of type definitions |
| #3 Context shape types | Define once in core | Coupled to #10 (context shapes feed the orchestrator) |
| #5 Vue generic CloudUploader | Replace 4 wrapper components with 1 | Low-line-count win, do after cloud hooks consolidate |
| #15 CSS audit | Reconcile diverged tailwind.css | Needs visual testing in browser |
| #1 Barrel re-export flattening | Replace `export *` chains | Low risk but tedious, do as cleanup pass |
