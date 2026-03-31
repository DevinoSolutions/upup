# upup v2.0 Competitive Enhancements

> Recommendations derived from competitive analysis of: **react-uploady**, **better-upload**, **uploadcare**, **react-filepond** against the upup v2 architecture spec.
>
> **Note:** Another implementation session may have already completed some items from the main spec. These enhancements are additive — check current codebase state before implementing.

---

## HIGH PRIORITY

### 1. Enhancer / Extension Pattern

**Source:** react-uploady  
**Why:** upup's `onBeforeUpload`/`onAfterUpload` are per-event callbacks, not a true extension system. react-uploady's enhancer pattern allows third-party plugins to deeply integrate without modifying core — creation-time extension via `(uploader, trigger) => UploaderType`, `composeEnhancers()`, and `registerExtension("name", { methods })`.

**Recommendation:** Add an `enhancers` option to `CoreOptions` and a `registerExtension()` method on `UpupCore`.

```typescript
// @upup/shared — new types
type Enhancer = (core: UpupCore) => UpupCore
type ExtensionMethods = Record<string, (...args: unknown[]) => unknown>

// @upup/shared — CoreOptions addition
type CoreOptions = {
  // ... existing options ...
  enhancers?: Enhancer[]
}

// @upup/core — UpupCore additions
class UpupCore {
  // ... existing methods ...
  registerExtension(name: string, methods: ExtensionMethods): void
  getExtension(name: string): ExtensionMethods | undefined
}

// Compose utility
function composeEnhancers(...enhancers: Enhancer[]): Enhancer
```

**Usage:**
```typescript
// Third-party thumbnail enhancer
const thumbnailEnhancer: Enhancer = (core) => {
  core.on('file-added', (file) => {
    // generate thumbnail
  })
  core.registerExtension('thumbnails', {
    getThumbnail: (fileId: string) => { /* ... */ },
  })
  return core
}

const uploader = useUpupUpload({
  provider: 'aws',
  uploadEndpoint: '/api/upload',
  enhancers: [thumbnailEnhancer, analyticsEnhancer],
})
```

---

### 2. Custom Success Detection (`isSuccessfulCall`)

**Source:** react-uploady  
**Why:** HTTP 2xx doesn't always mean success. Many APIs return `200 OK` with `{ success: false, error: "..." }` in the body. react-uploady's `isSuccessfulCall` is an async function `(xhr) => boolean` that lets consumers define real success criteria.

**Recommendation:** Add `isSuccessfulCall` to `CoreOptions`.

```typescript
// @upup/shared — new type
type UploadResponse = {
  status: number
  headers: Record<string, string>
  body: unknown
}

// @upup/shared — CoreOptions addition
type CoreOptions = {
  // ... existing options ...
  isSuccessfulCall?: (response: UploadResponse) => boolean | Promise<boolean>
}
```

**Usage:**
```typescript
const uploader = useUpupUpload({
  provider: 'aws',
  uploadEndpoint: '/api/upload',
  isSuccessfulCall: async (response) => {
    const body = response.body as { success: boolean }
    return response.status === 200 && body.success === true
  },
})
```

---

### 3. Async File Filter (`onBeforeFileAdded`)

**Source:** react-uploady  
**Why:** upup's current `onBeforeFileAdded` is synchronous. react-uploady's `fileFilter` supports async predicates — enabling server-side duplicate checks, virus scans, or external validation before accepting files.

**Recommendation:** Make `onBeforeFileAdded` accept async return values.

```typescript
// @upup/shared — updated callback signature
type CoreOptions = {
  // ... existing options ...
  onBeforeFileAdded?: (file: File) => boolean | Promise<boolean>
}
```

**Implementation notes:**
- `addFiles()` already returns `Promise<void>`, so awaiting the filter is natural.
- When async, files should show a "validating" status while the predicate resolves.
- Rejected files should emit a `file-rejected` event with the reason.

**Usage:**
```typescript
const uploader = useUpupUpload({
  provider: 'aws',
  uploadEndpoint: '/api/upload',
  onBeforeFileAdded: async (file) => {
    // Server-side duplicate check
    const res = await fetch('/api/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, size: file.size }),
    })
    const { isDuplicate } = await res.json()
    return !isDuplicate
  },
})
```

---

### 4. Paste Upload Zone

**Source:** better-upload  
**Why:** Clipboard-based upload (paste screenshots, copied files) is a common UX pattern that better-upload provides as a dedicated component. upup currently has no paste support.

**Recommendation:** Add `enablePaste` option to `UpupUploader` and a standalone `<PasteZone>` headless component in `@upup/react`.

```typescript
// @upup/react — UpupUploader prop addition
type UpupUploaderProps = {
  // ... existing props ...
  enablePaste?: boolean  // enables paste on the drop zone itself
}

// @upup/react — standalone headless component
type PasteZoneProps = {
  uploader: UpupUploaderInstance
  onPaste?: (files: File[]) => void
  children: React.ReactNode
}

function PasteZone(props: PasteZoneProps): React.ReactElement
```

**Implementation notes:**
- Listen for `paste` events on the container element.
- Extract files from `ClipboardEvent.clipboardData.items`.
- For pasted images (screenshots), generate a filename like `pasted-image-{timestamp}.png`.
- Files go through the same `onBeforeFileAdded` validation pipeline.
- The `enablePaste` prop on `UpupUploader` should attach the listener to the drop zone area.
- The standalone `<PasteZone>` allows consumers to define their own paste target (e.g., a text editor area).

---

### 5. SSR Hydration Handling

**Source:** react-uploady (`noPortal` prop)  
**Why:** React SSR hydration mismatches are a common issue with upload components that use browser-only APIs (File, Blob, DOM portals). react-uploady provides `noPortal` to skip React portal usage during SSR. Next.js App Router (upup's primary target) makes this critical.

**Recommendation:** Add SSR detection and graceful degradation to `@upup/react` components.

```typescript
// @upup/react — internal utility
function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])
  return isClient
}

// @upup/react — UpupUploader behavior
// - During SSR: render a static placeholder (just the drop zone container)
// - After hydration: mount file input, attach drag/paste listeners, initialize UpupCore
// - No portal usage by default; if portals are needed, gate behind useIsClient()
```

**Implementation notes:**
- All browser-only APIs (`File`, `Blob`, `URL.createObjectURL`, `navigator.clipboard`) must be gated behind client-side checks.
- `UpupCore` instantiation should be deferred to `useEffect` (never during SSR render).
- Consider a `ssr?: boolean` option for explicit control, but prefer automatic detection (`typeof window !== 'undefined'`).
- Test with Next.js App Router's `next build` + `next start` to verify no hydration warnings.

---

### 6. Accessibility Testing Standard

**Source:** react-filepond (VoiceOver/JAWS/keyboard tested)  
**Why:** FilePond explicitly tests with screen readers and documents keyboard navigation. Accessibility is a differentiator and a compliance requirement for many enterprise users.

**Recommendation:** Add accessibility testing to the test infrastructure.

**Checklist:**
- [ ] All interactive elements have proper ARIA roles and labels (`role="button"`, `aria-label`, `aria-describedby`)
- [ ] File list uses `role="list"` / `role="listitem"` with status announcements via `aria-live="polite"`
- [ ] Drop zone announces drag state: `aria-dropeffect="copy"` or equivalent
- [ ] Upload progress communicated via `aria-valuenow` / `aria-valuemin` / `aria-valuemax` on progress indicators
- [ ] Full keyboard navigation: Tab to drop zone → Enter/Space to open file picker → Tab through file list → Delete to remove → Tab to upload button
- [ ] Focus management: focus returns to sensible element after file removal, upload completion
- [ ] Add `axe-core` integration tests (automated) in Vitest/Playwright
- [ ] Manual screen reader testing with at least one of: VoiceOver (macOS), NVDA (Windows)
- [ ] Color contrast compliance (WCAG AA minimum) on all default theme elements
- [ ] Error messages associated with their file via `aria-describedby`

---

## MEDIUM PRIORITY

### 7. Options Cascade (Per-File Overrides)

**Source:** react-uploady  
**Why:** react-uploady supports three levels of option resolution: global → component → processing-time. This lets consumers override options per-batch or per-file without reconfiguring the uploader.

**Recommendation:** Support per-file option overrides in `addFiles()`.

```typescript
// @upup/core — addFiles overload
class UpupCore {
  addFiles(files: File[]): Promise<void>
  addFiles(files: File[], overrides: Partial<UploadOptions>): Promise<void>
}

// @upup/shared — UploadOptions (subset of CoreOptions relevant per-file)
type UploadOptions = {
  checksumVerification?: boolean
  imageCompression?: boolean | ImageCompressionOptions
  heicConversion?: boolean
  stripExifData?: boolean
  maxRetries?: number
  metadata?: Record<string, string>
}
```

**Resolution order:** `CoreOptions` (global) → `addFiles()` overrides (per-batch) → individual file metadata.

---

### 8. Fast Abort Threshold

**Source:** react-uploady (default: 100)  
**Why:** When cancelling hundreds of queued files, calling `abort()` on each XHR individually is expensive. react-uploady's `fastAbortThreshold` skips individual abort calls when batch size exceeds the threshold — it just clears the queue and lets in-flight requests finish or timeout.

**Recommendation:** Add `fastAbortThreshold` to `CoreOptions`.

```typescript
// @upup/shared — CoreOptions addition
type CoreOptions = {
  // ... existing options ...
  fastAbortThreshold?: number  // default: 100
}
```

**Implementation notes:**
- When `cancel()` is called and `files.size > fastAbortThreshold`:
  - Clear the upload queue immediately.
  - Do NOT call `abort()` on individual file uploads.
  - Set all queued file statuses to `cancelled`.
  - In-flight uploads may complete or timeout naturally.
- When `files.size <= fastAbortThreshold`: abort each file individually (current behavior).

---

### 9. Bundle Size Target / CI Check

**Source:** react-uploady (core: 10.61KB gzip)  
**Why:** An explicit bundle size budget prevents accidental bloat as features are added. react-uploady maintains a very lean core. upup should set a target and enforce it in CI.

**Recommendation:** Add `size-limit` to the monorepo with per-package budgets.

```json
// package.json (root) — size-limit config
{
  "size-limit": [
    { "path": "packages/core/dist/index.mjs", "limit": "15 KB" },
    { "path": "packages/shared/dist/index.mjs", "limit": "5 KB" },
    { "path": "packages/react/dist/index.mjs", "limit": "20 KB" },
    { "path": "packages/server/dist/index.mjs", "limit": "10 KB" }
  ]
}
```

**Implementation notes:**
- Install `size-limit` and `@size-limit/preset-small-lib`.
- Add `"size"` script to root `package.json`: `"size": "size-limit"`.
- Add `"size:check"` to CI pipeline (GitHub Actions).
- Budgets are initial targets — adjust after baseline measurement.
- Core's 15KB budget is generous compared to react-uploady's 10.61KB but accounts for upup's richer feature set (pipeline, workers, strategies).

---

### 10. Declarative Source Shorthand

**Source:** uploadcare (`source-list="local, url, camera, dropbox"`)  
**Why:** uploadcare's declarative source configuration is clean and intuitive. Instead of configuring each adapter separately, consumers pass a string or array of source names. upup currently requires explicit `driveConfigs` objects.

**Recommendation:** Add a `sources` shorthand prop to `UpupUploader` as sugar over individual adapter config.

```typescript
// @upup/shared — source type
type UploadSource =
  | 'local'        // file picker + drag & drop
  | 'camera'       // device camera capture
  | 'url'          // URL input
  | 'google_drive'
  | 'onedrive'
  | 'dropbox'

// @upup/react — UpupUploader prop
type UpupUploaderProps = {
  // ... existing props ...
  sources?: UploadSource[]  // default: ['local']
}
```

**Usage:**
```tsx
// Simple — just declare what sources you want
<UpupUploader
  sources={['local', 'camera', 'url', 'google_drive']}
/>

// Equivalent to current verbose config:
<UpupUploader
  driveConfigs={{
    googleDrive: { clientId: '...' },
  }}
  enableCamera={true}
  enableUrlInput={true}
/>
```

**Implementation notes:**
- `sources` is sugar, not a replacement. Explicit `driveConfigs` still works and takes precedence.
- When `sources` includes a cloud drive, the component should check that the required credentials are available (via `driveConfigs` or server mode) and show a helpful error if not.
- Source order in the array determines tab/button order in the UI.
- Default is `['local']` — file picker + drag & drop only.

---

## Reference: Already Covered by Current Spec

These features were identified in the competitive analysis but are already part of the upup v2 architecture spec:

| Feature | Covered By |
|---------|-----------|
| File reordering | `UpupCore.reorderFiles()` |
| userData / file metadata | `CoreOptions.metadata` + `UploadFile.meta` |
| Replaceable transport | `UploadStrategy` interface |
| Framework adapters | `RuntimeAdapter` in `@upup/server` |
| Middleware pipeline | `PipelineStep[]` in `CoreOptions` |
| Route handler pattern | `createUpupHandler()` in `@upup/server` |
| Managed service mode | `apiKey` in `CoreOptions` |
| Max concurrent uploads | `maxConcurrentUploads` in `CoreOptions` |
| Grouped / batch uploads | `onBeforeBatch` / `onAfterBatch` events |
| Error classification | `UpupError` hierarchy (Auth, Network, Quota, Validation) |
