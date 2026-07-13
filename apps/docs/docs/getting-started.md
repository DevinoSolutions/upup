---
sidebar_position: 1
---

# Getting Started

upup is a file uploader with a native UI for **React, Vue, Svelte, Angular,
Vanilla JS, and Preact**, built on a shared headless core (`@useupup/core`), with
an optional server mode for signed uploads and cloud-drive sources (Google
Drive, OneDrive, Dropbox, Box). Every package renders the same UI.

This guide uses React. To start from another framework, use its quickstart —
each mounts the same uploader with the same options:

- [React quickstart](quickstarts/react.md)
- [Vue quickstart](quickstarts/vue.md)
- [Svelte quickstart](quickstarts/svelte.md)
- [Angular quickstart](quickstarts/angular.md)
- [Vanilla JS quickstart](quickstarts/vanilla.md)
- [Preact quickstart](quickstarts/preact.md)

Install the React package and styles:

```bash
npm i @useupup/react
```

```tsx
import { UpupUploader } from '@useupup/react'
import '@useupup/react/styles'
```

## Local File Collection

With no upload target, upup lets users select files and gives you `File`
objects through callbacks and hooks.

```tsx
<UpupUploader
    sources={['local', 'url']}
    onFilesSelected={files => {
        console.log(files)
    }}
/>
```

Calling `upload()` without a target returns a typed no-target error.

## Client Uploads

Use `uploadEndpoint` when your app signs upload URLs and the browser uploads
bytes directly to storage.

```tsx
<UpupUploader
    provider="aws"
    uploadEndpoint="/api/upload-token"
    metadata={{ projectId: 'p_123' }}
/>
```

## Server Uploads

Use `@useupup/server` when provider OAuth, token storage, storage credentials,
or transfer policy should live server-side.

```bash
npm i @useupup/react @useupup/server
```

```tsx
<UpupUploader provider="aws" mode="server" serverUrl="/api/upup" />
```

```ts
import { createUpupHandler, InMemoryTokenStore } from '@useupup/server'

const handler = createUpupHandler({
    storage: {
        type: 'aws',
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION!,
    },
    // Required, server-only: a stable, high-entropy secret (min 16 chars),
    // shared across every server instance. createUpupHandler throws without it.
    uploadTokenSecret: process.env.UPUP_UPLOAD_TOKEN_SECRET!,
    tokenStore: new InMemoryTokenStore(),
    getUserId: async () => 'user_123',
})

export const GET = handler
export const POST = handler
```
