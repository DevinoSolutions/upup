---
sidebar_position: 5
---

# Optional Props

These are the stable v2-clean optional props.

| Prop | Example |
| --- | --- |
| `sources` | `sources={['local', 'url', 'googleDrive']}` |
| `cloudDrives` | `cloudDrives={{ googleDrive: { clientId, apiKey, appId } }}` |
| `i18n` | `i18n={{ locale: frFR, overrides: { browseFiles: 'choisir des fichiers' } }}` |
| `theme` | `theme={{ mode: 'dark', slots: { root: '...' } }}` |
| `metadata` | `metadata={{ projectId: 'p_123' }}` |
| `folderUpload` | `folderUpload={{ allowDrop: true, showSelectFolderButton: true }}` |
| `cors` | `cors={{ dangerouslyAutoConfigure: true, allowedOrigins: ['http://localhost:3000'] }}` |
| `maxRetries` | `maxRetries={3}` |
| `resumable` | `resumable={{ protocol: 'multipart', thresholdBytes: 5 * 1024 * 1024 }}` |

## `sources`

Controls which source panels are available. Canonical IDs are:

```ts
type FileSource =
  | 'local'
  | 'url'
  | 'camera'
  | 'microphone'
  | 'screen'
  | 'googleDrive'
  | 'oneDrive'
  | 'dropbox'
  | 'box'
```

## `cloudDrives`

Browser-safe cloud provider configuration for client mode.

```tsx
<UpupUploader
  sources={['local', 'googleDrive']}
  cloudDrives={{
    googleDrive: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
      appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID!,
    },
  }}
/>
```

Use `serverUrl` for OAuth client secrets, token storage, server-side transfers, and compliance workflows.

## `i18n`

Locale bundles are exported from `@upup/core/i18n`.

```tsx
import { frFR } from '@upup/core/i18n'

<UpupUploader
  i18n={{
    locale: frFR,
    overrides: {
      browseFiles: 'choisir des fichiers',
    },
  }}
/>
```

## `theme`

`theme.mode` supports `light`, `dark`, and `system`. Use `theme.slots` for component classes.

```tsx
<UpupUploader
  theme={{
    mode: 'system',
    slots: {
      root: 'rounded-lg border',
    },
  }}
/>
```

## `metadata`

`metadata` is sent with presign and multipart init requests.

```tsx
<UpupUploader
  uploadEndpoint="/api/upload-token"
  metadata={{ projectId: 'p_123', visibility: 'private' }}
/>
```

## `folderUpload`

`allowDrop` controls folder traversal when a user drops a directory onto the uploader. `showSelectFolderButton` controls whether the My Device source shows an explicit Select Folder action.

```tsx
<UpupUploader folderUpload={{ allowDrop: true, showSelectFolderButton: true }} />
```

## `cors`

Automatic CORS configuration is dangerous because it can mutate bucket policy. It must be explicitly enabled and scoped.

```tsx
<UpupUploader
  cors={{
    dangerouslyAutoConfigure: true,
    allowedOrigins: ['http://localhost:3000'],
  }}
/>
```

## `maxRetries`

Retries transient upload failures per file before surfacing a failed state.

```tsx
<UpupUploader uploadEndpoint="/api/upload-token" maxRetries={3} />
```

## `resumable`

Multipart and Tus are both explicit protocols.

```tsx
<UpupUploader
  uploadEndpoint="/api/upload-token"
  resumable={{
    protocol: 'multipart',
    thresholdBytes: 5 * 1024 * 1024,
    chunkSizeBytes: 8 * 1024 * 1024,
  }}
/>
```

```tsx
<UpupUploader
  resumable={{
    protocol: 'tus',
    endpoint: 'https://uploads.example.com/files',
    retryDelays: [0, 1000, 3000, 5000],
  }}
/>
```
