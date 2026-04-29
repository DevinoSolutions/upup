# v2-clean vs dev — What We Built

> Generated: 2026-04-07  
> Branch ahead by **197 commits** (dev is 1 commit ahead: a release-tag rename)

---

## Summary Stats

| Category | Count |
|---|---|
| Total commits ahead of `dev` | 197 |
| `feat` commits | 109 |
| `test` commits | 77 |
| `fix` commits | 3 |
| Files changed | 359 |
| Lines added | ~55,133 |

---

## 1. Foundation — V2 Restart

`feat: v2-clean restart — copy v1 React UI with working shared/core/server`

The branch started by copying the stable v1 React UI on top of the already-solid `@upup/core`, `@upup/shared`, and `@upup/server` packages. The goal: build v2 incrementally without breaking the existing UI.

---

## 2. New V2 Props — `@upup/react`

~32 new props added over the branch, organized by category:

### Server / Upload Target
| Prop | Description |
|---|---|
| `serverUrl` | Points to a self-hosted `@upup/server` instance |
| `apiKey` | Managed mode — auto-sets `serverUrl` to `api.upup.dev` |
| `uploadEndpoint` | DX alias for `serverUrl` |

### Restrictions
| Prop | Description |
|---|---|
| `restrictions` | Unified API for file constraints (replaces scattered props) |
| `minFileSize` | Minimum file size in bytes |
| `maxTotalFileSize` | Cap on total selected file size |
| `allowFolderUpload` | Alias for `showSelectFolderButton` |
| `maxFiles` | DX alias |

### Theme / Appearance
| Prop | Description |
|---|---|
| `theme` | `theme={{ mode: 'dark' }}` — replaces `dark={true}` |
| `className` | Applied to root container |
| `style` | Inline styles on root container |
| `showBranding` | Show/hide the upup branding footer |

### i18n
| Prop | Description |
|---|---|
| `i18n` | `i18n={{ locale, overrides }}` — replaces `localePack` + `translations` |

### Cloud / Sources
| Prop | Description |
|---|---|
| `cloudDrives` | Cleaner config keys for Google Drive, OneDrive, Dropbox |
| `sources` | DX alias for the sources array |

### Upload Behavior
| Prop | Description |
|---|---|
| `autoUpload` | Start upload immediately on file select |
| `maxConcurrentUploads` | Parallel upload limit |
| `enablePaste` | Accept clipboard paste uploads |
| `disableDragDrop` | Disable drag-and-drop zone |
| `onBeforeFileAdded` | Async filter — return false to reject a file |

### Processing
| Prop | Description |
|---|---|
| `imageCompression` | Compression config |
| `thumbnailGenerator` | Thumbnail generation config |
| `checksumVerification` | Enable checksum step |
| `heicConversion` | Convert HEIC to JPEG |
| `stripExifData` | Remove EXIF metadata |
| `contentDeduplication` | Hash-based deduplication |

### Lifecycle Callbacks
| Prop | Description |
|---|---|
| `onUploadStart` | Fires when upload begins |
| `onUploadComplete` | Fires on completion |
| `onStatusChange` | Fires on status transition |
| `onFileRemoved` | Fires when a file is removed |
| `onRestrictionFailed` | Fires when a file is rejected |
| `crashRecovery` | Enable crash recovery / session restore |

---

## 3. New V2 Features

### New Upload Sources
- **Audio** — record audio directly in-browser
- **Screen Capture** — capture screen/tab/window

### UI Improvements
- **Grid/list view toggle** in FileList header (`#20`)
- **Offline detection** — shows offline state, emits events (`#19`)

### Next.js / SSR
- `'use client'` directive added to all components and hooks — safe for Next.js App Router

---

## 4. New V2 Exports — `@upup/react`

### Component Name Aliases (v2 DX)
- `SourceSelector` → `AdapterSelector`
- `SourceView` → `AdapterView`
- `DropZone` → `MainBox`

### Sub-component Exports (composability)
`AdapterSelector`, `FileList`, `MainBox`, `FilePreview`, `ProgressBar`, `AdapterView`, `DriveBrowser`

### Headless
- `createPropGetters` — exported for headless consumers
- `useUpupUpload` — full headless hook

### Core Re-exports
- `UpupCore`, `CoreOptions` re-exported from `@upup/core` via `@upup/react`

### Type Aliases
- `UploadFile`, `StorageProvider`, `UploadStatus`
- `DropboxConfigs`, `UploadSource`, `UpupUploaderProps`

---

## 5. UpupCore Integration (Bridge Layer)

The biggest architectural work: wiring `UpupCore` (the new engine) alongside the v1 engine without replacing it.

### Wiring
- `UpupCore` instantiated inside `useRootProvider`, exposed as `context.core`
- `updateOptions()` + reactive options sync (serverUrl, apiKey, provider, autoUpload)
- v1 file state → `UpupCore FileManager`
- v1 upload status → `UpupCore`
- v1 callbacks → `UpupCore EventEmitter`
- `UpupCore.destroy()` called on unmount (memory leak fix)

### ~100 Events Bridged

**Lifecycle:** `ready`, `done`, `destroyed`, `options-updated`, `snapshot-restored`, `crash-recovery-restored`

**File Management:** `files-count-change`, `files-replaced`, `files-reordered`, `files-cleared`, `files-set`, `files-synced`, `file-replaced`, `file-preview`, `state-reset`

**Upload:** `upload-pause`, `upload-resume`, `upload-cancel`, `total-progress-change`, `upload-metrics`, `upload-error-change`, `progress-map-change`, `auto-upload`, `prepare-files`, `url-submit`

**UI State:** `adapter-change`, `adapter-click`, `adapter-view-cancel`, `theme-change`, `locale-change`, `limit-change`, `adding-more`, `editing-file-change`, `editor-queue-change`, `warn`, `source-change`

**Interaction:** `drag-over`, `drag-leave`, `drop`, `paste`, `browse-files`, `folder-select`, `camera-capture`, `camera-confirm`

**Cloud Drives:** `cloud-ready`, `auth-*`, `cloud-drive-*`, `download-error`, `folder-submit`, `onedrive-msal-ready`

**Errors (all 3 providers):**
- Google Drive: uploader errors, auth errors, data-layer errors
- OneDrive: MSAL config/creation, auth init/silent/signin, data-layer, submit, folder-submit
- Dropbox: config, popup-blocked, no-token, session-expired, user-info, api-error, init-error, auth lifecycle

**Sync:** `status-synced`, `restriction-failed` (including duplicates)

---

## 6. `@upup/shared` — New Theme System

Brand-new theme engine under `packages/shared/src/theme/`:

| File | Purpose |
|---|---|
| `types.ts` | Theme type definitions |
| `vars.ts` | CSS custom property mappings |
| `slots.ts` | Component slot definitions |
| `presets.ts` | Built-in theme presets (light, dark, etc.) |
| `resolve-theme.ts` | Theme resolution logic |
| `index.ts` | Public exports |

Full test coverage for all 5 modules.

---

## 7. `@upup/shared` — New Types

Under `packages/shared/src/types/`:
`file-source.ts`, `image-editor.ts`, `storage-provider.ts`, `upload-file.ts`, `upload-protocols.ts`, `upload-result.ts`, `upload-status.ts`, `class-names.ts`

---

## 8. `@upup/shared` — i18n Fixes

Added missing keys to **all 8 non-English locale packs**:
- `audio`
- `screenCapture`
- `fileTooSmallName`

---

## 9. E2E Test App

Full Playwright test suite under `apps/e2e-test/`:

- 13+ tests covering render, theme switching, adapter views
- 3-tab demo: dark mode / light mode / headless hook
- All 8 source icons verified (including Dropbox)
- `data-testid` attributes added to every significant component:
  - All 5 adapter views (URL, Camera, Google Drive, OneDrive, Dropbox)
  - `FileList`, `FilePreview`, `MainBoxHeader`
  - `ProgressBar`, `AdapterView`, `DriveBrowser`
  - Branding footer

---

## 10. Apps Migrated

### `apps/playground`
- Migrated from old `upup-react-file-uploader` to `@upup/react`
- Uses v2 API routes with `createUpupHandler` from `@upup/server`

### `apps/landing`
- Migrated imports, install commands, locale imports to `@upup/react`
- v2 API routes wired up

---

## 11. Test Suite — 1500+ Unit Tests

| Package | What's tested |
|---|---|
| `@upup/core` | Constructor, lifecycle events, file management, status transitions, pipeline, strategies (multipart, direct), plugins, EventEmitter, CrashRecoveryManager, BrowserRuntime, WorkerPool, hashStep, composeEnhancers, deduplicateStep, destroy, snapshot, updateOptions, event catalog (90+ events) |
| `@upup/react` | `useUpupUpload` (headless hook, all states), `useUpload`, `useIsClient`, prop getters (getRootProps, getInputProps), file helpers (fileAppendParams, revokeFileUrl, searchDriveFiles, fileGetIsImage/IsText/Extension/Is3D), i18n utilities, image editor helpers, multipartSessionStore, createSecureStorage, googleDriveUtils, cn utility, b64EncodeUnicode, file type/size checking, exports completeness |
| `@upup/shared` | Error classes (UpupError + 5 subclasses), locale consistency across all 8 bundles, en-US content validity, theme system (presets, resolve-theme, slots, types, vars), upload-file metadata, upload-result, createTranslator, resolve-locale |
| `@upup/server` | Handler, allowedTypes, hooks, multipart |
| E2E | Playwright render + interaction tests |

---

## 12. What `dev` Has That `v2-clean` Doesn't

Only **1 commit**:
```
8040a39 Use v-prefixed release tag and name
```
A cosmetic release-tooling change — no functionality difference.

---

## Status

`v2-clean` is a complete v2 architecture on top of the working v1 UI, with:
- Full `UpupCore` event bridge
- All v2 props and exports
- 1500+ tests passing
- E2E suite
- Both apps migrated

The v1 engine still runs the actual uploads — the v2 core is layered alongside it.
