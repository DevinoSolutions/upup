---
title: Vue Quickstart
slug: /quickstarts/vue
sidebar_position: 2
description: Add a full-featured file uploader to a Vue 3 app with @useupup/vue — a native port of the canonical React UI, DOM-identical, with cloud drives, camera, and resumable uploads.
---

# Vue Quickstart

`@useupup/vue` is a native Vue 3 port of the canonical upup React UI — DOM-identical
to it — with cloud-drive sources, resumable uploads, theming, and ICU i18n. This
page gets you uploading in **client mode**, no server package required.

Requires Vue 3.4+ (`vue` is a peer dependency).

## Install

```sh
npm i @useupup/vue
```

## Minimal example (client mode)

In client mode the browser uploads directly to your storage; your app only issues
short-lived upload credentials at `uploadEndpoint`.

```vue
<script setup lang="ts">
import { UpupUploader } from '@useupup/vue'
import '@useupup/vue/styles'
</script>

<template>
    <UpupUploader provider="aws" upload-endpoint="/api/upload-token" />
</template>
```

The stylesheet is a separate import, so projects without Tailwind get the same
look. `upload-endpoint` is your route that returns a presigned upload URL per
file; `provider` is your storage backend — `aws`, `minio`, `r2`,
`digitalocean`, `wasabi`, `backblaze`, and other S3-compatible providers work.

See [Code Examples](../code-examples.md) for a ready-to-copy presign handler.

## Choose sources and cloud drives

Bind `sources` to pick which tabs appear and `cloud-drives` to enable the cloud
providers (client IDs come from each provider's developer console):

```vue
<template>
    <UpupUploader
        provider="aws"
        upload-endpoint="/api/upload-token"
        :sources="[
            'local',
            'camera',
            'screen',
            'url',
            'googleDrive',
            'oneDrive',
        ]"
        :cloud-drives="{
            googleDrive: { clientId: '...', apiKey: '...', appId: '...' },
            oneDrive: { clientId: '...' },
        }"
    />
</template>
```

## Add server mode

For credential isolation and server-proxied cloud drives, add
[`@useupup/server`](https://www.npmjs.com/package/@useupup/server) and point the
uploader at it:

```vue
<template>
    <UpupUploader mode="server" server-url="/api/upup" provider="aws" />
</template>
```

The handler requires an `uploadTokenSecret` of **at least 16 characters** —
`createUpupHandler` throws at construction time if it is missing or too short:

```ts
import { createUpupHandler } from '@useupup/server'

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

The image editor is React/Preact-only and is intentionally stubbed in Vue; every
other capability above is fully native.

## Also exported

The `use*` uploader composables (`useUpupUpload`, `useUploaderFiles`,
`useUploaderContext`, and more), plus the `FileSource`, `StorageProvider`, and
`UploadStatus` enums for building a custom UI on the same engine.
