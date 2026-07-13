---
title: React Quickstart
slug: /quickstarts/react
sidebar_position: 1
description: Add a full-featured file uploader to a React 19 app with @upup/react — drag-and-drop, cloud drives, camera, and resumable uploads, with no upload server to run.
---

# React Quickstart

`@upup/react` is the canonical upup UI: a drag-and-drop uploader with file
previews, a progress bar, cloud-drive sources, an image editor, theming, and ICU
i18n. This page gets you uploading in **client mode** — no server package required.

Requires React 19 (`react` and `react-dom` are peer dependencies).

## Install

```sh
npm i @upup/react
```

## Minimal example (client mode)

In client mode the browser uploads directly to your storage; your app only issues
short-lived upload credentials at `uploadEndpoint`.

```tsx
'use client'

import { UpupUploader } from '@upup/react'
import '@upup/react/styles'

export default function Uploader() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
```

The stylesheet is a separate import, so projects without Tailwind get the same
look. `uploadEndpoint` is your route that returns a presigned upload URL per
file; `provider` is your storage backend — `aws`, `minio`, `r2`,
`digitalocean`, `wasabi`, `backblaze`, and other S3-compatible providers work.

See [Code Examples](../code-examples.md) for a ready-to-copy presign handler.

## Choose sources and cloud drives

Pass `sources` to pick which tabs appear and `cloudDrives` to enable the cloud
providers (client IDs come from each provider's developer console):

```tsx
<UpupUploader
    provider="aws"
    uploadEndpoint="/api/upload-token"
    sources={['local', 'camera', 'screen', 'url', 'googleDrive', 'oneDrive']}
    cloudDrives={{
        googleDrive: { clientId: '...', apiKey: '...', appId: '...' },
        oneDrive: { clientId: '...' },
    }}
/>
```

## Add server mode

For credential isolation and server-proxied cloud drives, add
[`@upup/server`](https://www.npmjs.com/package/@upup/server) and point the
uploader at it:

```tsx
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

The handler requires an `uploadTokenSecret` of **at least 16 characters** —
`createUpupHandler` throws at construction time if it is missing or too short:

```ts
import { createUpupHandler } from '@upup/server'

export const handler = createUpupHandler({
    storage: {
        type: 'aws',
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION!,
    },
    uploadTokenSecret: process.env.UPUP_UPLOAD_TOKEN_SECRET, // required, >= 16 chars
})
```

See [Server Mode — Setup](../guides/server-mode-setup.md) for the full
walkthrough: adapters for Next.js, Express, Fastify, and Hono; auth and user
binding; and production token stores.

## What you get

- **Cloud drives** — Google Drive, OneDrive, Dropbox, and Box, browsed in-panel.
- **Camera** and **screen capture** sources.
- **Link import** — add files by URL.
- **Resumable uploads** — optional tus or S3 multipart for large files.
- **Image editor** — crop, rotate, and annotate (React and Preact only).
- **ICU i18n** — locale bundles with pluralization and per-key overrides.
- **Theming** — design tokens, slots, and dark mode via `UpupThemeProvider`.

## Also exported

`UpupThemeProvider`, the brand source icons (`GoogleDriveIcon`, `OneDriveIcon`,
`DropboxIcon`, `BoxIcon`, `CameraIcon`, and more), and the `use*` hooks
(`useUpupUpload`, `useUploaderFiles`, `useUploaderContext`, and more) for
building a custom UI on the same engine.
