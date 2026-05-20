# @upup/vue — Vue 3 Adapter Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@upup/vue` — a Vue 3 Composition API adapter for the upup file uploader, mirroring the feature set of `@upup/react` with identical Tailwind styling and prop API.

**Architecture:** `@upup/core` owns all upload logic, adapter plugins, pipeline, and events. `@upup/vue` is a thin presentation layer: Vue composables subscribe to core events via `ref()` + `watch()`, Vue SFC components render the same Tailwind class names as React. The provide/inject system replaces React Context. The prop interface (`UpupUploaderProps`) is shared verbatim from core types.

**Tech Stack:** Vue 3.4+ (Composition API + `<script setup>`), TypeScript, Tailwind CSS (same `upup-` prefix), tsup (same build config as `@upup/react`), Vitest + Vue Test Utils.

---

## Phase Overview

| Phase | Tasks | What ships |
|-------|-------|-----------|
| 1. Scaffold | 1–3 | Package skeleton, build, headless composable `useUpupUpload` |
| 2. Context + Root | 4–6 | Provide/inject system, `useRootProvider`, `UpupUploader` shell |
| 3. Core Components | 7–11 | MainBox, AdapterSelector, FileList, FileItem, ProgressBar |
| 4. Source Panels | 12–16 | URL, Camera, Audio, Screen, LocalFolderBrowser |
| 5. Cloud Adapters | 17–20 | Dropbox, Google Drive, OneDrive, Box (thin composable + component) |
| 6. Drive Browser | 21–23 | DriveBrowser, Header, Item, Icon, AuthFallback |
| 7. Image Editor | 24 | Placeholder — deferred or Vue-compatible editor |
| 8. Polish | 25–27 | Styling parity, package smoke test, playground demo |

**Estimated effort:** 7–9 days.

**Branch:** Create `feat/vue-package` from `v2-clean`.

---

## Dependency Notes

### What @upup/vue does NOT need (already in @upup/core)

All upload logic, adapter plugins (Dropbox/Google/OneDrive/Box), pipeline steps, file validation, event emitter, i18n, theme resolution, file utilities. These are imported — never duplicated.

### Vue-specific dependencies

```
peerDependencies:
  vue: "^3.4.0"
  @upup/core: "^2.2.0"

dependencies:
  @tanstack/vue-virtual: "^3.0"    # virtual scrolling (mirrors @tanstack/react-virtual)
  clsx: "^2.1"                      # class concatenation
  tailwind-merge: "^3.6"            # Tailwind class dedup

devDependencies:
  @vue/test-utils: "^2.4"           # component testing
  @vitejs/plugin-vue: "^5.0"        # Vite Vue plugin for tests
  vitest: "^4.1"
  jsdom: "22.1.0"
  tsup: "^8.4"
  vue-tsc: "^2.0"                   # Vue typecheck
  tailwindcss: "^3.4"
  postcss / autoprefixer / postcss-prefix-selector  # same CSS build
```

### Image Editor

`@upup/react` uses `react-filerobot-image-editor` (React-specific). No Vue equivalent exists. Phase 7 will implement a basic crop/rotate editor using Canvas API directly, or stub it with a "coming soon" message. This is the one feature that won't have parity on day one.

---

## File Structure

```
packages/vue/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── tailwind.config.js              # same as react, upup- prefix
├── postcss.config.js
├── src/
│   ├── index.ts                    # public exports
│   ├── upup-uploader.vue           # root component (SFC)
│   ├── use-upup-upload.ts          # headless composable
│   ├── tailwind.css                # @tailwind base/components/utilities
│   ├── lib/
│   │   ├── tailwind.ts             # cn() helper (clsx + twMerge)
│   │   ├── file.ts                 # fileAppendParams, revokeFileUrl
│   │   └── image-editor-helpers.ts # blobToUploadFile, dataURLtoBlob
│   ├── shared/
│   │   ├── types.ts                # UpupUploaderProps (re-export + Vue-specific)
│   │   └── lib/
│   │       ├── acceptPresets.ts    # resolveAccept (re-export from react or copy)
│   │       ├── checkFileType.ts
│   │       └── encoder.ts          # b64EncodeUnicode
│   ├── context/
│   │   └── root-context.ts         # provide/inject keys + composables
│   ├── composables/
│   │   ├── useRootProvider.ts      # main orchestration composable
│   │   ├── useMainBox.ts           # drag/drop/paste
│   │   ├── useAdapterSelector.ts   # source button logic
│   │   ├── useDropbox.ts           # thin event subscriber
│   │   ├── useGoogleDrive.ts
│   │   ├── useOneDrive.ts
│   │   ├── useBox.ts
│   │   ├── useLoadGAPI.ts          # Google Identity Services script loader
│   │   ├── useCameraUploader.ts
│   │   ├── useFetchFileByUrl.ts
│   │   ├── useSSEProcessing.ts
│   │   ├── useServerModeDrive.ts
│   │   └── useUpload.ts            # imperative upload API
│   ├── components/
│   │   ├── MainBox.vue
│   │   ├── AdapterSelector.vue
│   │   ├── AdapterView.vue
│   │   ├── FileList.vue
│   │   ├── FileItem.vue
│   │   ├── FilePreview.vue
│   │   ├── FilePreviewPortal.vue
│   │   ├── FilePreviewThumbnail.vue
│   │   ├── FileIcon.vue
│   │   ├── ProgressBar.vue
│   │   ├── Icons.ts                # SVG icon components (functional)
│   │   ├── DefaultLoaderIcon.vue
│   │   ├── UrlUploader.vue
│   │   ├── CameraUploader.vue
│   │   ├── AudioUploader.vue
│   │   ├── ScreenCaptureUploader.vue
│   │   ├── LocalFolderBrowser.vue
│   │   ├── DropboxUploader.vue
│   │   ├── GoogleDriveUploader.vue
│   │   ├── OneDriveUploader.vue
│   │   ├── BoxUploader.vue
│   │   ├── ServerModeDriveUploader.vue
│   │   └── shared/
│   │       ├── AdapterViewContainer.vue
│   │       ├── DriveAuthFallback.vue
│   │       ├── DriveBrowser.vue
│   │       ├── DriveBrowserHeader.vue
│   │       ├── DriveBrowserItem.vue
│   │       ├── DriveBrowserIcon.vue
│   │       └── MainBoxHeader.vue
│   └── assets/
│       └── logos.ts                # base64 logo strings (copy from react)
├── tests/
│   ├── use-upup-upload.test.ts
│   ├── root-context.test.ts
│   ├── upup-uploader.test.ts
│   ├── main-box.test.ts
│   ├── adapter-selector.test.ts
│   ├── file-list.test.ts
│   ├── file-item.test.ts
│   ├── drive-browser.test.ts
│   ├── cloud-adapters.test.ts
│   └── url-uploader.test.ts
```

---

## Phase 1: Scaffold

### Task 1: Package skeleton

**Files:**
- Create: `packages/vue/package.json`
- Create: `packages/vue/tsconfig.json`
- Create: `packages/vue/tsup.config.ts`
- Create: `packages/vue/vitest.config.ts`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@upup/vue",
  "version": "2.2.0",
  "description": "Vue 3 file uploader with cloud-drive sources, resumable uploads, theming, and ICU i18n.",
  "repository": "https://github.com/DevinoSolutions/upup",
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./styles": "./dist/tailwind-prefixed.css"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup && pnpm run build:css",
    "build:css": "postcss src/tailwind.css -o ./dist/tailwind-prefixed.css",
    "dev": "tsup --watch --onSuccess \"pnpm run build:css\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "vue-tsc --noEmit",
    "release": "pnpm run build && pnpm publish --access public --no-git-checks",
    "test-release": "pnpm run build && pnpm publish --dry-run --access public --no-git-checks"
  },
  "files": ["dist"],
  "dependencies": {
    "@upup/core": "workspace:*",
    "@tanstack/vue-virtual": "^3.13.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.6.0"
  },
  "peerDependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vue/test-utils": "^2.4.6",
    "@vitejs/plugin-vue": "^5.0.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "22.1.0",
    "postcss": "^8.5.2",
    "postcss-cli": "^11.0.1",
    "postcss-prefix-selector": "^2.1.1",
    "tailwindcss": "^3.4.17",
    "tsup": "^8.4.0",
    "typescript": "^5.3.2",
    "vitest": "^4.1.2",
    "vue": "^3.4.0",
    "vue-tsc": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
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
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  external: ['vue', '@upup/core'],
})
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 5: Add to pnpm-workspace.yaml**

Add `packages/vue` to the `packages:` list if not already covered by a glob.

- [ ] **Step 6: Install dependencies**

```bash
cd packages/vue && pnpm install
```

- [ ] **Step 7: Commit**

```bash
git add packages/vue/package.json packages/vue/tsconfig.json packages/vue/tsup.config.ts packages/vue/vitest.config.ts pnpm-workspace.yaml
git commit -m "chore: scaffold @upup/vue package skeleton"
```

---

### Task 2: Tailwind CSS setup + cn() helper

**Files:**
- Create: `packages/vue/tailwind.config.js`
- Create: `packages/vue/postcss.config.js`
- Create: `packages/vue/src/tailwind.css`
- Create: `packages/vue/src/lib/tailwind.ts`

- [ ] **Step 1: Copy tailwind.config.js from @upup/react**

```bash
cp packages/react/tailwind.config.js packages/vue/tailwind.config.js
```

Update the `content` paths to point to `./src/**/*.{ts,vue}` instead of `./src/**/*.{ts,tsx}`.

- [ ] **Step 2: Copy postcss.config.js from @upup/react**

```bash
cp packages/react/postcss.config.js packages/vue/postcss.config.js
```

- [ ] **Step 3: Create src/tailwind.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Create src/lib/tailwind.ts**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Verify CSS builds**

```bash
pnpm --filter @upup/vue run build:css
```
Expected: `dist/tailwind-prefixed.css` generated.

- [ ] **Step 6: Commit**

```bash
git add packages/vue/tailwind.config.js packages/vue/postcss.config.js packages/vue/src/tailwind.css packages/vue/src/lib/tailwind.ts
git commit -m "feat(vue): add Tailwind CSS build with upup- prefix"
```

---

### Task 3: Headless composable — useUpupUpload

**Files:**
- Create: `packages/vue/src/use-upup-upload.ts`
- Create: `packages/vue/src/index.ts`
- Create: `packages/vue/tests/use-upup-upload.test.ts`

This is the Vue equivalent of `packages/react/src/use-upup-upload.ts`. It creates an `UpupCore` instance, subscribes to events via `ref()`, and returns a reactive API.

- [ ] **Step 1: Write the test**

```ts
// packages/vue/tests/use-upup-upload.test.ts
import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { useUpupUpload } from '../src/use-upup-upload'
import { withSetup } from './helpers'

// Helper to run composables outside components
function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
  let result: T
  const app = createApp({ setup() { result = composable(); return () => {} } })
  const div = document.createElement('div')
  app.mount(div)
  return { result: result!, unmount: () => app.unmount() }
}

describe('useUpupUpload', () => {
  it('returns reactive files and status', () => {
    const { result, unmount } = withSetup(() => useUpupUpload({ limit: 5 }))
    expect(result.files.value).toEqual([])
    expect(result.status.value).toBe('IDLE')
    expect(result.core).toBeDefined()
    unmount()
  })

  it('exposes upload/pause/resume/cancel methods', () => {
    const { result, unmount } = withSetup(() => useUpupUpload({ limit: 5 }))
    expect(typeof result.upload).toBe('function')
    expect(typeof result.pause).toBe('function')
    expect(typeof result.resume).toBe('function')
    expect(typeof result.cancel).toBe('function')
    unmount()
  })

  it('destroys core on unmount', () => {
    const { result, unmount } = withSetup(() => useUpupUpload({ limit: 5 }))
    const destroySpy = vi.spyOn(result.core, 'destroy')
    unmount()
    expect(destroySpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
pnpm --filter @upup/vue run test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement useUpupUpload**

```ts
// packages/vue/src/use-upup-upload.ts
import { ref, onMounted, onUnmounted, shallowRef, triggerRef } from 'vue'
import { UpupCore, type CoreOptions, UploadStatus, type UploadFile } from '@upup/core'

export interface UseUpupUploadOptions extends CoreOptions {
  onFileAdded?: (files: UploadFile[]) => void
  onFileRemoved?: (file: UploadFile) => void
  onUploadProgress?: (progress: { fileId: string; loaded: number; total: number }) => void
  onUploadComplete?: (files: UploadFile[]) => void
}

export function useUpupUpload(options: UseUpupUploadOptions) {
  const core = new UpupCore(options)

  const files = shallowRef<UploadFile[]>([])
  const status = ref<UploadStatus>(UploadStatus.IDLE)
  const progress = ref({ totalFiles: 0, completedFiles: 0, percentage: 0 })
  const error = shallowRef<Error | null>(null)

  const unsubs: Array<() => void> = []

  onMounted(() => {
    unsubs.push(
      core.on('state-change', () => {
        files.value = [...core.files.values()]
        status.value = core.status
        progress.value = core.progress
        error.value = core.error
      }),
    )

    if (options.onFileAdded) {
      unsubs.push(core.on('files-added', (payload) => options.onFileAdded!(payload as UploadFile[])))
    }
    if (options.onFileRemoved) {
      unsubs.push(core.on('file-removed', (payload) => options.onFileRemoved!(payload as UploadFile)))
    }
    if (options.onUploadProgress) {
      unsubs.push(core.on('upload-progress', (payload) => options.onUploadProgress!(payload as { fileId: string; loaded: number; total: number })))
    }
    if (options.onUploadComplete) {
      unsubs.push(core.on('upload-all-complete', (payload) => options.onUploadComplete!(payload as UploadFile[])))
    }
  })

  onUnmounted(() => {
    unsubs.forEach(u => u())
    core.destroy()
  })

  return {
    files,
    status,
    progress,
    error,
    core,

    addFiles: (f: File[]) => core.addFiles(f),
    removeFile: (id: string) => core.removeFile(id),
    removeAll: () => core.removeAll(),
    setFiles: (f: File[]) => core.setFiles(f),
    reorderFiles: (ids: string[]) => core.reorderFiles(ids),
    upload: () => core.upload(),
    pause: () => core.pause(),
    resume: () => core.resume(),
    cancel: () => core.cancel(),
    retry: (id?: string) => core.retry(id),
    on: (event: string, handler: (payload: unknown) => void) => core.on(event, handler),
    ext: core.ext,
  }
}
```

- [ ] **Step 4: Create index.ts with exports**

```ts
// packages/vue/src/index.ts
export { useUpupUpload } from './use-upup-upload'
export type { UseUpupUploadOptions } from './use-upup-upload'

// Re-export core types consumers need
export { FileSource, StorageProvider, UploadStatus } from '@upup/core'
export type { UploadFile, UploadFileWithProgress, CoreOptions } from '@upup/core'
```

- [ ] **Step 5: Run test — expect pass**

```bash
pnpm --filter @upup/vue run test
```

- [ ] **Step 6: Build package**

```bash
pnpm --filter @upup/vue run build
```

- [ ] **Step 7: Commit**

```bash
git add packages/vue/src/ packages/vue/tests/
git commit -m "feat(vue): add useUpupUpload headless composable"
```

---

## Phase 2: Context + Root Component

### Task 4: Provide/inject context system

**Files:**
- Create: `packages/vue/src/context/root-context.ts`
- Create: `packages/vue/tests/root-context.test.ts`

Mirrors `packages/react/src/context/RootContext.ts`. Uses Vue's `provide`/`inject` with typed injection keys instead of React's `createContext`.

- [ ] **Step 1: Write the test**

Test that `provide` + `inject` round-trips correctly for each sub-context (runtime, files, upload, source, theme, i18n, view, options).

- [ ] **Step 2: Implement root-context.ts**

Define `InjectionKey` symbols for each sub-context. Create `provideRootContext(values)` and typed `useUploaderRuntime()`, `useUploaderFiles()`, `useUploaderUploadControls()`, `useUploaderSource()`, `useUploaderTheme()`, `useUploaderI18n()`, `useUploaderView()`, `useUploaderOptions()` composables that call `inject()`.

Pattern:
```ts
import { inject, provide, type InjectionKey } from 'vue'
import type { UpupCore } from '@upup/core'

const RuntimeKey: InjectionKey<{ core: UpupCore; mode: string; inputRef: Ref<HTMLInputElement | null> }> = Symbol('upup-runtime')

export function provideRuntime(value: { core: UpupCore; mode: string; inputRef: Ref<HTMLInputElement | null> }) {
  provide(RuntimeKey, value)
}

export function useUploaderRuntime() {
  const ctx = inject(RuntimeKey)
  if (!ctx) throw new Error('useUploaderRuntime must be used inside UpupUploader')
  return ctx
}
```

Repeat for each sub-context. The type shapes match the React context types exactly.

- [ ] **Step 3: Run test — expect pass**
- [ ] **Step 4: Commit**

---

### Task 5: useRootProvider composable

**Files:**
- Create: `packages/vue/src/composables/useRootProvider.ts`

This is the largest composable — mirrors `packages/react/src/hooks/useRootProvider.ts` (~790 lines). Translation rules:

| React | Vue |
|-------|-----|
| `useState(x)` | `ref(x)` |
| `useMemo(() => x, [deps])` | `computed(() => x)` |
| `useCallback(fn, [deps])` | Plain function (Vue doesn't need memoization for callbacks) |
| `useEffect(fn, [deps])` | `watch([deps], fn)` or `watchEffect(fn)` |
| `useRef(x)` | `ref(x)` |

- [ ] **Step 1: Translate useRootProvider**

Read `packages/react/src/hooks/useRootProvider.ts` line by line. Translate each hook call. The resulting composable calls `useUpupUpload()` internally, creates all computed values, event subscriptions, and returns the same shaped object.

Key sections to translate:
- Theme resolution (`computed` from `resolveTheme`)
- i18n translator (`computed` from `createTranslator`)
- Core event subscriptions (`watch` on core, subscribe/unsubscribe in `onMounted`/`onUnmounted`)
- Adapter plugin registration (`watch` on config changes)
- File progress tracking
- Image editor state

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @upup/vue run typecheck
```

- [ ] **Step 3: Commit**

---

### Task 6: UpupUploader root component

**Files:**
- Create: `packages/vue/src/upup-uploader.vue`
- Create: `packages/vue/tests/upup-uploader.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { mount } from '@vue/test-utils'
import UpupUploader from '../src/upup-uploader.vue'

describe('UpupUploader', () => {
  it('renders the root element with data-testid', () => {
    const wrapper = mount(UpupUploader, { props: { provider: 'backblaze' } })
    expect(wrapper.find('[data-testid="upup-root"]').exists()).toBe(true)
  })

  it('applies data-state attribute', () => {
    const wrapper = mount(UpupUploader, { props: { provider: 'backblaze' } })
    expect(wrapper.find('[data-testid="upup-root"]').attributes('data-state')).toBe('idle')
  })
})
```

- [ ] **Step 2: Implement UpupUploader.vue**

```vue
<script setup lang="ts">
import { provide } from 'vue'
import type { UpupUploaderProps } from './shared/types'
import useRootProvider from './composables/useRootProvider'
import { provideRootContext } from './context/root-context'
import MainBox from './components/MainBox.vue'

const props = defineProps<UpupUploaderProps>()
const providerValues = useRootProvider(props)
provideRootContext(providerValues)
</script>

<template>
  <div
    :class="`upup-scope upup-h-full upup-w-full ${props.className ?? ''}`"
    :style="props.style"
    data-testid="upup-root"
    data-upup-slot="root"
    :data-state="providerValues.upload.uploadStatus?.toLowerCase() ?? 'idle'"
    :lang="providerValues.lang"
    :dir="providerValues.dir"
  >
    <MainBox />
  </div>
</template>
```

- [ ] **Step 3: Run test — expect pass**
- [ ] **Step 4: Commit**

---

## Phase 3: Core Components (Tasks 7–11)

Each component follows the same pattern: read the React `.tsx`, translate JSX to Vue `<template>`, replace hooks with `inject()` composables. The Tailwind classes are **identical** — copy-paste from React.

### Task 7: MainBox.vue
Mirror `packages/react/src/components/MainBox.tsx`. Uses `useMainBox` composable for drag/drop.

### Task 8: AdapterSelector.vue
Mirror `packages/react/src/components/AdapterSelector.tsx`. Source icon buttons. Uses `useAdapterSelector` composable.

### Task 9: FileList.vue + FileItem.vue
Mirror `FileList.tsx` and `FileItem.tsx`. Uses `@tanstack/vue-virtual` for virtual scrolling. `FileItem` shows file thumbnail, name, size, delete button.

### Task 10: FilePreview.vue + FilePreviewPortal.vue + FilePreviewThumbnail.vue
Mirror the file preview modal. Vue uses `<Teleport to="body">` instead of React portals.

### Task 11: ProgressBar.vue + MainBoxHeader.vue
Mirror progress bar and header with file count, view toggle, remove-all.

**For each task (7–11):**
- [ ] Read the React component
- [ ] Write Vue SFC with `<script setup>` + `<template>`
- [ ] Same Tailwind classes (copy from React)
- [ ] Replace `useUploaderX()` React hooks with `useUploaderX()` Vue inject composables
- [ ] Write test: mount component, verify renders, verify key interactions
- [ ] Typecheck + test
- [ ] Commit

---

## Phase 4: Source Panels (Tasks 12–16)

### Task 12: UrlUploader.vue
Mirror `UrlUploader.tsx`. Uses `useFetchFileByUrl` composable.

### Task 13: CameraUploader.vue
Mirror `CameraUploader.tsx`. Uses `useCameraUploader` composable. Vue equivalent of `react-webcam` is direct `getUserMedia` API (already browser-standard).

### Task 14: AudioUploader.vue
Mirror `AudioUploader.tsx`. Uses `getUserMedia` with `audio: true`.

### Task 15: ScreenCaptureUploader.vue
Mirror `ScreenCaptureUploader.tsx`. Uses `getDisplayMedia`.

### Task 16: LocalFolderBrowser.vue
Mirror `LocalFolderBrowser.tsx`. Uses File System Access API.

**Same pattern as Phase 3 for each.**

---

## Phase 5: Cloud Adapters (Tasks 17–20)

Each adapter has two parts: a composable (translate from React hook) and a component (thin wrapper).

### Task 17: useDropbox composable + DropboxUploader.vue
- [ ] Translate `packages/react/src/hooks/useDropbox.ts` → `packages/vue/src/composables/useDropbox.ts`
  - `useState` → `ref`, `useEffect` → `onMounted` + `watch`, `useCallback` → plain function
  - Gets `DropboxPlugin` via `core.getPlugin('dropbox')`
  - Subscribes to `dropbox:*` events
- [ ] Create `DropboxUploader.vue` — renders `DriveBrowser` or `DriveAuthFallback`
- [ ] Test: mount, verify auth fallback renders
- [ ] Commit

### Task 18: useGoogleDrive composable + GoogleDriveUploader.vue
Same pattern. Includes `useLoadGAPI` composable for GIS script loading (`onMounted` + script tag injection).

### Task 19: useOneDrive composable + OneDriveUploader.vue
Same pattern.

### Task 20: useBox composable + BoxUploader.vue
Same pattern.

---

## Phase 6: Drive Browser (Tasks 21–23)

### Task 21: DriveBrowser.vue + DriveBrowserHeader.vue
Mirror `DriveBrowser.tsx` and `DriveBrowserHeader.tsx`. Already uses core `DriveFile`/`DriveFolder`/`DriveUser` types — no provider-specific types needed.

### Task 22: DriveBrowserItem.vue + DriveBrowserIcon.vue
Mirror item rendering. Direct `file.isFolder`, `file.thumbnail` access.

### Task 23: DriveAuthFallback.vue + AdapterViewContainer.vue + ServerModeDriveUploader.vue
Small utility components.

---

## Phase 7: Image Editor (Task 24)

### Task 24: Image editor stub or basic implementation

**Option A (stub):** Render a message "Image editor coming soon" when `imageEditor` prop is enabled. Ship and iterate.

**Option B (basic Canvas editor):** Build a minimal crop/rotate editor using HTML Canvas directly — no external library. ~200 lines. Supports:
- Crop via drag rectangle
- Rotate 90°
- Save/cancel

Recommend **Option A** for initial release, **Option B** as fast follow.

- [ ] Implement chosen option
- [ ] Test
- [ ] Commit

---

## Phase 8: Polish (Tasks 25–27)

### Task 25: Visual parity audit

- [ ] Start the React playground and the Vue demo side by side
- [ ] Screenshot each state: empty, files added, uploading, success, error, dark mode
- [ ] Compare and fix any Tailwind class differences
- [ ] Verify all `data-testid` and `data-upup-slot` attributes match React

### Task 26: Package smoke test

- [ ] `pnpm --filter @upup/vue run build`
- [ ] `pnpm --filter @upup/vue pack --pack-destination /tmp/vue-smoke`
- [ ] Create fresh Vite + Vue project
- [ ] `npm install /tmp/vue-smoke/upup-vue-2.2.0.tgz @upup/core vue`
- [ ] Write `smoke.vue` that imports `UpupUploader` and `useUpupUpload`
- [ ] `vue-tsc --noEmit` — must pass with zero errors
- [ ] Commit

### Task 27: Update workspace scripts

- [ ] Add `@upup/vue` to `build:package` script in root `package.json`:
```
pnpm --filter @upup/core run build && pnpm --filter @upup/server run build && pnpm --filter @upup/react run build && pnpm --filter @upup/vue run build
```
- [ ] Add to `test-release` script
- [ ] Verify `pnpm run build:package` builds all 4 packages
- [ ] Commit

---

## Final Verification

- [ ] `pnpm --filter @upup/vue run typecheck` — zero errors
- [ ] `pnpm --filter @upup/vue run test` — all pass
- [ ] `pnpm --filter @upup/vue run build` — succeeds
- [ ] Package smoke test — installs clean in fresh Vite project
- [ ] `pnpm run build:package` — all 4 packages build
- [ ] `pnpm run test` — all packages pass

## Success Criteria

1. `@upup/vue` exports `UpupUploader` component and `useUpupUpload` composable
2. Same props API as `@upup/react` (`UpupUploaderProps`)
3. Same Tailwind styling — visually identical when same theme/slots applied
4. Same `data-testid` and `data-upup-slot` attributes
5. All 4 cloud adapters render auth fallback correctly
6. Local file upload works end-to-end (add → upload → done)
7. Dark mode, i18n, virtual scrolling work
8. Package installs and typechecks clean from tarball
9. Image editor is stubbed with clear "coming soon" or basic Canvas implementation
