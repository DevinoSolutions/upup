---
title: Migrating from v1 to v2
description: Upgrade from upup v1 (upup-react-file-uploader) to v2 — the package rename to @upupjs/react, the full v1→v2 prop map, the UpupError/UpupErrorCode taxonomy, and client- vs server-mode uploads.
sidebar_position: 1
---

# Migrating from v1 to v2

v1 shipped as a single React package, `upup-react-file-uploader`. v2 is a
ground-up rewrite: a framework-agnostic headless core (`@upupjs/core`) with a
native UI for **React, Vue, Svelte, Angular, Vanilla JS, and Preact**, an
optional server package (`@upupjs/server`) for signed uploads and
server-proxied cloud drives, and a Next.js package (`@upupjs/next`). The React
component keeps the same name — `UpupUploader` — and the same idea, but **most
props were renamed or restructured**. This is a major upgrade, not a drop-in
bump; budget time to sweep your props.

Rough time budget: **1–2 hours** for a typical single-`UpupUploader` app,
longer if you customized styling via `classNames` or built programmatic upload
control on the ref API.

## What changed at a glance

- **Package rename.** `upup-react-file-uploader` → `@upupjs/react`. The
  `/styles` and `/server` subpaths move to `@upupjs/react/styles` and the
  standalone `@upupjs/server` package.
- **Six frameworks.** The React UI is the canon; `@upupjs/vue`,
  `@upupjs/svelte`, `@upupjs/angular`, `@upupjs/vanilla`, and
  `@upupjs/preact` render the same DOM.
- **Headless core.** `@upupjs/core` holds the engine, the error taxonomy, i18n
  bundles, and theme contracts. You can build a fully custom UI on it.
- **Two upload modes.** v1's single `tokenEndpoint` becomes either
  `uploadEndpoint` (**client mode** — your route signs URLs, the browser uploads
  directly) or `mode="server"` + `serverUrl` (**server mode** — the browser
  talks only to `@upupjs/server`, which holds credentials and proxies drives).
- **Prop renames.** `limit` → `maxFiles`, `accept` → `allowedFileTypes`, `dark`
  → `theme.mode`, `classNames` → `theme.slots`, `uploadAdapters` → `sources`,
  `driveConfigs` → `cloudDrives`, `customProps` → `metadata`,
  `enableAutoCorsConfig` → `cors`, `localePack`/`translations` → `i18n`. Full
  table below.
- **Error taxonomy.** The `UploadError` / `UploadErrorType` pair becomes
  `UpupError` + the `UpupErrorCode` enum (with typed subclasses), exported from
  `@upupjs/core`.

## Install

```sh
npm uninstall upup-react-file-uploader
npm i @upupjs/react
```

Add `@upupjs/server` only if you adopt server mode:

```sh
npm i @upupjs/server
```

If you catch upload errors by type (see [Error handling](#error-handling)), also
add the core package so you can import the error classes directly:

```sh
npm i @upupjs/core
```

Then update your imports:

```diff
- import { UpupUploader, UpupProvider } from 'upup-react-file-uploader'
- import 'upup-react-file-uploader/styles'
+ import { UpupUploader } from '@upupjs/react'
+ import '@upupjs/react/styles'
```

:::note
`UpupProvider` and `UploadAdapter` are **gone** as exports. `provider` is now a
plain string (`"aws"`), and upload methods are configured with `sources`
(string ids), not the `UploadAdapter` enum. If you need the storage-provider
type, `@upupjs/react` re-exports `StorageProvider` from `@upupjs/core`.
:::

## Props: v1 → v2

Every v1 `UpupUploader` prop, and where it went in v2. Exact v1 names are on the
left; exact v2 names on the right.

| v1 prop                                        | v2 prop                                                                               | Notes                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider={UpupProvider.AWS}` (required)       | `provider="aws"` (optional)                                                           | Now a lowercase string, not the `UpupProvider` enum. Enum values are unchanged (`aws`, `azure`, `backblaze`, `digitalocean`) and v2 adds many more S3-compatible ids (`r2`, `wasabi`, `minio`, `gcs`, …). No longer required — omit it for local-only file selection. |
| `tokenEndpoint="/api/upload-token"` (required) | `uploadEndpoint="/api/upload-token"` **or** `mode="server"` + `serverUrl="/api/upup"` | Renamed and split into client mode vs server mode. See [Storage & upload path](#storage--upload-path).                                                                                                                                                                |
| `accept="image/png"`                           | `allowedFileTypes="image/png"`                                                        | Renamed. Accepts a string, a `string[]`, or preset names (e.g. `"images"`, `"documents"`).                                                                                                                                                                            |
| `dark={true}`                                  | `theme={{ mode: 'dark' }}`                                                            | `theme.mode` accepts `'light'`, `'dark'`, or `'system'`.                                                                                                                                                                                                              |
| `classNames={{ … }}` (flat map)                | `theme={{ slots: { … } }}` (nested)                                                   | The flat keys (`adapterButton`, `progressBarInner`, …) become nested slot paths. The [v2.0→v2.1 guide](./v2-to-v2.1.md) has the full flat→nested key table — it applies verbatim to v1's `classNames`.                                                                |
| `limit={5}`                                    | `maxFiles={5}`                                                                        | Renamed. **Default changed from `1` to `10`** — see [Gotchas](#gotchas).                                                                                                                                                                                              |
| `mini={true}`                                  | `mini={true}`                                                                         | Unchanged.                                                                                                                                                                                                                                                            |
| `maxFileSize={{ size: 20, unit: 'MB' }}`       | `maxFileSize={{ size: 20, unit: 'MB' }}`                                              | Unchanged shape. v2 adds `minFileSize` and `maxTotalFileSize` (same object shape).                                                                                                                                                                                    |
| `maxRetries={3}`                               | `maxRetries={3}`                                                                      | Unchanged.                                                                                                                                                                                                                                                            |
| `resumable={{ mode: 'multipart' }}`            | `resumable={{ protocol: 'multipart' }}`                                               | The key `mode` was renamed to `protocol`. v2 also supports `{ protocol: 'tus', endpoint }`.                                                                                                                                                                           |
| `uploadAdapters={[UploadAdapter.INTERNAL, …]}` | `sources={['local', …]}`                                                              | Enum array → string-id array. Mapping below.                                                                                                                                                                                                                          |
| `driveConfigs={{ … }}`                         | `cloudDrives={{ … }}`                                                                 | Renamed, keys are camelCased. See [Sources & cloud drives](#sources--cloud-drives).                                                                                                                                                                                   |
| `imageEditor={true}`                           | `imageEditor={true}`                                                                  | Unchanged (`boolean \| ImageEditorOptions`). React/Preact only.                                                                                                                                                                                                       |
| `localePack={fr_FR}`                           | `i18n={{ locale: frFR }}`                                                             | Locale bundles now live under `i18n`. v1 exported snake_case bundles; v2's are camelCase, imported from `@upupjs/core` (`enUS`, `frFR`, `arSA`, `deDE`, `esES`, `jaJP`, `koKR`, `zhCN`, `zhTW`).                                                                      |
| `translations={{ browseFiles: '…' }}`          | `i18n={{ overrides: { … } }}`                                                         | Per-key overrides move under `i18n.overrides`, and are **namespaced** (e.g. `{ fileList: { uploadFiles: '…' } }`) rather than flat.                                                                                                                                   |
| `customProps={{ … }}`                          | `metadata={{ … }}`                                                                    | Renamed. Still forwarded to your upload route.                                                                                                                                                                                                                        |
| `enableAutoCorsConfig={true}`                  | `cors={{ dangerouslyAutoConfigure: true, allowedOrigins: [...] }}`                    | Replaced by the `cors` object. Auto-configuration is now explicitly opt-in and named `dangerouslyAutoConfigure`.                                                                                                                                                      |
| `shouldCompress={true}`                        | `imageCompression={true}`                                                             | Renamed (boolean → boolean). Same semantics.                                                                                                                                                                                                                          |
| `showSelectFolderButton={true}`                | `folderUpload={{ showSelectFolderButton: true }}`                                     | Moved under the `folderUpload` object.                                                                                                                                                                                                                                |
| `allowPreview={true}`                          | `allowPreview={true}`                                                                 | Unchanged.                                                                                                                                                                                                                                                            |
| `isProcessing={busy}`                          | `isProcessing={busy}`                                                                 | Unchanged.                                                                                                                                                                                                                                                            |
| `icons={{ … }}`                                | `icons={{ … }}`                                                                       | Unchanged (the per-framework component types differ).                                                                                                                                                                                                                 |

v2 also adds many new props with no v1 equivalent — among them `autoUpload`,
`thumbnailGenerator`, `heicConversion`, `stripExifData`, `checksumVerification`,
`contentDeduplication`, `crashRecovery`, `webWorker`, `maxConcurrentUploads`,
`enablePaste`, and `processingEndpoint`. See the
[React quickstart](../quickstarts/react.md) for the modern surface.

## Sources & cloud drives

`uploadAdapters` (an `UploadAdapter` enum array) becomes `sources` (a string-id
array). The order still controls tab order.

```diff
- import { UpupUploader, UploadAdapter } from 'upup-react-file-uploader'
- <UpupUploader
-   uploadAdapters={[UploadAdapter.INTERNAL, UploadAdapter.GOOGLE_DRIVE]}
- />
+ import { UpupUploader } from '@upupjs/react'
+ <UpupUploader sources={['local', 'googleDrive']} />
```

Adapter → source id mapping:

| v1 `UploadAdapter` | v2 `sources` id                     |
| ------------------ | ----------------------------------- |
| `INTERNAL`         | `'local'`                           |
| `GOOGLE_DRIVE`     | `'googleDrive'`                     |
| `ONE_DRIVE`        | `'oneDrive'`                        |
| `DROPBOX`          | `'dropbox'`                         |
| `LINK`             | `'url'`                             |
| `CAMERA`           | `'camera'`                          |
| _(new)_            | `'box'`, `'screen'`, `'microphone'` |

`driveConfigs` becomes `cloudDrives`, and the snake_case keys become camelCase:

```diff
- driveConfigs={{
-   googleDrive: {
-     google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
-     google_api_key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
-     google_app_id: process.env.NEXT_PUBLIC_GOOGLE_APP_ID!,
-   },
-   oneDrive: {
-     onedrive_client_id: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID!,
-   },
- }}
+ cloudDrives={{
+   googleDrive: {
+     clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
+     apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
+     appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID!,
+   },
+   oneDrive: {
+     clientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID!,
+   },
+ }}
```

`oneDrive`, `dropbox`, and `box` each take `{ clientId, redirectUri? }`;
`googleDrive` takes `{ clientId, apiKey, appId }`.

## Theming & i18n

Two v1 props (`dark`, `classNames`) collapse into one `theme` object, and two
i18n props (`localePack`, `translations`) collapse into one `i18n` object.

```diff
  <UpupUploader
-   dark={isDark}
-   classNames={{ progressBarInner: 'my-fill', adapterButton: 'my-btn' }}
-   localePack={fr_FR}
-   translations={{ browseFiles: 'Send' }}
+   theme={{
+     mode: isDark ? 'dark' : 'light',
+     slots: {
+       progressBar: { fill: 'my-fill' },
+       sourceSelector: { sourceButton: 'my-btn' },
+     },
+   }}
+   i18n={{
+     locale: frFR,
+     overrides: { fileList: { uploadFiles: 'Send' } },
+   }}
  />
```

The flat `classNames` keys map one-to-one to nested slot paths; the
[v2.0→v2.1 migration guide](./v2-to-v2.1.md) lists every key. For app-wide
theming you can also wrap your tree in `UpupThemeProvider` (exported from
`@upupjs/react`).

## Events

Most handlers keep their names and shapes. Two are worth a closer look:

| v1 event                | v2 event                | Change                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onFileRemove`          | `onFileRemoved`         | Renamed to past tense — the old spelling is gone, not aliased.                                                                                                                                                                                  |
| `onFilesUploadComplete` | `onFilesUploadComplete` | Name and shape unchanged. Its argument is a list of files in both versions; v1 typed it `FileWithParams[]` (and v1's own docs mislabeled the items as storage "keys"), v2 types it `UploadFile[]` — the same type swap every file handler gets. |

Unchanged names: `onFilesSelected`, `onFileClick`, `onFileTypeMismatch`,
`onFileUploadComplete`, `onFileUploadStart`, `onFileUploadProgress`,
`onFilesDragOver`, `onFilesDragLeave`, `onFilesDrop`, `onFilesUploadProgress`,
`onIntegrationClick`, `onPrepareFiles`, `onDoneClicked`, `onWarn`, and
`onError`.

New in v2: `onUploadStart`, `onUploadComplete`, `onStatusChange`,
`onRestrictionFailed`, `onBeforeFileAdded`, and `onFileProcessed`.

:::note
`onFilesSelected`, `onFileClick`, and the per-file complete/start handlers now
receive v2 `UploadFile` objects (which carry `id`, `key`, `status`, and the
underlying `File`) instead of v1's `FileWithParams`. Property access like
`file.name` and `file.type` still works.
:::

## Ref API (programmatic control)

The ref pattern survives with a renamed type. `UpupUploaderRef` becomes
`UploaderRef`, and its `useUpload()` method returns a **superset** of the v1
shape:

```diff
- import { UpupUploader, UpupUploaderRef } from 'upup-react-file-uploader'
- const ref = useRef<UpupUploaderRef | null>(null)
+ import { UpupUploader, type UploaderRef } from '@upupjs/react'
+ const ref = useRef<UploaderRef | null>(null)

  // ref.current.useUpload() still returns { files, loading, progress, upload, error }
  // v2 adds: resetState, uploadFiles, setFiles, replaceFiles
```

v2 also introduces a first-class headless hook, `useUpupUpload`, which is the
recommended way to drive uploads from your own UI. It returns reactive `files`,
`status`, `progress`, and `error`, plus `addFiles`, `upload`, `pause`,
`resume`, `cancel`, `retry`, and an `on(event, handler)` subscription — no ref
polling required.

```tsx
import { useUpupUpload } from '@upupjs/react'

const { files, status, progress, error, addFiles, upload } = useUpupUpload({
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
})
```

## Error handling

v1 threw `UploadError` carrying an `UploadErrorType` enum. v2 replaces it with
`UpupError` (base class) and typed subclasses, keyed by the `UpupErrorCode`
enum. Both are exported from `@upupjs/core`.

```diff
- import { UploadError, UploadErrorType } from 'upup-react-file-uploader'
+ import { UpupError, UpupErrorCode } from '@upupjs/core'

  try {
    await doUpload()
  } catch (e) {
-   if (e instanceof UploadError && e.type === UploadErrorType.EXPIRED_URL) {
+   if (e instanceof UpupError && e.code === UpupErrorCode.PRESIGN_FAILED) {
      // handle re-signing
    }
  }
```

Key differences:

- The discriminator moved from `error.type` (an `UploadErrorType` value) to
  `error.code` (an `UpupErrorCode` value, a string). `retryable` and `status`
  are still present.
- v2 ships typed subclasses you can narrow on: `UpupAuthError`,
  `UpupNetworkError`, `UpupValidationError`, `UpupQuotaError`,
  `UpupStorageError`, and `UpupConfigError`.
- `UpupErrorCode` is a broader, more specific set than v1's eight types — e.g.
  `FILE_TOO_LARGE`, `TYPE_MISMATCH`, `LIMIT_EXCEEDED`, `PRESIGN_FAILED`,
  `CORS_ERROR`, `AUTH_EXPIRED`, `AUTH_DENIED`, `AUTH_REQUIRED`, `NETWORK_ERROR`,
  `UPLOAD_FAILED`, `QUOTA_EXCEEDED`, `STORAGE_ERROR`.

The simple `onError={(message) => …}` prop is unchanged (it still receives a
string), and the reactive `error` from `useUpupUpload()` is now a typed
`UpupError` rather than an opaque value. The ref's `useUpload().error` stays the
plain message string it was in v1.

## Storage & upload path

v1 had one path: a `tokenEndpoint` you implemented server-side with
`s3GeneratePresignedUrl` (from `upup-react-file-uploader/server`). The browser
received a presigned URL and uploaded bytes directly to storage. v2 keeps that
model as **client mode** and adds a **server-mode** option that holds your
credentials and proxies drive transfers.

### Client mode (closest to v1)

Rename `tokenEndpoint` to `uploadEndpoint`. Your route still returns a presigned
URL per file.

```diff
- <UpupUploader provider={UpupProvider.AWS} tokenEndpoint="/api/upload-token" />
+ <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
```

You can keep hand-rolling that route, or adopt `@upupjs/server`'s handler
(below), which implements presign, multipart, and drive OAuth for you. The v1
server helpers (`s3GeneratePresignedUrl`, the `s3*MultipartUpload` family,
`azureGenerateSasUrl`) are superseded by the handler's `/presign` and
`/multipart/*` routes.

### Server mode (new)

Point the uploader at a `@upupjs/server` route and let it hold the credentials:

```tsx
<UpupUploader provider="aws" mode="server" serverUrl="/api/upup" />
```

```ts
import { createUpupHandler, InMemoryTokenStore } from '@upupjs/server'

const handler = createUpupHandler({
    storage: {
        type: 'aws',
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION!,
    },
    // Required, server-only: a stable, high-entropy secret (min 16 chars),
    // shared across every server instance. createUpupHandler throws without it.
    uploadTokenSecret: process.env.UPUP_UPLOAD_TOKEN_SECRET!,
    // OAuth client SECRETS live here, never in the browser:
    providers: {
        googleDrive: { clientId: '…', clientSecret: '…' },
    },
    tokenStore: new InMemoryTokenStore(),
    getUserId: async req => resolveUser(req),
})

export const GET = handler
export const POST = handler
```

Server mode is **secure-by-default**: `/presign` and `/multipart/init` return
`403 AUTH_REQUIRED` unless you configure `auth`, `getUserId`, or the explicit
`allowAnonymousUploads: true`. Every upload is bound to an HMAC-signed token
(key + uploadId + size), so a leaked presigned URL cannot be replayed for a
different object or a larger body.

:::info Security upgrade
In v1, cloud-drive integration was client-side only: the Google Drive
`clientId`/`apiKey` and OneDrive `clientId` were public identifiers shipped to
the browser (which is the normal client-side OAuth model — those are not
secrets). What v1 could **not** do is keep the OAuth **client secret** and the
drive access tokens off the client. v2 server mode does: the client talks to
your `serverUrl` for OAuth and drive access, and `@upupjs/server` performs the
OAuth exchange and stores tokens in your `TokenStore`. For storage, both modes still upload the
file bytes directly to storage via a presigned URL — the difference is that in
server mode `@upupjs/server` issues that URL, holding the storage credentials
server-side exactly as your v1 `tokenEndpoint` did, and binds it to an HMAC
token (a key + uploadId + size envelope). What server mode _additionally_
proxies is cloud-drive transfers: the server fetches the drive file and writes
it to storage itself, so drive access tokens never reach the browser. Move to
server mode when you need credential isolation, per-user token scoping, or
server-side scanning/compliance. Client mode (`uploadEndpoint`) remains a valid,
first-class choice.
:::

:::note
`@upupjs/server` speaks the S3 API only — set `storage.endpoint` for any
non-AWS S3-compatible backend (MinIO, R2, DO Spaces, …). `StorageProvider.Azure`
has no S3 surface, so `createUpupHandler` rejects it at construction time; use
client mode with your own signing route for Azure.
:::

See [Server Mode — Setup](../guides/server-mode-setup.md) for the Next.js,
Express, Fastify, and Hono adapters, and [Upload modes](../guides/modes.md) for
choosing between them.

## Full example: before and after

**v1** (`upup-react-file-uploader`):

```tsx
'use client'

import {
    UpupUploader,
    UpupProvider,
    UploadAdapter,
} from 'upup-react-file-uploader'
import 'upup-react-file-uploader/styles'

export default function Uploader() {
    return (
        <UpupUploader
            provider={UpupProvider.AWS}
            tokenEndpoint="/api/upload-token"
            limit={5}
            accept="image/*"
            dark
            maxFileSize={{ size: 20, unit: 'MB' }}
            resumable={{ mode: 'multipart' }}
            uploadAdapters={[
                UploadAdapter.INTERNAL,
                UploadAdapter.GOOGLE_DRIVE,
            ]}
            driveConfigs={{
                googleDrive: {
                    google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
                    google_api_key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
                    google_app_id: process.env.NEXT_PUBLIC_GOOGLE_APP_ID!,
                },
            }}
            customProps={{ folder: 'avatars' }}
            onFileRemove={file => console.log('removed', file)}
            onFilesUploadComplete={files => console.log('done', files)}
        />
    )
}
```

**v2** (`@upupjs/react`):

```tsx
'use client'

import { UpupUploader } from '@upupjs/react'
import '@upupjs/react/styles'

export default function Uploader() {
    return (
        <UpupUploader
            provider="aws"
            uploadEndpoint="/api/upload-token"
            maxFiles={5}
            allowedFileTypes="image/*"
            theme={{ mode: 'dark' }}
            maxFileSize={{ size: 20, unit: 'MB' }}
            resumable={{ protocol: 'multipart' }}
            sources={['local', 'googleDrive']}
            cloudDrives={{
                googleDrive: {
                    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
                    apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
                    appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID!,
                },
            }}
            metadata={{ folder: 'avatars' }}
            onFileRemoved={file => console.log('removed', file)}
            onFilesUploadComplete={files => console.log('done', files)}
        />
    )
}
```

## Gotchas

Behavioral differences to check after the mechanical rename:

- **`maxFiles` defaults to 10, not 1.** v1's `limit` defaulted to `1`. If your
  app relied on single-file selection, set `maxFiles={1}` (or use `mini`, which
  forces a single file).
- **`onFilesUploadComplete` always received file objects, not keys** — read
  `file.key` for the storage key.
- **`resumable.mode` is now `resumable.protocol`.** A leftover
  `{ mode: 'multipart' }` will not enable resumable uploads.
- **`onFileRemove` is now `onFileRemoved`.** The old spelling is gone (not
  aliased), so it silently stops firing if you miss it.
- **The panel is fixed-height by design.** The full uploader is 480px tall
  (max-width 600px); `mini` is a compact square (max-width 280px). Media views
  (camera, screen capture, previews) adapt to that box — the panel does not grow
  to fit content. This is unchanged from v1's sizing model.
- **`UpupProvider` and `UploadAdapter` no longer exist.** Replace enum usages
  with the string `provider` value and `sources` ids respectively.
- **A fresh core per mount.** v2 creates and `destroy()`s its engine on
  mount/unmount; hold state in your own app or via `useUpupUpload`, not across
  a remount of `<UpupUploader>`.

## Next steps

- [React quickstart](../quickstarts/react.md) — the modern v2 surface end to end.
- [Getting started](../getting-started.md) — local collection, client uploads,
  and server uploads in one page.
- [Server Mode — Setup](../guides/server-mode-setup.md) — adapters, auth, and
  production token stores.
- [Upload modes](../guides/modes.md) — client vs server, and when to pick each.
- Other frameworks: [Vue](../quickstarts/vue.md), [Svelte](../quickstarts/svelte.md),
  [Angular](../quickstarts/angular.md), [Vanilla JS](../quickstarts/vanilla.md),
  [Preact](../quickstarts/preact.md), [Next.js](../quickstarts/next.md).
