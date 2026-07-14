---
sidebar_position: 3
---

# Resumable Uploads

Upup supports two resumable protocols.

## Multipart

Multipart uploads use your configured `uploadEndpoint` or `serverUrl`. Core
selects multipart for files above `thresholdBytes`.

```tsx
<UpupUploader
  provider="aws"
  uploadEndpoint="/api/upload-token"
  resumable={{
    protocol: 'multipart',
    thresholdBytes: 5 * 1024 * 1024,
    chunkSizeBytes: 8 * 1024 * 1024,
  }}
/>
```

Your server must support:

```txt
POST /multipart/init
POST /multipart/sign-part
POST /multipart/complete
POST /multipart/abort
```

## Tus

Tus uploads use an external Tus-compatible service directly.

```tsx
<UpupUploader
  resumable={{
    protocol: 'tus',
    endpoint: 'https://uploads.example.com/files',
    retryDelays: [0, 1000, 3000, 5000],
  }}
/>
```

Configure only one upload target at a time: `uploadEndpoint`, `serverUrl`, or
Tus `endpoint`.
