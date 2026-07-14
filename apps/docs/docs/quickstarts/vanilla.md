---
title: Vanilla JS Quickstart
slug: /quickstarts/vanilla
sidebar_position: 5
description: Add a full-featured file uploader to any page with @upupjs/vanilla — framework-free, DOM-identical to the canonical React UI, with cloud drives, camera, and resumable uploads.
---

# Vanilla JS Quickstart

`@upupjs/vanilla` is the framework-free upup uploader (built on lit-html) —
DOM-identical to the canonical React UI — with cloud-drive sources, resumable
uploads, theming, and ICU i18n. Mount it into any DOM element; no framework
required. This page gets you uploading in **client mode**, no server package
required.

## Install

```sh
npm i @upupjs/vanilla
```

## Minimal example (client mode)

`createUploader(target, options)` accepts a CSS selector string or an
`HTMLElement`. In client mode the browser uploads directly to your storage; your
app only issues short-lived upload credentials at `uploadEndpoint`.

```ts
import { createUploader } from '@upupjs/vanilla'
import '@upupjs/vanilla/styles'

const uploader = createUploader('#uploader', {
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
})

// Later, when you tear down the view:
uploader.destroy()
```

The instance also exposes `getState()`, `subscribe()`, `addFiles()`, `upload()`,
`pause()`, `resume()`, `cancel()`, and `retry()`. Call `destroy()` on unmount to
stop the render loop and detach listeners. The stylesheet is a separate import,
so pages without Tailwind get the same look.

See [Code Examples](../code-examples.md) for a ready-to-copy presign handler.

## Custom element

A `<upup-uploader>` custom element is also published. Importing
`@upupjs/vanilla/element` registers it, after which you can use it declaratively:

```ts
import '@upupjs/vanilla/element'
```

```html
<upup-uploader
    provider="aws"
    upload-endpoint="/api/upload-token"
></upup-uploader>
```

## Choose sources and cloud drives

Pass `sources` to pick which tabs appear and `cloudDrives` to enable the cloud
providers (client IDs come from each provider's developer console):

```ts
createUploader('#uploader', {
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
    sources: ['local', 'camera', 'screen', 'url', 'googleDrive', 'oneDrive'],
    cloudDrives: {
        googleDrive: { clientId: '...', apiKey: '...', appId: '...' },
        oneDrive: { clientId: '...' },
    },
})
```

## Add server mode

For credential isolation and server-proxied cloud drives, add
[`@upupjs/server`](https://www.npmjs.com/package/@upupjs/server) and set the mode:

```ts
createUploader('#uploader', {
    mode: 'server',
    serverUrl: '/api/upup',
    provider: 'aws',
})
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

The image editor is React/Preact-only and is intentionally stubbed in the
framework-free build; every other capability above is fully native.

## Also exported

`FileSource`, `StorageProvider`, and `UploadStatus`.
