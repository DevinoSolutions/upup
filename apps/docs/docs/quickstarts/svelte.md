---
title: Svelte Quickstart
slug: /quickstarts/svelte
sidebar_position: 3
description: Add a full-featured file uploader to a Svelte 5 app with @upupjs/svelte — a native port of the canonical React UI, DOM-identical, with cloud drives, camera, and resumable uploads.
---

# Svelte Quickstart

`@upupjs/svelte` is a native Svelte 5 port of the canonical upup React UI —
DOM-identical to it — with cloud-drive sources, resumable uploads, theming, and
ICU i18n. This page gets you uploading in **client mode**, no server package
required.

Requires Svelte 5 (`svelte` is a peer dependency).

## Install

```sh
npm i @upupjs/svelte
```

## Minimal example (client mode)

In client mode the browser uploads directly to your storage; your app only issues
short-lived upload credentials at `uploadEndpoint`.

```svelte
<script lang="ts">
    import { UpupUploader } from '@upupjs/svelte'
    import '@upupjs/svelte/styles'
</script>

<UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
```

The stylesheet is a separate import, so projects without Tailwind get the same
look. `uploadEndpoint` is your route that returns a presigned upload URL per
file; `provider` is your storage backend — `aws`, `minio`, `r2`,
`digitalocean`, `wasabi`, `backblaze`, and other S3-compatible providers work.

See [Code Examples](../code-examples.md) for a ready-to-copy presign handler.

## Choose sources and cloud drives

Pass `sources` to pick which tabs appear and `cloudDrives` to enable the cloud
providers (client IDs come from each provider's developer console):

```svelte
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
[`@upupjs/server`](https://www.npmjs.com/package/@upupjs/server) and point the
uploader at it:

```svelte
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
- **ICU i18n** — locale bundles with pluralization and per-key overrides.
- **Theming** — design tokens, slots, and dark mode.

The image editor is React/Preact-only and is intentionally stubbed in Svelte;
every other capability above is fully native.

## Also exported

`toReadable` (adapts an uploader store to a Svelte readable), the `use*` uploader
helpers, and the `FileSource`, `StorageProvider`, and `UploadStatus` enums for
building a custom UI on the same engine.
