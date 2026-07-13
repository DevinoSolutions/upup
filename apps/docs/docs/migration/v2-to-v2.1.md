---
sidebar_position: 2
---

# Migrating from v2.0 to v2.1

v2.1 removes four legacy props that had v2 equivalents already wired.
The old names have been gone from the `UpupUploaderProps` type — if
you're on TypeScript, your editor will flag every call site. This page
is the one-to-one mapping for a find-and-replace pass.

Rough time budget: **5–15 minutes** for most consumers.

## `dark` → `theme.mode`

```diff
  <UpupUploader
-   dark={isDark}
+   theme={{ mode: isDark ? 'dark' : 'light' }}
  />
```

`theme.mode` also accepts `'system'`, which resolves from
`prefers-color-scheme` plus `html.dark` / `[data-theme]` ancestors.

## `limit` → `maxFiles`

Same semantics, new name.

```diff
  <UpupUploader
-   limit={10}
+   maxFiles={10}
  />
```

## `shouldCompress` → `imageCompression`

Same semantics, new name.

```diff
  <UpupUploader
-   shouldCompress
+   imageCompression
  />
```

## `classNames` → `theme.slots`

This one has a shape change. The old `classNames` was a flat map with
keys like `fileListContainer`, `adapterButton`, `progressBarInner`.
The new `theme.slots` is nested by component: `fileList.root`,
`sourceSelector.sourceButton`, `progressBar.fill`.

```diff
  <UpupUploader
-   classNames={{
-     fileListContainer: 'my-file-list',
-     uploadButton: 'my-upload-btn',
-     adapterButton: 'my-adapter-btn',
-     progressBarInner: 'my-progress-fill',
-   }}
+   theme={{
+     slots: {
+       fileList: {
+         root: 'my-file-list',
+         uploadButton: 'my-upload-btn',
+       },
+       sourceSelector: {
+         sourceButton: 'my-adapter-btn',
+       },
+       progressBar: {
+         fill: 'my-progress-fill',
+       },
+     },
+   }}
  />
```

Partial overrides are fine — every key is optional. See the
[full slot map](#full-slot-map-reference) at the bottom of this page.

### Flat → nested mapping

| Old flat key (`classNames.*`)    | New nested path (`theme.slots.*`)                                  |
| -------------------------------- | ------------------------------------------------------------------ |
| `containerFull`                  | `uploader.container`                                               |
| `fileListContainer`              | `fileList.root`                                                    |
| `containerHeader`                | `fileList.header`                                                  |
| `containerCancelButton`          | `fileList.cancelButton`                                            |
| `containerAddMoreButton`         | `fileList.addMoreButton`                                           |
| `uploadButton`                   | `fileList.uploadButton`                                            |
| `uploadDoneButton`               | `fileList.doneButton`                                              |
| `fileListContainerInnerSingle`   | `fileList.body`                                                    |
| `fileListContainerInnerMultiple` | `fileList.body`                                                    |
| `fileListFooter`                 | `fileList.footer`                                                  |
| `fileItemSingle`                 | `filePreview.root`                                                 |
| `fileItemMultiple`               | `filePreview.root`                                                 |
| `fileThumbnailSingle`            | `filePreview.thumbnail`                                            |
| `fileThumbnailMultiple`          | `filePreview.thumbnail`                                            |
| `fileIcon`                       | `filePreview.icon`                                                 |
| `fileInfo`                       | `filePreview.info`                                                 |
| `fileName`                       | `filePreview.name`                                                 |
| `fileSize`                       | `filePreview.size`                                                 |
| `filePreviewButton`              | `filePreview.previewButton`                                        |
| `fileDeleteButton`               | `filePreview.deleteButton`                                         |
| `filePreviewPortal`              | `filePreviewPortal.root`                                           |
| `adapterButton`                  | `sourceSelector.sourceButton`                                      |
| `adapterButtonIcon`              | `sourceSelector.sourceButtonIcon`                                  |
| `adapterButtonText`              | `sourceSelector.sourceButtonText`                                  |
| `adapterButtonList`              | `sourceSelector.sourceList`                                        |
| `adapterView`                    | `sourceView.root`                                                  |
| `adapterViewHeader`              | `sourceView.header`                                                |
| `adapterViewCancelButton`        | `sourceView.cancelButton`                                          |
| `progressBarContainer`           | `progressBar.root`                                                 |
| `progressBar`                    | `progressBar.track`                                                |
| `progressBarInner`               | `progressBar.fill`                                                 |
| `progressBarText`                | `progressBar.text`                                                 |
| `urlInput`                       | `urlUploader.input`                                                |
| `urlFetchButton`                 | `urlUploader.fetchButton`                                          |
| `cameraPreviewContainer`         | `cameraUploader.previewContainer`                                  |
| `cameraDeleteButton`             | `cameraUploader.deleteButton`                                      |
| `cameraCaptureButton`            | `cameraUploader.captureButton`                                     |
| `cameraRotateButton`             | `cameraUploader.rotateButton`                                      |
| `cameraAddButton`                | `cameraUploader.addButton`                                         |
| `driveHeader`                    | `driveBrowser.header`                                              |
| `driveSearchContainer`           | `driveBrowser.searchContainer`                                     |
| `driveSearchInput`               | `driveBrowser.searchInput`                                         |
| `driveBody`                      | `driveBrowser.body`                                                |
| `driveFooter`                    | `driveBrowser.footer`                                              |
| `driveItemContainerDefault`      | `driveBrowser.itemDefault`                                         |
| `driveItemContainerSelected`     | `driveBrowser.itemSelected`                                        |
| `driveItemContainerInner`        | `driveBrowser.itemInner`                                           |
| `driveItemInnerText`             | `driveBrowser.itemInnerText`                                       |
| `driveAddFilesButton`            | `driveBrowser.addFilesButton`                                      |
| `driveCancelFilesButton`         | `driveBrowser.cancelFilesButton`                                   |
| `driveLogoutButton`              | `driveBrowser.logoutButton`                                        |
| `driveLoading`                   | `driveBrowser.loading`                                             |
| `containerMini`                  | _(dropped — use `mini` prop's data attribute for variant styling)_ |

## `UpupUploaderPropsClassNames` type

No longer publicly exported. If you were using it to type your own
class maps, switch to `DeepPartialSlots` (re-exported from the same
package):

```diff
- import type { UpupUploaderPropsClassNames } from '@useupup/react'
+ import type { DeepPartialSlots } from '@useupup/react'
```

The public package set is now `@useupup/react`, `@useupup/core`, and
`@useupup/server`. React UI types are re-exported from `@useupup/react`;
headless contracts, i18n bundles, and theme contracts live in
`@useupup/core`; route handlers and framework adapters live in
`@useupup/server`. The former public `@useupup/shared` package is removed.

## Events — no change

All 24 event callbacks (`onFilesSelected`, `onUploadStart`, etc.) are
unchanged. v2.1 adds a new event log panel to the playground so you
can preview their payloads interactively, but the public API is
untouched.

## CoreOptions typing

Consumers using the headless `UpupCore` class from `@useupup/core` who
pass `locale` or `translations` directly will see tighter types:

```diff
  new UpupCore({
-   locale: someUntyped,        // previously `unknown`
+   locale: enUS,                // LocaleBundle | UpupLocaleCode
-   translations: someUntyped,
+   translations: { fileList: { uploadFiles: 'Custom label' } },
  })
```

---

## Full slot map reference

See `@useupup/core/theme` for the canonical `UpupThemeSlots` interface.
The top-level keys are:

- `uploader` — outer wrapper / container
- `dropZone` — the drop target itself
- `sourceSelector` — the row of source buttons
- `sourceView` — the detail panel when a source is opened
- `fileList` — the queue of selected files
- `filePreview` — each file row within the list
- `progressBar` — the aggregate progress bar
- `notifier` — toasts emitted from the uploader
- `urlUploader`, `cameraUploader`, `audioUploader`,
  `screenCaptureUploader` — per-source panels
- `driveBrowser` — Google Drive / OneDrive / Dropbox / Box file pickers
- `driveAuthFallback` — the "sign in with `{provider}`" fallback screen
- `filePreviewPortal` — the full-size preview dialog
- `imageEditor` — the built-in image editor modal

Every slot under each of these is optional.
