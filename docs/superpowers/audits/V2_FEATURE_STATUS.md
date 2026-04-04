# upup v2.0 — Unified Feature Status

**Date:** 2026-04-02
**Branch:** `huge-refactor` (49 commits)
**Sources:** Architecture spec, competitive enhancements spec, i18n proposal, styling proposal

Every feature is one row. No hierarchy. Sorted by status.

---

## DONE

| # | Feature | Package | Evidence |
|---|---------|---------|----------|
| 1 | Package split (shared/core/react/server) | all | 4 packages with correct dependency graph |
| 2 | EventEmitter | core | `core.on()`, `core.off()`, `core.emit()`, 14 event types |
| 3 | Plugin system (.use(), registerExtension, ext) | core | PluginManager, chainable `.use()`, `core.ext` accessor |
| 4 | PipelineEngine (sequential file processing) | core | `PipelineEngine.processAll()`, emits pipeline-start/step/complete |
| 5 | Pipeline steps as subpath exports | core | 7 steps: hash, deduplicate, exif, compress, thumbnail, gzip, heic |
| 6 | FileManager (validation, add/remove/reorder) | core | Accept, size limits, dedup, onBeforeFileAdded |
| 7 | UpupCore state machine | core | Status tracking, file management, pipeline, upload orchestration |
| 8 | DirectUpload strategy | core | XHR PUT to presigned URL with progress/abort |
| 9 | TokenEndpointCredentials strategy | core | Fetches presigned URLs from server endpoint |
| 10 | UploadManager (concurrency, retries, progress) | core | maxConcurrentUploads, maxRetries, per-file progress |
| 11 | WorkerPool (main-thread fallback) | core | Hash + gzip offload, transparent fallback |
| 12 | CrashRecoveryManager + IndexedDB | core | Auto-save on state-change, restoreFromCrashRecovery() |
| 13 | isSuccessfulCall (custom success detection) | core | Async callback in CoreOptions, wired to UploadManager |
| 14 | Async onBeforeFileAdded | core | Returns `Promise<boolean \| File \| undefined>`, awaited in FileManager |
| 15 | Fast abort threshold | core | `fastAbortThreshold` in CoreOptions, wired to UploadManager |
| 16 | UpupUploadBatchError (all-fail error) | core | Thrown when all uploads fail without onFileError handler |
| 17 | Error class hierarchy | shared | UpupError, AuthError, NetworkError, ValidationError, QuotaError, StorageError |
| 18 | UpupErrorCode enum | shared | 16 error codes (AUTH_EXPIRED through QUOTA_EXCEEDED) |
| 19 | Strategy interfaces | shared | CredentialStrategy, OAuthStrategy, UploadStrategy, RuntimeAdapter |
| 20 | Pipeline interfaces | shared | PipelineStep, PipelineContext |
| 21 | 9 locale packs | shared | en_US, ar_SA, de_DE, es_ES, fr_FR, ja_JP, ko_KR, zh_CN, zh_TW |
| 22 | t() interpolation + plural() + mergeTranslations() | shared | {{variable}} replacement, _one/_other plural |
| 23 | useUpupUpload headless hook | react | Returns files, status, progress, 11 methods, core access. SSR-safe. |
| 24 | useIsClient() SSR guard | react | Defers browser APIs to client hydration |
| 25 | PasteZone component + enablePaste prop | react | Clipboard paste upload, auto-generated filenames |
| 26 | UpupUploader full UI component | react | Composes all sub-components, sources prop, context provider |
| 27 | 22 individual components exported | react | DropZone, FileList, CameraUploader, AudioUploader, etc. |
| 28 | UploaderContext | react | Merges hook return + UI state, used by all child components |
| 29 | Cloud drive adapters (GDrive, OneDrive, Dropbox) | react | Client-side OAuth via GIS, MSAL, Dropbox SDK |
| 30 | Declarative source shorthand | react | `sources={['local','camera','google_drive']}` maps to FileSource |
| 31 | CSS scoping (upup- prefix + .upup-scope) | react | PostCSS prefix + postcss-prefix-selector |
| 32 | cn() helper (clsx + tailwind-merge) | react | Utility for conditional class merging |
| 33 | Compiled CSS export | react | `build:css` outputs dist/tailwind-prefixed.css |
| 34 | Accessibility (ARIA + axe-core tests) | react | role="list", aria-live, aria-modal, jest-axe tests |
| 35 | Server request handler (Web Request/Response) | server | Universal handler with framework-agnostic interface |
| 36 | AWS S3 presigned URL + multipart upload | server | presign, multipart/init, sign-part, complete, abort routes |
| 37 | Framework adapters (Next.js, Express, Hono, Fastify) | server | 4 thin adapters wrapping the universal handler |
| 38 | Server lifecycle hooks | server | onBeforeUpload, onFileUploaded, onUploadComplete |
| 39 | TokenStore interface | server | Pluggable token storage (interface only) |
| 40 | size-limit CI budgets | tooling | Per-package size limits in root package.json |
| 41 | Drag-and-drop file reorder | react | Drag event handlers on file-list items, calls reorderFiles() |

---

## PARTIALLY DONE / DIVERGENT

| # | Feature | Package | What exists | What's missing |
|---|---------|---------|-------------|----------------|
| 42 | Translations in React components | react | 4/22 components use `translations` from context | 16 hardcoded English strings in 6 files (source-selector, main-box-header, file-list, drive-auth-fallback, drive-browser-header, use-dropbox) |
| 43 | CoreOptions callback hooks | core | `onBeforeFileAdded`, `onError` as options; 14 events via emitter | Spec's `onFileAdded`, `onFileRemoved`, `onUploadProgress`, `onUploadComplete` not in CoreOptions (accessible via `core.on()`) |
| 44 | UploadFile per-file progress | shared | `UploadFileWithProgress` type with `progress: number` | No per-file `status` field — status tracked at core level only |
| 45 | UploadResult type | shared | `{ key, publicUrl?, etag? }` | Spec wanted `{ file, url, status: 'success'\|'failed'\|'skipped', error? }` |
| 46 | data-theme attribute | react | `data-upup-theme` on image editor components (2 files) | Not on root element, not on other components |
| 47 | Accessibility gaps | react | ARIA roles + axe-core tests on key components | Missing aria-valuenow/min/max on progress, no aria-dropeffect, incomplete keyboard nav |
| 48 | useUpupUpload exposes on()/ext | react | Accessible via returned `core` property (`core.on()`, `core.ext`) | Not exposed directly on hook return type |
| 49 | Options cascade (per-file overrides) | core | `addFiles(files, overrides?)` signature exists | Overrides not wired through pipeline/upload execution |
| 50 | Extension pattern completeness | core | `registerExtension()`, `getExtension()`, `ext` work | Missing `composeEnhancers()` utility |
| 51 | CoreOptions.restrictions shape | core | Flat props: `maxFileSize`, `limit`, `accept` work correctly | Spec designed nested `restrictions: { maxFileSize, maxFiles, allowedTypes }` |
| 52 | CoreOptions.cloudDrives shape | core | Flat `googleDriveConfigs`, `oneDriveConfigs` as `Record<string,unknown>` | Spec designed nested typed `cloudDrives: { googleDrive: { clientId } }` |
| 53 | UploadFile.metadata shape | shared | Flat fields: `fileHash`, `checksumSHA256`, `thumbnail` | Spec designed nested `metadata: { width, height, duration, thumbnailUrl, checksum }` |
| 54 | reorderFiles API shape | core | `reorderFiles(fromIndex, toIndex)` — index swap | Spec designed `reorderFiles(fileIds: string[])` — full reorder |
| 55 | Strategy implementations | core | TokenEndpointCredentials + DirectUpload (2 of 7) | Missing: ServerCredentials, ClientOAuth, ServerOAuth, ServerTransfer, MultipartUpload |

---

## NOT IMPLEMENTED

| # | Feature | Package | What's needed |
|---|---------|---------|---------------|
| 56 | ICU message syntax (intl-messageformat) | shared | Replace `{{var}}` with `{count, plural, one {...} other {...}}` |
| 57 | Namespaced message keys | shared | Nested `UpupMessages` type: `header.filesSelected`, `errors.invalidFileType` |
| 58 | Locale metadata (code, language, dir) | shared | Each locale bundle includes `{ code: 'ar-SA', dir: 'rtl' }` |
| 59 | BCP 47 locale codes in public API | shared | String `'fr-FR'` instead of import `fr_FR` object |
| 60 | Fallback chain (fr-CA → fr → en-US) | shared | `buildLocaleChain()` resolution with fallbackLocale option |
| 61 | i18n config prop (single object) | react | `i18n={{ locale, fallbackLocale, overrides, loadLocale }}` replaces `locale`+`translationOverrides` |
| 62 | Bring-your-own translator mode | react | `i18n={{ locale, t: (key, values) => appT(key, values) }}` |
| 63 | lang/dir on root element | react | `<section lang={locale} dir={dir}>` on uploader root |
| 64 | Async locale loading | shared | `loadLocale: (code) => import(...)` for lazy locale bundles |
| 65 | createTranslator() with formatter cache | shared | Shared translator instance with ICU formatter cache |
| 66 | onMissingKey handler | shared | Dev-mode warning callback for untranslated keys |
| 67 | Pipeline context real t() function | core | Replace stub `(key) => key` with actual translator |
| 68 | CoreOptions locale/translations typing | core | Replace `locale?: unknown` with typed i18n config |
| 69 | theme prop (replaces dark + classNames) | react | `theme={{ mode, tokens, slots }}` single config object |
| 70 | Semantic theme tokens (UpupThemeTokens) | shared | `tokens.color.surface`, `tokens.color.primary`, `tokens.radius.lg` |
| 71 | CSS variables (--upup-color-surface) | shared/react | Define defaults in CSS, override via inline style on root |
| 72 | Light + dark presets | shared | Pre-built token sets for light and dark modes |
| 73 | resolveTheme() pipeline | shared | Merge: defaults → mode preset → provider theme → instance theme |
| 74 | UpupThemeProvider context | react | `<UpupThemeProvider theme={tenantTheme}>` for multi-instance |
| 75 | Component-scoped slot overrides | shared/react | `slots.fileList.uploadButton` replaces flat `classNames.uploadButton` |
| 76 | Slot recipes via tailwind-variants | react | `tv()` recipes replace scattered `cn()` + `dark ?` branches |
| 77 | data-state attribute | react | `data-state="uploading"` on root for CSS targeting |
| 78 | data-upup-slot attribute | react | `data-upup-slot="fileList.uploadButton"` on every slotted element |
| 79 | UploadFile.source field | shared | Track which `FileSource` each file came from |
| 80 | validateFiles() public method | core | Expose validation without adding files |
| 81 | Dynamic pipeline imports | core | `await import('@upup/core/steps/heic')` based on boolean options |
| 82 | Server OAuth routes | server | `GET /auth/:provider`, `GET /auth/:provider/cb` |
| 83 | Server file transfer routes | server | `GET /files/:provider`, `POST /files/:provider/transfer` |
| 84 | CoreOptions.enableWorkers / workerPoolSize | core | User-configurable worker pool settings |
| 85 | Prop-getter pattern (getDropzoneProps) | react | DX convenience for headless consumers (nice-to-have) |
| 86 | Managed mode (apiKey wiring) | core | `apiKey` option exists but does nothing — wire to hosted service |

---

## SCOREBOARD

| Status | Count | % |
|--------|-------|---|
| Done | 41 | 48% |
| Partial / Divergent | 14 | 16% |
| Not Implemented | 31 | 36% |
| **Total** | **86** | |

### By package (not implemented only)
| Package | Missing features |
|---------|----------------|
| @upup/shared | 56, 57, 58, 59, 60, 64, 65, 66, 70, 71, 72, 73, 75, 79 (14) |
| @upup/core | 67, 68, 80, 81, 84, 86 (6) |
| @upup/react | 61, 62, 63, 69, 74, 76, 77, 78, 85 (9) |
| @upup/server | 82, 83 (2) |
