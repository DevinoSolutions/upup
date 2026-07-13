---
title: Next.js
slug: /quickstarts/next
sidebar_position: 7
description: Add a full-featured file uploader to a Next.js app with @useupup/next — the client UI and the server handlers in one install, split so the AWS SDK never reaches your client bundle.
---

# Next.js Quickstart

`@useupup/next` is the Next.js integration for upup: one install gives you the client
UI **and** the server handlers, split across two entry points so the AWS SDK never
reaches your client bundle. The client entry re-exports the full
[`@useupup/react`](./react.md) UI; the `/server` entry provides App Router and Pages
Router handlers.

Requires Next.js 15+ and React 19 (`next`, `react`, and `react-dom` are peer
dependencies).

## Install

```sh
npm i @useupup/next
```

## Client component

`@useupup/next` re-exports `@useupup/react`, so `UpupUploader` (and its hooks, icons, and
theme provider) come straight from `@useupup/next`. Render it in a client component:

```tsx
'use client'

import { UpupUploader } from '@useupup/next'
import '@useupup/next/styles'

export default function Uploader() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
```

That's **client mode** — the browser uploads directly to your storage and needs no
server package. To proxy uploads and cloud drives through your own server, point
the same component at the handler below:

```tsx
<UpupUploader mode="server" serverUrl="/api/upup" />
```

## Server — App Router

Create a catch-all route at `app/api/upup/[...path]/route.ts`.
`createUpupNextHandler` returns the HTTP method handlers; `defineUpupConfig` gives
you typed config.

```ts
import { createUpupNextHandler, defineUpupConfig } from '@useupup/next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const { GET, POST, PUT, DELETE } = createUpupNextHandler(
    defineUpupConfig({
        storage: {
            type: 'aws',
            bucket: process.env.S3_BUCKET!,
            region: process.env.S3_REGION!,
        },
        // REQUIRED — HMAC-signs upload tokens. Must be >= 16 chars and identical
        // on every instance; the handler THROWS at construction time without it.
        uploadTokenSecret: process.env.UPUP_UPLOAD_TOKEN_SECRET,
    }),
)
```

Add `serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner']`
to your `next.config` so the AWS SDK is bundled as a server external.

## Server — Pages Router

A Pages Router adapter ships too: `createUpupPagesHandler`, used as the route
file's default export at `pages/api/upup/[...path].ts`, with `export const config = { api: { bodyParser: false } }`
so the handler can read the raw body. Same required `uploadTokenSecret` rule
applies. See [Server Mode — Setup](../guides/server-mode-setup.md) for the full
walkthrough — auth and user binding, production token stores, and serverless notes
(persist the `TokenStore`, raise `maxDuration` for large transfers).

## What you get

- **Cloud drives** — Google Drive, OneDrive, Dropbox, and Box, browsed in-panel.
- **Camera** and **screen capture** sources.
- **Link import** — add files by URL.
- **Resumable uploads** — optional tus or S3 multipart for large files.
- **Image editor** — crop, rotate, and annotate (React and Preact only).
- **ICU i18n** — locale bundles with pluralization and per-key overrides.
- **Theming** — design tokens, slots, and dark mode via `UpupThemeProvider`.

## Also exported

From `@useupup/next`: the full `@useupup/react` surface (`UpupUploader`,
`UpupThemeProvider`, the brand source icons, and the `use*` hooks). From
`@useupup/next/server`: `createUpupNextHandler`, `createUpupPagesHandler`,
`defineUpupConfig`, and `InMemoryTokenStore` (dev-only — bring your own
`TokenStore` in production).
