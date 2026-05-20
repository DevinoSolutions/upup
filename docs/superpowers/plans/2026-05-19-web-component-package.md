# @upup/web-component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@upup/web-component` — a `<upup-uploader>` custom element (zero React peer dep) usable from Angular, Svelte, Solid, plain HTML, and the landing page demo.

**Architecture:** Preact 10 + `@preact/compat` with tsup esbuild aliases (`react`→`preact/compat`, `react-dom`→`preact/compat`) lets the existing React JSX components compile verbatim. Two React-only runtime deps are replaced with vanilla alternatives: `react-webcam` → `getUserMedia`+`<video>` class, `react-filerobot-image-editor` → `filerobot-image-editor` (vanilla npm package). The custom element `UpupElement extends HTMLElement` renders the Preact tree into `this` (light DOM, no shadow boundary) on `connectedCallback` and tears it down on `disconnectedCallback`. Simple config props are HTML attributes; complex props (objects, callbacks) are JS properties set after element creation.

**Tech Stack:** Preact 10 + `@preact/compat`, TypeScript, Tailwind CSS (`upup-` prefix, pre-bundled to `dist/tailwind-prefixed.css`), tsup, Vitest, `filerobot-image-editor` (vanilla), `@upup/core` (workspace)

---

## File Structure

```
packages/web-component/
├── package.json
├── tsconfig.json
├── tsup.config.ts          ← preact/compat aliases live here
├── vitest.config.ts
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── index.ts            ← registers <upup-uploader>, re-exports UpupElement
│   ├── upup-element.ts     ← HTMLElement subclass (the custom element shell)
│   ├── upup-uploader.tsx   ← Preact root component (copied from @upup/react)
│   ├── tailwind.css        ← @tailwind base/components/utilities
│   ├── lib/
│   │   ├── tailwind.ts     ← cn() helper
│   │   └── webcam.ts       ← vanilla getUserMedia wrapper class
│   ├── context/
│   │   └── RootContext.ts  ← copied verbatim from @upup/react
│   ├── hooks/
│   │   ├── useCameraUploader.ts   ← adapted (webcam ref replaced)
│   │   └── *.ts                   ← all others copied verbatim
│   └── components/
│       ├── CameraUploader.tsx      ← adapted (<Webcam> replaced)
│       ├── ImageEditorModal.tsx    ← adapted (filerobot vanilla)
│       ├── ImageEditorInline.tsx   ← adapted (filerobot vanilla)
│       └── *.tsx                   ← all others copied verbatim
└── tests/
    ├── upup-element.test.ts
    └── webcam.test.ts
```

---

## Phase 1: Package Scaffold

### Task 1: package.json + tsup config + tsconfig

**Files:**
- Create: `packages/web-component/package.json`
- Create: `packages/web-component/tsup.config.ts`
- Create: `packages/web-component/tsconfig.json`
- Create: `packages/web-component/vitest.config.ts`

- [ ] **Step 1: Create `packages/web-component/package.json`**

```json
{
  "name": "@upup/web-component",
  "version": "2.2.0",
  "description": "Framework-agnostic <upup-uploader> custom element built on @upup/core.",
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
  "files": ["dist"],
  "scripts": {
    "build": "tsup && pnpm run build:css",
    "build:css": "postcss src/tailwind.css -o ./dist/tailwind-prefixed.css",
    "dev": "tsup --watch --onSuccess \"pnpm run build:css\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "release": "pnpm run build && pnpm publish --access public --no-git-checks"
  },
  "dependencies": {
    "@upup/core": "workspace:*",
    "clsx": "^2.1.1",
    "filerobot-image-editor": "^4.9.0",
    "load-script": "^2.0.0",
    "preact": "^10.25.0",
    "tailwind-merge": "^3.6.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@tailwindcss/container-queries": "^0.1.1",
    "@types/uuid": "^9.0.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "22.1.0",
    "postcss": "^8.5.2",
    "postcss-cli": "^11.0.1",
    "postcss-prefix-selector": "^2.1.1",
    "tailwindcss": "^3.4.17",
    "tsup": "^8.4.0",
    "typescript": "^5.3.2",
    "vitest": "^4.1.2"
  }
}
```

- [ ] **Step 2: Create `packages/web-component/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['@upup/core'],
    esbuildOptions(options) {
        // Alias react/react-dom to preact/compat so copied React JSX
        // compiles without installing React as a peer dependency.
        options.alias = {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            'react/jsx-runtime': 'preact/jsx-runtime',
        }
    },
})
```

- [ ] **Step 3: Create `packages/web-component/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "declaration": true,
    "declarationMap": true,
    "skipLibCheck": true,
    "paths": {
      "react": ["./node_modules/preact/compat"],
      "react-dom": ["./node_modules/preact/compat"],
      "react/jsx-runtime": ["./node_modules/preact/jsx-runtime"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `packages/web-component/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
    },
    resolve: {
        alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            'react/jsx-runtime': 'preact/jsx-runtime',
        },
    },
})
```

- [ ] **Step 5: Add to root `package.json` build scripts**

Open `package.json` at the repo root. Add `@upup/web-component` alongside the other packages:

```json
"build:package": "pnpm --filter @upup/core run build && pnpm --filter @upup/server run build && pnpm --filter @upup/react run build && pnpm --filter @upup/vue run build && pnpm --filter @upup/web-component run build",
"release": "pnpm --filter @upup/core run release && pnpm --filter @upup/server run release && pnpm --filter @upup/react run release && pnpm --filter @upup/vue run release && pnpm --filter @upup/web-component run release"
```

- [ ] **Step 6: Commit**

```bash
git add packages/web-component/package.json packages/web-component/tsup.config.ts packages/web-component/tsconfig.json packages/web-component/vitest.config.ts package.json
git commit -m "feat(web-component): scaffold package with preact/compat aliases"
```

---

### Task 2: Tailwind CSS build

**Files:**
- Create: `packages/web-component/tailwind.config.js`
- Create: `packages/web-component/postcss.config.js`
- Create: `packages/web-component/src/tailwind.css`
- Create: `packages/web-component/src/lib/tailwind.ts`

- [ ] **Step 1: Create `packages/web-component/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{ts,tsx}'],
    darkMode: 'class',
    prefix: 'upup-',
    theme: {
        extend: {},
    },
    plugins: [require('@tailwindcss/container-queries')],
}
```

- [ ] **Step 2: Create `packages/web-component/postcss.config.js`**

Copy verbatim from `packages/react/postcss.config.js`:

```bash
cp packages/react/postcss.config.js packages/web-component/postcss.config.js
```

- [ ] **Step 3: Create `packages/web-component/src/tailwind.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Create `packages/web-component/src/lib/tailwind.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Install dependencies and verify CSS builds**

```bash
pnpm install
pnpm --filter @upup/web-component run build:css
```

Expected: `packages/web-component/dist/tailwind-prefixed.css` created.

- [ ] **Step 6: Commit**

```bash
git add packages/web-component/tailwind.config.js packages/web-component/postcss.config.js packages/web-component/src/tailwind.css packages/web-component/src/lib/tailwind.ts
git commit -m "feat(web-component): add Tailwind CSS build with upup- prefix"
```

---

## Phase 2: Vanilla Webcam

### Task 3: `src/lib/webcam.ts` — vanilla getUserMedia wrapper

**Files:**
- Create: `packages/web-component/src/lib/webcam.ts`
- Create: `packages/web-component/tests/webcam.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/web-component/tests/webcam.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VanillaWebcam, FacingMode } from '../src/lib/webcam'

describe('VanillaWebcam', () => {
    let videoEl: HTMLVideoElement
    let cam: VanillaWebcam

    beforeEach(() => {
        videoEl = document.createElement('video')
        cam = new VanillaWebcam(videoEl)

        // Mock getUserMedia
        const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
        Object.defineProperty(navigator, 'mediaDevices', {
            value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
            configurable: true,
        })
    })

    afterEach(() => {
        cam.stop()
    })

    it('starts camera with environment facing mode by default', async () => {
        await cam.start()
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            video: { facingMode: 'environment' },
            audio: false,
        })
        expect(videoEl.srcObject).toBeDefined()
    })

    it('switches facing mode', async () => {
        cam.setFacingMode(FacingMode.User)
        await cam.start()
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            video: { facingMode: 'user' },
            audio: false,
        })
    })

    it('getScreenshot returns null when video not ready', () => {
        expect(cam.getScreenshot()).toBeNull()
    })

    it('stop() calls track.stop()', async () => {
        const stopFn = vi.fn()
        const mockStream = { getTracks: () => [{ stop: stopFn }] }
        ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(mockStream)
        await cam.start()
        cam.stop()
        expect(stopFn).toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Run — expect FAIL** (module not found)

```bash
pnpm --filter @upup/web-component run test
```

Expected: FAIL — `Cannot find module '../src/lib/webcam'`

- [ ] **Step 3: Implement `packages/web-component/src/lib/webcam.ts`**

```ts
export enum FacingMode {
    Environment = 'environment',
    User = 'user',
}

export class VanillaWebcam {
    private videoEl: HTMLVideoElement
    private stream: MediaStream | null = null
    private facingMode: FacingMode = FacingMode.Environment

    constructor(videoEl: HTMLVideoElement) {
        this.videoEl = videoEl
    }

    setFacingMode(mode: FacingMode): void {
        this.facingMode = mode
    }

    async start(): Promise<void> {
        this.stop()
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: this.facingMode },
            audio: false,
        })
        this.videoEl.srcObject = this.stream
        this.videoEl.play()
    }

    stop(): void {
        this.stream?.getTracks().forEach(t => t.stop())
        this.stream = null
        this.videoEl.srcObject = null
    }

    getScreenshot(format = 'image/jpeg'): string | null {
        if (!this.stream || this.videoEl.readyState < 2) return null
        const canvas = document.createElement('canvas')
        canvas.width = this.videoEl.videoWidth
        canvas.height = this.videoEl.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        ctx.drawImage(this.videoEl, 0, 0)
        return canvas.toDataURL(format)
    }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm --filter @upup/web-component run test
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web-component/src/lib/webcam.ts packages/web-component/tests/webcam.test.ts
git commit -m "feat(web-component): add VanillaWebcam getUserMedia wrapper"
```

---

### Task 4: CameraUploader + useCameraUploader (replace react-webcam)

**Files:**
- Create: `packages/web-component/src/hooks/useCameraUploader.ts`
- Create: `packages/web-component/src/components/CameraUploader.tsx`

- [ ] **Step 1: Create `packages/web-component/src/hooks/useCameraUploader.ts`**

This replaces `useRef<Webcam>(null)` with a `useRef<HTMLVideoElement>` + `VanillaWebcam` instance:

```ts
import { useRef, useState, useCallback } from 'react'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/RootContext'
import useFetchFileByUrl from './useFetchFileByUrl'
import { VanillaWebcam, FacingMode } from '../lib/webcam'

export { FacingMode }

export default function useCameraUploader() {
    const { core } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const { setActiveAdapter } = useUploaderSource()
    const { translations } = useUploaderI18n()
    const props = useUploaderOptions()
    const theme = useUploaderTheme()
    const { fetchImage } = useFetchFileByUrl()

    const videoRef = useRef<HTMLVideoElement>(null)
    const camRef = useRef<VanillaWebcam | null>(null)
    const [url, setUrl] = useState('')
    const [facingMode, setFacingModeState] = useState<FacingMode>(FacingMode.Environment)
    const newCameraSide = facingMode === FacingMode.Environment ? 'front' : 'back'
    const clearUrl = () => setUrl('')

    // Called by CameraUploader once the <video> element mounts
    const initCamera = useCallback(async (el: HTMLVideoElement) => {
        camRef.current = new VanillaWebcam(el)
        camRef.current.setFacingMode(facingMode)
        await camRef.current.start()
    }, [facingMode])

    const stopCamera = useCallback(() => {
        camRef.current?.stop()
        camRef.current = null
    }, [])

    const capture = async () => {
        const dataUrl = camRef.current?.getScreenshot()
        if (!dataUrl) return
        setUrl(dataUrl)
        core?.emit('camera-capture', { dataUrl })
    }

    const handleFetchImage = async () => {
        const file = await fetchImage(url)
        if (file) {
            setFiles([file])
            setUrl('')
            setActiveAdapter(undefined)
            core?.emit('camera-confirm', { file })
        }
    }

    const handleCameraSwitch = useCallback(async () => {
        const next = facingMode === FacingMode.Environment ? FacingMode.User : FacingMode.Environment
        setFacingModeState(next)
        if (camRef.current && videoRef.current) {
            camRef.current.setFacingMode(next)
            await camRef.current.start()
        }
    }, [facingMode])

    return {
        url,
        videoRef,
        facingMode,
        capture,
        handleFetchImage,
        clearUrl,
        handleCameraSwitch,
        newCameraSide,
        initCamera,
        stopCamera,
        translations,
        props,
        theme,
    }
}
```

- [ ] **Step 2: Create `packages/web-component/src/components/CameraUploader.tsx`**

Copy `packages/react/src/components/CameraUploader.tsx` and replace `<Webcam>` with `<video>` + lifecycle hooks:

```tsx
import { h } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { cn, formatUiMessage as t } from '@upup/core'
import useCameraUploader from '../hooks/useCameraUploader'
import AdapterViewContainer from './shared/AdapterViewContainer'
import ShouldRender from './shared/ShouldRender'

export default function CameraUploader() {
    const {
        capture,
        handleFetchImage,
        clearUrl,
        handleCameraSwitch,
        newCameraSide,
        url,
        videoRef,
        initCamera,
        stopCamera,
        translations: tr,
        props: { icons: { CameraCaptureIcon, CameraDeleteIcon, CameraRotateIcon } },
        theme: { isDark: dark, slotOverrides: slotClasses },
    } = useCameraUploader()

    useEffect(() => {
        if (!url && videoRef.current) {
            initCamera(videoRef.current)
        }
        return () => {
            stopCamera()
        }
    }, [url])

    return (
        <AdapterViewContainer data-upup-slot="camera-uploader">
            <div data-testid="upup-camera-uploader" className="upup-flex upup-h-full upup-w-full upup-flex-col upup-justify-center upup-overflow-auto upup-px-3 upup-py-2">
                <div className="upup-flex-1 upup-pt-10">
                    <ShouldRender if={!!url}>
                        <div
                            className={cn(
                                'upup-relative upup-aspect-video upup-bg-black/[0.025] upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl',
                                { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
                                slotClasses.cameraPreviewContainer,
                            )}
                            style={{ backgroundImage: `url(${url})` }}
                        >
                            <button
                                onClick={clearUrl}
                                className={cn('upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]', slotClasses.cameraDeleteButton)}
                                type="button"
                            >
                                <CameraDeleteIcon />
                            </button>
                        </div>
                    </ShouldRender>
                    <ShouldRender if={!url}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="upup-aspect-video upup-rounded-xl"
                        />
                    </ShouldRender>
                </div>
                <div className="upup-flex upup-gap-4">
                    <ShouldRender if={!url}>
                        <button
                            onClick={handleCameraSwitch}
                            className={cn('upup-flex upup-flex-1 upup-items-center upup-justify-center upup-gap-2 upup-rounded-xl upup-border upup-border-solid upup-border-gray-200 upup-px-4 upup-py-2', slotClasses.cameraSwitchButton)}
                            type="button"
                        >
                            <CameraRotateIcon />
                            {t(tr.camera_switch_to, { side: newCameraSide })}
                        </button>
                        <button
                            onClick={capture}
                            className={cn('upup-flex upup-flex-1 upup-items-center upup-justify-center upup-gap-2 upup-rounded-xl upup-bg-[#1d4ed8] upup-px-4 upup-py-2 upup-text-white', slotClasses.cameraCaptureButton)}
                            type="button"
                        >
                            <CameraCaptureIcon />
                            {tr.camera_capture}
                        </button>
                    </ShouldRender>
                    <ShouldRender if={!!url}>
                        <button
                            onClick={clearUrl}
                            className={cn('upup-flex upup-flex-1 upup-items-center upup-justify-center upup-gap-2 upup-rounded-xl upup-border upup-border-solid upup-border-gray-200 upup-px-4 upup-py-2', slotClasses.cameraRetakeButton)}
                            type="button"
                        >
                            {tr.camera_retake}
                        </button>
                        <button
                            onClick={handleFetchImage}
                            className={cn('upup-flex upup-flex-1 upup-items-center upup-justify-center upup-gap-2 upup-rounded-xl upup-bg-[#1d4ed8] upup-px-4 upup-py-2 upup-text-white', slotClasses.cameraConfirmButton)}
                            type="button"
                        >
                            {tr.camera_use_photo}
                        </button>
                    </ShouldRender>
                </div>
            </div>
        </AdapterViewContainer>
    )
}
```

- [ ] **Step 3: Build to verify no TS errors**

```bash
pnpm --filter @upup/web-component run typecheck
```

Expected: no errors (may need context + other components to be copied first — skip to Task 8 and come back if needed)

- [ ] **Step 4: Commit**

```bash
git add packages/web-component/src/hooks/useCameraUploader.ts packages/web-component/src/components/CameraUploader.tsx
git commit -m "feat(web-component): vanilla webcam in CameraUploader (no react-webcam)"
```

---

## Phase 3: Vanilla Image Editor

### Task 5: `ImageEditorModal.tsx` — replace `react-filerobot-image-editor`

**Files:**
- Create: `packages/web-component/src/components/ImageEditorModal.tsx`

The vanilla `filerobot-image-editor` API: `new FilerobotImageEditor(containerEl, config)` then `.render()`. We wrap it in a Preact component that uses a `<div ref>` as the mount target.

- [ ] **Step 1: Create `packages/web-component/src/components/ImageEditorModal.tsx`**

```tsx
import { h } from 'preact'
import { memo, useCallback, useEffect, useRef, useState } from 'preact/compat'
import { cn } from '@upup/core'
import type { UploadFile } from '@upup/core'
import { useUploaderOptions, useUploaderTheme } from '../context/RootContext'
import { getFilerobotTheme, getImageEditorCssOverrides } from '../lib/imageEditorHelpers'

type Props = {
    file: UploadFile
    onClose: () => void
    onSave: (editedImageData: string, mimeType?: string) => void
}

export default memo(function ImageEditorModal({ file, onClose, onSave }: Props) {
    const { imageEditor: editorConfig } = useUploaderOptions()
    const { isDark: dark } = useUploaderTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<{ terminate: () => void } | null>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<Element | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Focus trap: capture current focus, restore on close
    useEffect(() => {
        previousFocusRef.current = document.activeElement
        return () => {
            ;(previousFocusRef.current as HTMLElement | null)?.focus()
        }
    }, [])

    // ESC to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    // Mount vanilla filerobot-image-editor into containerRef
    useEffect(() => {
        if (!containerRef.current || !file.url) return
        let cancelled = false

        ;(async () => {
            try {
                const { default: FilerobotImageEditor, TABS, TOOLS } = await import('filerobot-image-editor')
                if (cancelled || !containerRef.current) return

                const theme = getFilerobotTheme(dark)
                const resolvedTabs = editorConfig.tabs?.map(
                    (tab) => (TABS as Record<string, unknown>)[tab.toUpperCase() as string]
                )

                const editor = new FilerobotImageEditor(containerRef.current, {
                    source: file.url,
                    theme,
                    defaultTabId: TABS.ADJUST,
                    tabsIds: resolvedTabs?.length ? resolvedTabs : undefined,
                    onSave(imageData: { imageBase64?: string; mimeType?: string }) {
                        if (!imageData.imageBase64) return
                        const dataURL = imageData.imageBase64.startsWith('data:')
                            ? imageData.imageBase64
                            : `data:${imageData.mimeType || file.type};base64,${imageData.imageBase64}`
                        onSave(dataURL, imageData.mimeType)
                    },
                    onClose,
                    onBeforeSave: () => false,
                    savingPixelRatio: 4,
                    previewPixelRatio: 4,
                })
                editor.render()
                editorRef.current = editor
            } catch {
                if (cancelled) return
                setLoadError('Image editor failed to load.')
            }
        })()

        return () => {
            cancelled = true
            editorRef.current?.terminate()
            editorRef.current = null
        }
    }, [file.url, dark])

    const handleOverlayClick = useCallback(
        (e: MouseEvent) => {
            if (e.target === overlayRef.current) onClose()
        },
        [onClose],
    )

    const cssOverrides = getImageEditorCssOverrides(dark)

    return (
        <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Image editor"
            className="upup-fixed upup-inset-0 upup-z-50 upup-flex upup-items-center upup-justify-center upup-bg-black/70"
            onClick={handleOverlayClick}
        >
            {cssOverrides && <style>{cssOverrides}</style>}
            <div
                className="upup-relative upup-flex upup-h-[90vh] upup-w-[90vw] upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-bg-white dark:upup-bg-gray-900"
                onClick={(e) => e.stopPropagation()}
            >
                {loadError && (
                    <p className="upup-p-4 upup-text-red-500">{loadError}</p>
                )}
                <div ref={containerRef} className="upup-h-full upup-w-full" />
            </div>
        </div>
    )
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/web-component/src/components/ImageEditorModal.tsx
git commit -m "feat(web-component): ImageEditorModal using vanilla filerobot-image-editor"
```

---

### Task 6: `ImageEditorInline.tsx` — vanilla filerobot inline variant

**Files:**
- Create: `packages/web-component/src/components/ImageEditorInline.tsx`

- [ ] **Step 1: Create `packages/web-component/src/components/ImageEditorInline.tsx`**

```tsx
import { h } from 'preact'
import { memo, useCallback, useEffect, useRef, useState } from 'preact/compat'
import { cn } from '@upup/core'
import type { UploadFile } from '@upup/core'
import { useUploaderOptions, useUploaderTheme } from '../context/RootContext'
import { getFilerobotTheme, getImageEditorCssOverrides } from '../lib/imageEditorHelpers'

type Props = {
    file: UploadFile
    onClose: () => void
    onSave: (editedImageData: string, mimeType?: string) => void
}

export default memo(function ImageEditorInline({ file, onClose, onSave }: Props) {
    const { imageEditor: editorConfig } = useUploaderOptions()
    const { isDark: dark } = useUploaderTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<{ terminate: () => void } | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        if (!containerRef.current || !file.url) return
        let cancelled = false

        ;(async () => {
            try {
                const { default: FilerobotImageEditor, TABS } = await import('filerobot-image-editor')
                if (cancelled || !containerRef.current) return

                const theme = getFilerobotTheme(dark)
                const resolvedTabs = editorConfig.tabs?.map(
                    (tab) => (TABS as Record<string, unknown>)[tab.toUpperCase() as string]
                )

                const editor = new FilerobotImageEditor(containerRef.current, {
                    source: file.url,
                    theme,
                    defaultTabId: TABS.ADJUST,
                    tabsIds: resolvedTabs?.length ? resolvedTabs : undefined,
                    onSave(imageData: { imageBase64?: string; mimeType?: string }) {
                        if (!imageData.imageBase64) return
                        const dataURL = imageData.imageBase64.startsWith('data:')
                            ? imageData.imageBase64
                            : `data:${imageData.mimeType || file.type};base64,${imageData.imageBase64}`
                        onSave(dataURL, imageData.mimeType)
                    },
                    onClose,
                    onBeforeSave: () => false,
                    savingPixelRatio: 4,
                    previewPixelRatio: 4,
                })
                editor.render()
                editorRef.current = editor
            } catch {
                if (cancelled) return
                setLoadError('Image editor failed to load.')
            }
        })()

        return () => {
            cancelled = true
            editorRef.current?.terminate()
            editorRef.current = null
        }
    }, [file.url, dark])

    const cssOverrides = getImageEditorCssOverrides(dark)

    return (
        <div
            className={cn(
                'upup-absolute upup-inset-0 upup-z-20 upup-flex upup-flex-col upup-overflow-hidden upup-rounded-xl',
                dark ? 'upup-bg-gray-900' : 'upup-bg-white',
            )}
        >
            {cssOverrides && <style>{cssOverrides}</style>}
            {loadError && (
                <p className="upup-p-4 upup-text-red-500">{loadError}</p>
            )}
            <div ref={containerRef} className="upup-h-full upup-w-full" />
        </div>
    )
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/web-component/src/components/ImageEditorInline.tsx
git commit -m "feat(web-component): ImageEditorInline using vanilla filerobot-image-editor"
```

---

## Phase 4: Copy React UI (preact/compat handles the rest)

### Task 7: Copy context, hooks, and shared utilities

The `@preact/compat` tsup alias means all files that import from `'react'` resolve to Preact at build time. No source changes needed for these files.

**Files:**
- Create: `packages/web-component/src/context/RootContext.ts` (copy)
- Create: `packages/web-component/src/hooks/` (copy all except useCameraUploader)
- Create: `packages/web-component/src/lib/imageEditorHelpers.ts` (copy)
- Create: `packages/web-component/src/assets/logos.ts` (copy)
- Create: `packages/web-component/src/shared/types.ts` (copy)

- [ ] **Step 1: Copy context**

```bash
cp packages/react/src/context/RootContext.ts packages/web-component/src/context/RootContext.ts
```

- [ ] **Step 2: Copy hooks (all except useCameraUploader — already written in Task 4)**

```bash
mkdir -p packages/web-component/src/hooks
for f in packages/react/src/hooks/*.ts; do
  name=$(basename "$f")
  if [ "$name" != "useCameraUploader.ts" ]; then
    cp "$f" "packages/web-component/src/hooks/$name"
  fi
done
```

- [ ] **Step 3: Copy shared lib files**

```bash
mkdir -p packages/web-component/src/lib
cp packages/react/src/lib/imageEditorHelpers.ts packages/web-component/src/lib/imageEditorHelpers.ts
cp packages/react/src/lib/file.ts packages/web-component/src/lib/file.ts 2>/dev/null || true
```

- [ ] **Step 4: Copy shared types and assets**

```bash
mkdir -p packages/web-component/src/shared packages/web-component/src/assets
cp packages/react/src/shared/types.ts packages/web-component/src/shared/types.ts 2>/dev/null || true
cp packages/react/src/assets/logos.ts packages/web-component/src/assets/logos.ts 2>/dev/null || true
```

- [ ] **Step 5: Commit**

```bash
git add packages/web-component/src/context/ packages/web-component/src/hooks/ packages/web-component/src/lib/ packages/web-component/src/shared/ packages/web-component/src/assets/
git commit -m "feat(web-component): copy context, hooks, and lib utilities from @upup/react"
```

---

### Task 8: Copy all React components (except already-written ones)

**Files:**
- Create: `packages/web-component/src/components/` (all except CameraUploader, ImageEditorModal, ImageEditorInline — already written)

- [ ] **Step 1: Copy all components except the three already written**

```bash
mkdir -p packages/web-component/src/components/shared packages/web-component/src/components/drive-browser
for f in packages/react/src/components/*.tsx packages/react/src/components/*.ts; do
  name=$(basename "$f")
  case "$name" in
    CameraUploader.tsx|ImageEditorModal.tsx|ImageEditorInline.tsx) ;;
    *) cp "$f" "packages/web-component/src/components/$name" ;;
  esac
done
# Copy subdirectories
cp packages/react/src/components/shared/*.tsx packages/web-component/src/components/shared/ 2>/dev/null || true
cp packages/react/src/components/shared/*.ts packages/web-component/src/components/shared/ 2>/dev/null || true
cp packages/react/src/components/drive-browser/*.tsx packages/web-component/src/components/drive-browser/ 2>/dev/null || true
```

- [ ] **Step 2: Copy root uploader component**

```bash
cp packages/react/src/upup-uploader.tsx packages/web-component/src/upup-uploader.tsx
```

- [ ] **Step 3: Attempt a build to surface any import errors**

```bash
pnpm --filter @upup/web-component run build 2>&1 | head -60
```

Resolve any import errors by checking what modules are missing (likely some icons or helper imports that need path adjustments).

- [ ] **Step 4: Fix any import paths that differ between packages**

Common issues:
- `react-icons/*` — if used directly, replace with inline SVGs or install `preact-icons` equivalent. Check with:
  ```bash
  grep -r "from 'react-icons" packages/web-component/src/ --include="*.tsx" --include="*.ts"
  ```
  If any hits: copy the icon SVGs from `@upup/react/src/components/Icons.ts` (which already inlines them) or replace with `@upup/core`'s icon utilities.

- `react-konva` / `konva` — if any component imports these, replace or stub. Check:
  ```bash
  grep -r "from 'react-konva\|from 'konva" packages/web-component/src/ --include="*.tsx"
  ```
  Most likely these are only in ImageEditorInline/Modal (already replaced). If found elsewhere, stub with a no-op div.

- [ ] **Step 5: Run build until clean**

```bash
pnpm --filter @upup/web-component run build
```

Expected: `dist/index.js` and `dist/index.cjs` created.

- [ ] **Step 6: Commit**

```bash
git add packages/web-component/src/components/ packages/web-component/src/upup-uploader.tsx
git commit -m "feat(web-component): copy all React UI components (preact/compat shim)"
```

---

## Phase 5: Custom Element Shell

### Task 9: `src/upup-element.ts` — HTMLElement subclass

**Files:**
- Create: `packages/web-component/src/upup-element.ts`
- Create: `packages/web-component/tests/upup-element.test.ts`

The element accepts a core subset of `UpupUploaderProps` as observed attributes (string-safe values). Complex props (callbacks, objects) are set as JS properties before or after insertion.

- [ ] **Step 1: Write the failing test**

```ts
// packages/web-component/tests/upup-element.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Register the element before tests run
await import('../src/index')

describe('<upup-uploader>', () => {
    let el: HTMLElement

    beforeEach(() => {
        el = document.createElement('upup-uploader')
        document.body.appendChild(el)
    })

    afterEach(() => {
        document.body.removeChild(el)
    })

    it('is a valid custom element', () => {
        expect(customElements.get('upup-uploader')).toBeDefined()
    })

    it('renders a root div into light DOM on connect', () => {
        expect(el.querySelector('[data-testid="upup-root"]')).not.toBeNull()
    })

    it('observes the provider attribute', () => {
        expect(UpupElement.observedAttributes).toContain('provider')
    })

    it('exposes setProps() for complex options', () => {
        const instance = el as UpupElement
        expect(typeof instance.setProps).toBe('function')
    })
})
```

Import `UpupElement` type at top of the test file:
```ts
import type { UpupElement } from '../src/upup-element'
```

- [ ] **Step 2: Run — expect FAIL** (module not found)

```bash
pnpm --filter @upup/web-component run test
```

Expected: FAIL — `Cannot find module '../src/index'`

- [ ] **Step 3: Create `packages/web-component/src/upup-element.ts`**

```ts
import { render, h } from 'preact'
import UpupUploader from './upup-uploader'
import type { UpupUploaderProps } from '@upup/core'

// Attributes that can be set as HTML attributes (string values only).
const OBSERVED_ATTRS = [
    'provider',
    'max-file-size',
    'limit',
    'lang',
    'multiple',
    'accept',
    'mini',
    'dark',
] as const

type ObservedAttr = (typeof OBSERVED_ATTRS)[number]

export class UpupElement extends HTMLElement {
    static observedAttributes: string[] = [...OBSERVED_ATTRS]

    private _extraProps: Partial<UpupUploaderProps> = {}
    private _mounted = false

    /** Set complex props (callbacks, nested objects) that can't be HTML attributes. */
    setProps(props: Partial<UpupUploaderProps>): void {
        this._extraProps = { ...this._extraProps, ...props }
        if (this._mounted) this._render()
    }

    connectedCallback() {
        this._mounted = true
        this._render()
    }

    disconnectedCallback() {
        this._mounted = false
        render(null, this)
    }

    attributeChangedCallback(_name: ObservedAttr, _old: string | null, _next: string | null) {
        if (this._mounted) this._render()
    }

    private _buildProps(): UpupUploaderProps {
        const get = (attr: string) => this.getAttribute(attr)
        const attrProps: Partial<UpupUploaderProps> = {
            // Required — if not set, Preact renders nothing meaningful but won't crash
            provider: (get('provider') as UpupUploaderProps['provider']) ?? ('backblaze' as any),
            lang: (get('lang') as any) ?? undefined,
            limit: get('limit') ? Number(get('limit')) : undefined,
            mini: this.hasAttribute('mini') ? true : undefined,
            dark: this.hasAttribute('dark') ? true : undefined,
        }

        // Remove undefined keys so they don't override _extraProps defaults
        const cleaned = Object.fromEntries(
            Object.entries(attrProps).filter(([, v]) => v !== undefined),
        ) as Partial<UpupUploaderProps>

        return { ...this._extraProps, ...cleaned } as UpupUploaderProps
    }

    private _render() {
        const props = this._buildProps()
        render(h(UpupUploader, props), this)
    }
}
```

- [ ] **Step 4: Create `packages/web-component/src/index.ts`**

```ts
import { UpupElement } from './upup-element'
import './tailwind.css'

if (typeof customElements !== 'undefined' && !customElements.get('upup-uploader')) {
    customElements.define('upup-uploader', UpupElement)
}

export { UpupElement }
export type { OrchestratorState, OrchestratorCallbacks } from '@upup/core'
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm --filter @upup/web-component run test
```

Expected: PASS (5 tests across webcam + element suites)

- [ ] **Step 6: Build the full package**

```bash
pnpm --filter @upup/web-component run build
```

Expected: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/tailwind-prefixed.css`

- [ ] **Step 7: Commit**

```bash
git add packages/web-component/src/upup-element.ts packages/web-component/src/index.ts packages/web-component/tests/upup-element.test.ts
git commit -m "feat(web-component): UpupElement custom element shell with preact renderer"
```

---

### Task 10: Package smoke test

**Files:**
- Modify: `scripts/package-smoke-consumer.mjs` (or create a new test script)

- [ ] **Step 1: Verify the custom element registers correctly in Node JSDOM**

Create `packages/web-component/tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('package smoke', () => {
    it('exports UpupElement', async () => {
        const mod = await import('../src/index')
        expect(mod.UpupElement).toBeDefined()
        expect(typeof mod.UpupElement).toBe('function')
    })

    it('custom element is registered after import', async () => {
        await import('../src/index')
        expect(customElements.get('upup-uploader')).toBeDefined()
    })

    it('dist/tailwind-prefixed.css exists', async () => {
        const { existsSync } = await import('fs')
        expect(existsSync('dist/tailwind-prefixed.css')).toBe(true)
    })
})
```

- [ ] **Step 2: Run smoke tests**

```bash
pnpm --filter @upup/web-component run test
```

Expected: PASS (all tests)

- [ ] **Step 3: Commit**

```bash
git add packages/web-component/tests/smoke.test.ts
git commit -m "test(web-component): package smoke tests"
```

---

## Phase 6: Landing Page Integration

### Task 11: Embed `<upup-uploader>` in the landing page (remove iframe)

**Files:**
- Modify: `apps/landing/src/` — find and replace the iframe embed with the custom element

- [ ] **Step 1: Find the iframe in the landing page**

```bash
grep -rn "iframe\|playground" apps/landing/src/ --include="*.tsx" --include="*.ts" -l
```

Note the file path (likely `apps/landing/src/app/page.tsx` or a demo component).

- [ ] **Step 2: Add `@upup/web-component` to landing app**

Edit `apps/landing/package.json` — add the dependency:

```json
"dependencies": {
  "@upup/web-component": "workspace:*"
}
```

Then:

```bash
pnpm install
```

- [ ] **Step 3: Create `apps/landing/src/components/UploaderDemo.tsx`**

This is a `'use client'` Next.js component that mounts the web component and wires up the config panel:

```tsx
'use client'

import { useEffect, useRef, type ComponentProps } from 'react'
import type { UpupElement } from '@upup/web-component'

// Import the CSS — Next.js handles this via global CSS or a <link> tag
import '@upup/web-component/styles'

type DemoProps = {
    provider?: string
    dark?: boolean
    mini?: boolean
}

export default function UploaderDemo({ provider = 'backblaze', dark = false, mini = false }: DemoProps) {
    const elRef = useRef<UpupElement | null>(null)

    useEffect(() => {
        // Dynamically register the custom element (SSR-safe)
        import('@upup/web-component').then(({ UpupElement }) => {
            if (!customElements.get('upup-uploader')) {
                customElements.define('upup-uploader', UpupElement)
            }
        })
    }, [])

    useEffect(() => {
        if (!elRef.current) return
        elRef.current.setProps({
            provider: provider as any,
            dark,
            mini,
            onUploadComplete: (files) => console.log('uploaded:', files),
        })
    }, [provider, dark, mini])

    return (
        <div style={{ width: '100%', height: '400px' }}>
            {/* @ts-ignore — custom element not in JSX types */}
            <upup-uploader
                ref={elRef}
                provider={provider}
                class="upup-scope"
                style={{ width: '100%', height: '100%', display: 'block' }}
            />
        </div>
    )
}
```

- [ ] **Step 4: Replace the iframe in the landing page with `<UploaderDemo />`**

Open the file found in Step 1. Remove the `<iframe>` block and replace with:

```tsx
import UploaderDemo from '@/components/UploaderDemo'

// Inside JSX, replace:
// <iframe src="..." ... />
// With:
<UploaderDemo provider="backblaze" />
```

- [ ] **Step 5: Start the landing dev server and verify**

```bash
pnpm --filter @upup/landing run dev
```

Open browser — verify the uploader renders inline (no iframe). Verify file selection works.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/package.json apps/landing/src/components/UploaderDemo.tsx
git commit -m "feat(landing): replace iframe with <upup-uploader> custom element"
```

---

### Task 12: Config panel → element property binding

This task enables the landing page config panel (the sidebar that lets users change uploader settings) to communicate directly with the custom element instead of via `postMessage` cross-iframe.

- [ ] **Step 1: Find the config panel component**

```bash
grep -rn "postMessage\|config.*panel\|ConfigPanel\|playground.*config" apps/landing/src/ --include="*.tsx" -l
```

- [ ] **Step 2: Replace `postMessage` calls with direct element property access**

In the config panel, find where options are sent (currently via `window.postMessage` or iframe ref). Replace with:

```tsx
// Before (postMessage):
iframeRef.current?.contentWindow?.postMessage({ type: 'config', payload: options }, '*')

// After (direct property):
const el = document.querySelector('upup-uploader') as UpupElement | null
el?.setProps(options)
```

- [ ] **Step 3: Verify config panel still works**

With the dev server running, change settings in the config panel — verify they apply immediately to the inline uploader.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(landing): config panel uses direct element.setProps() instead of postMessage"
```

---

## Phase 7: Polish

### Task 13: Update workspace scripts and turbo pipeline

**Files:**
- Modify: `package.json` (root)
- Modify: `turbo.json` (if exists)

- [ ] **Step 1: Add `@upup/web-component` to all relevant root scripts**

Open root `package.json`. Ensure `build:package`, `release`, `test-release` all include `@upup/web-component`:

```json
"build:package": "pnpm --filter @upup/core run build && pnpm --filter @upup/server run build && pnpm --filter @upup/react run build && pnpm --filter @upup/vue run build && pnpm --filter @upup/web-component run build",
"release": "pnpm --filter @upup/core run release && pnpm --filter @upup/server run release && pnpm --filter @upup/react run release && pnpm --filter @upup/vue run release && pnpm --filter @upup/web-component run release",
"test-release": "pnpm --filter @upup/core run test-release && pnpm --filter @upup/server run test-release && pnpm --filter @upup/react run test-release && pnpm --filter @upup/vue run test-release && pnpm --filter @upup/web-component run test-release"
```

- [ ] **Step 2: Run the full test suite**

```bash
pnpm run test
```

Expected: all packages PASS.

- [ ] **Step 3: Run a test-release dry run**

```bash
pnpm --filter @upup/web-component run test-release
```

Expected: dry run output showing what would be published, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add @upup/web-component to workspace build and release scripts"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task(s) |
|---|---|
| Package scaffold with preact/compat | Task 1, 2 |
| Vanilla webcam (getUserMedia) | Task 3, 4 |
| Vanilla image editor (filerobot vanilla) | Task 5, 6 |
| Copy React UI via compat alias | Task 7, 8 |
| `<upup-uploader>` custom element | Task 9 |
| Custom element registration | Task 9 (index.ts) |
| Attribute→prop reflection | Task 9 (observedAttributes) |
| Complex prop via `setProps()` | Task 9 |
| Landing page: remove iframe | Task 11 |
| Landing page: config panel binding | Task 12 |
| Workspace integration | Task 13 |

### Placeholder Scan

- All code blocks are complete — no "implement later" gaps.
- Task 8 Step 3 ("fix any import errors") is open-ended by necessity: the errors depend on exact React component imports we don't know until the copy runs. The `grep` commands give exact targets to fix.

### Type Consistency

- `UpupElement.setProps(props: Partial<UpupUploaderProps>)` — matches type in Tasks 9 and 12.
- `VanillaWebcam.getScreenshot()` returns `string | null` — matched in `useCameraUploader.ts` Task 4 (`const dataUrl = camRef.current?.getScreenshot()`).
- `FacingMode` enum defined in `webcam.ts` — re-exported from `useCameraUploader.ts` for component use.
- `filerobot-image-editor` constructor API `new FilerobotImageEditor(el, config)` — identical in Tasks 5 and 6.
