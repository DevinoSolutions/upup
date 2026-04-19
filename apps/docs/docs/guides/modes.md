---
sidebar_position: 1
---

# Client Mode vs Server Mode

`upup-react-file-uploader` ships with two upload modes. Pick one with
the `mode` prop. The default is `'client'` — existing consumers need
no changes.

```tsx
<UpupUploader mode="client" ... />   // default
<UpupUploader mode="server" serverUrl="/api/upup" ... />
```

## Client Mode

**Browser talks directly to storage.** Your server's only job is to
sign short-lived upload URLs.

```
browser ──POST /sign──> your server
browser <──presigned URL─ your server
browser ──PUT bytes────> S3 / R2 / etc.
```

Cloud drives (Google Drive, OneDrive, Dropbox, Box) use OAuth from the
browser — tokens stay in browser memory, never touch your server.

**Choose Client Mode when:**
- You want the simplest setup.
- You're OK exposing OAuth client IDs (not secrets) to the browser.
- You don't need server-side virus scanning or compliance logging
  inside the upload path.
- Latency matters — bytes go direct to storage, no relay hop.

## Server Mode

**Browser talks only to your server.** Your server proxies drive APIs,
stores OAuth tokens, and writes bytes to storage.

```
browser ──GET  /files/:provider ──> your server ──> Google / MS / ...
browser ──POST /files/:provider/transfer ──> your server ──> S3
```

The uploader hits one origin. You own the access tokens and the
storage credentials.

**Choose Server Mode when:**
- Compliance or policy forbids shipping OAuth client secrets or
  storage credentials to the browser.
- You want to scan, log, or transform files on the server before they
  reach storage.
- Your end users can't reach the drive APIs directly (corporate
  firewall, region block).
- Files may be larger than the browser can hold in memory. Server Mode
  streams drive → S3 without buffering the whole file.

## What changes between modes?

| Concern | Client Mode | Server Mode |
|---|---|---|
| Prop | `tokenEndpoint` | `serverUrl` |
| OAuth client ID | Shipped to browser | Server-only |
| OAuth client secret | Not used | Server-only, required |
| Drive API calls | Browser → provider | Server → provider |
| Storage credentials | Signed URLs only | Server holds real creds |
| Multipart | Browser-coordinated | Server-coordinated |
| Re-auth on token expiry | Same: user re-signs-in | Same: user re-signs-in |

## Feature parity

All 24 `UpupUploader` events (`onFilesSelected`, `onUploadStart`,
`onFileUploadComplete`, etc.) fire identically in both modes. Theme
slots, i18n, restrictions, image editor — all work the same.

The differences are strictly on the wire, not on the API surface.

## Migration

There is none — `mode` is opt-in. `mode="client"` is the default and
matches v2.0 / v2.1 behaviour exactly.
