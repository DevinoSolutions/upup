---
sidebar_position: 1
---

# Getting Started

Install the React package and styles:

```bash
npm i @upup/react
```

```tsx
import { UpupUploader } from '@upup/react'
import '@upup/react/styles'
```

## Local File Collection

With no upload target, Upup lets users select files and gives you `File`
objects through callbacks and hooks.

```tsx
<UpupUploader
  sources={['local', 'url']}
  onFilesSelected={(files) => {
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

Use `@upup/server` when provider OAuth, token storage, storage credentials,
or transfer policy should live server-side.

```bash
npm i @upup/react @upup/server
```

```tsx
<UpupUploader
  provider="aws"
  mode="server"
  serverUrl="/api/upup"
/>
```

```ts
import { createHandler, InMemoryTokenStore } from '@upup/server'

const handler = createHandler({
  storage: {
    type: 'aws',
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
  },
  tokenStore: new InMemoryTokenStore(),
  getUserId: async () => 'user_123',
})

export const GET = handler
export const POST = handler
```
