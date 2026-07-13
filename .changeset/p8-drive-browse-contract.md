---
'@useupup/core': minor
'@useupup/react': minor
'@useupup/vue': minor
'@useupup/svelte': minor
'@useupup/angular': minor
'@useupup/vanilla': minor
---

## Drive-browse error surface + pagination; retire dead download events

The client-mode cloud-drive browse contract (`DriveBrowserController` +
`DriveEventMap`, `packages/core/src/drives/`) previously discarded every
failure at one choke point — a failed auth, load, download, or search left
users with nothing but a spinner that never stopped, and a degraded Google
Identity Services sign-in button was a silent dead end. It also never
paginated past a provider's first page: OneDrive returned Graph's ~200-item
default, Box and Google Drive capped at 1000 items, and Dropbox's
already-built cursor pagination was unreachable because the event map had no
cursor field. Separately, OneDrive's session-restore could throw inside a
fire-and-forget path and strand the UI, and `onSessionExpired` leaked stale
selection state that `onSignedOut` already cleared correctly.

`DriveBrowserState` now carries an `error` field, `hasMore`, and
`isLoadingMore`; `files-loaded` gains optional `hasMore`/`cursor`; a new
optional `DrivePlugin.loadMoreFiles(cursor)` lets the controller append
additional pages on demand via a new `loadMore()` method. All four provider
plugins (Box, Dropbox, Google Drive, OneDrive) now implement native
pagination through this one opaque-cursor contract — each encodes its own
continuation token (offset, page token, `@odata.nextLink`, or Dropbox's
existing cursor) with no provider-specific branching in the shared
controller. OneDrive's `getUserInfo` now resolves `null` instead of throwing
on failure (matching Box/Dropbox), and `onSignedOut`/`onSessionExpired` now
share one `resetSession()` teardown.

React (canon), Vue, Svelte, Angular, and Vanilla all render the same new
DOM: a shared error banner (`data-testid="upup-drive-error"`,
`data-upup-slot="drive-error"`, `role="alert"`) in `DriveBrowser` and
`DriveAuthFallback`, and a "Load more" button
(`data-testid="upup-drive-load-more"`, `data-upup-slot="drive-load-more"`)
inside the existing scroll body when more items are available — the
uploader panel stays fixed-height. `ServerModeDriveUploader`'s existing
server-mode error surface now renders through the server-side error code map
when a code is present, falling back to the raw message otherwise. Two new
i18n keys (`driveBrowser.loadError`, `driveBrowser.loadMore`) land in all 9
locales. `@useupup/preact` needs no source change — it inherits through its
`@useupup/react` re-export.

Two dead surfaces are retired from `DriveEventMap` and every framework's
drive hooks/composables/services: the `file-downloaded` event (emitted by
all four plugins, subscribed to by nothing) and `download-progress` (never
emitted; its `downloadProgress` state was permanently `0` and was still
threaded through every framework's public hook/composable/service return
value). Anyone destructuring `downloadProgress` from a drive hook will see a
type error; the field carried no real information.
