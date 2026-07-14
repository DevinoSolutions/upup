---
title: Preact Quickstart
slug: /quickstarts/preact
sidebar_position: 6
description: Add a full-featured file uploader to a Preact app with @upupjs/preact — a preact/compat re-export of @upupjs/react, same UI and API, with cloud drives, camera, and resumable uploads.
---

# Preact Quickstart

`@upupjs/preact` is a **`preact/compat` re-export of
[`@upupjs/react`](./react.md)** — the same UI and API, resolved against
Preact: cloud-drive sources, resumable uploads, theming, and ICU i18n. This page
gets you uploading in **client mode**, no server package required.

Requires Preact 10.13+ (`preact` is a peer dependency; the image editor has
additional optional peers — see below).

## Install

```sh
npm i @upupjs/preact
```

Use it in a Preact project with the standard `preact/compat` aliases
(`react` / `react-dom` → `preact/compat`) configured in your bundler, as with any
React-compatible library.

## Minimal example (client mode)

In client mode the browser uploads directly to your storage; your app only issues
short-lived upload credentials at `uploadEndpoint`.

```tsx
import { UpupUploader } from '@upupjs/preact'
import '@upupjs/preact/styles'

export function App() {
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

## Image editor island

The optional image editor runs as an **isolated real-React island**: it lazily
loads actual `react` / `react-dom` on demand to render Filerobot, so React never
enters your main Preact bundle. If you enable the editor, install its peers
(`react`, `react-dom`, `react-filerobot-image-editor`, and the `konva` /
`react-konva` / `styled-components` dependencies it needs — see this package's
`peerDependencies`).

## Add server mode

For credential isolation and server-proxied cloud drives, add
[`@upupjs/server`](https://www.npmjs.com/package/@upupjs/server) and point the
uploader at it:

```tsx
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

The handler requires an `uploadTokenSecret` of **at least 16 characters** —
`createUpupHandler` throws at construction time if it is missing or too short:

```ts
import { createUpupHandler } from '@upupjs/server'

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
- **Image editor** — crop, rotate, and annotate (via the real-React island).
- **ICU i18n** — locale bundles with pluralization and per-key overrides.
- **Theming** — design tokens, slots, and dark mode via `UpupThemeProvider`.

## Also exported

Because it re-exports `@upupjs/react`, the public surface matches `@upupjs/react`
exactly: `UpupThemeProvider`, the brand source icons, and the `use*` hooks
(`useUpupUpload`, `useUploaderFiles`, `useUploaderContext`, and more).
