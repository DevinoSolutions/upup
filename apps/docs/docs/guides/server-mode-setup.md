---
sidebar_position: 2
---

# Server Mode — Setup

End-to-end setup for `mode="server"`. Assumes a Next.js app; the same
`createHandler()` plugs into Express, Fastify, or Hono via the
per-framework adapters.

Rough time budget: **15–30 minutes** including provider OAuth
registration.

## 1. Install

```sh
pnpm add @upup/react @upup/server
```

`@upup/server` is the Node-side handler. The React package has no
dependency on it — your client bundle stays free of S3 SDKs.

## 2. Mount the handler

**Next.js App Router**

```ts
// app/api/upup/[...route]/route.ts
import { createHandler, InMemoryTokenStore } from '@upup/server'

const handler = createHandler({
  storage: {
    type: 'aws',
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  providers: {
    googleDrive: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    dropbox: {
      appKey: process.env.DROPBOX_APP_KEY!,
      appSecret: process.env.DROPBOX_APP_SECRET!,
    },
    // oneDrive, box — same shape
  },
  tokenStore: new InMemoryTokenStore(), // swap for Redis in prod
  getUserId: async (req) => {
    // Resolve the session user. Return null → OAuth 401s.
    const session = await getSessionFromCookie(req)
    return session?.userId ?? null
  },
})

export const GET = handler
export const POST = handler
```

The handler routes on path suffix: `/presign`, `/multipart/*`,
`/auth/:provider`, `/auth/:provider/cb`, `/files/:provider`,
`/files/:provider/transfer`. All paths are relative to the folder you
mount it at.

## 3. Point the uploader at it

```tsx
<UpupUploader
  mode="server"
  serverUrl="/api/upup"
  provider="aws"
  sources={['local', 'google_drive', 'dropbox']}
/>
```

No cloud-drive `clientId` props needed on the client — the server
holds them.

## 4. Register OAuth apps

For each drive you enable:

| Provider | Console | Callback URL |
|---|---|---|
| Google Drive | `console.cloud.google.com` → APIs → OAuth 2.0 Client IDs | `https://yourapp.com/api/upup/auth/google-drive/cb` |
| OneDrive | `portal.azure.com` → App registrations | `https://yourapp.com/api/upup/auth/onedrive/cb` |
| Dropbox | `www.dropbox.com/developers/apps` | `https://yourapp.com/api/upup/auth/dropbox/cb` |
| Box | `app.box.com/developers/console` | `https://yourapp.com/api/upup/auth/box/cb` |

Scopes required:
- Google: `https://www.googleapis.com/auth/drive.readonly`
- OneDrive: `Files.Read.All`
- Dropbox: `files.content.read files.metadata.read`
- Box: `root_readonly`

## 5. Production token store

`InMemoryTokenStore` is a reference implementation. Replace with any
KV-shaped store for production:

```ts
// Redis example
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL!)

const tokenStore = {
  async get(key) {
    return (await redis.get(key)) ?? null
  },
  async set(key, value, ttlSeconds) {
    if (ttlSeconds) await redis.setex(key, ttlSeconds, value)
    else await redis.set(key, value)
  },
  async delete(key) {
    await redis.del(key)
  },
}
```

The contract is three strings-in-strings-out methods. Cloudflare KV,
DynamoDB, Postgres — anything shaped like this works.

## 6. Tuning

```ts
createHandler({
  // ...
  maxFileSize: 500 * 1024 * 1024,      // 500 MB
  allowedTypes: ['image/*', 'video/*'],
  multipartThreshold: 50 * 1024 * 1024, // 50 MB (default 100 MB)
  hooks: {
    onBeforeUpload: async (file, req) => {
      // Return false to reject the upload
      return true
    },
    onFileUploaded: async (file, req) => {
      // Persist a DB row pointing at file.key
    },
  },
})
```

**`multipartThreshold`** controls the server→S3 multipart cutoff:
files smaller than this stream through as a single PUT; larger files
use S3 multipart with 5 MiB chunks. Server memory envelope is one
chunk at a time regardless of file size.

## 7. Re-authentication

When an OAuth access token expires, the server returns
`401 { reauth: true }`. The React component catches this and surfaces
the provider's "Sign in" button. One click re-auths and the user
continues where they left off.

We deliberately don't persist refresh tokens — shorter blast radius if
`tokenStore` leaks, and no background refresh cron to maintain. The
user's re-auth click is always one step.
