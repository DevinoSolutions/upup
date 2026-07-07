---
sidebar_position: 3
---

# Error Monitoring

upup exposes structured errors at every layer — client uploads, pipeline
processing, cloud-drive operations, and server-side handlers. This guide shows
how to wire them into Sentry (or any error tracker) so upload failures surface
in your dashboard instead of disappearing silently.

**This is opt-in.** upup never phones home or sends telemetry. You add the
listeners you want, in your code, reporting to your Sentry project.

## Error surfaces at a glance

| Surface | Event / API | Payload |
|---|---|---|
| Upload failure | `upload-error` event | `{ error: Error, file?: UploadFile }` |
| Pipeline step | `pipeline-error` event | `{ scope, name, message }` |
| Cloud drive | `<provider>:error` event | `{ error: Error, action: string }` |
| React/framework prop | `onError` callback | `errorMessage: string` |
| Server handler | Thrown `Error` with `cause` | Standard Node.js error |

Every error thrown by upup carries a `code` string from a fixed taxonomy
(`UpupErrorCode`) and a `retryable` boolean. Cause chains are preserved — the
original provider/network error is always in `.cause`.

## Client-side: React

### Core event listener (recommended)

The `upload-error` event gives you the richest context — the full `Error`
object plus the file that failed:

```tsx
import { useRef, useEffect } from 'react'
import { UpupUploader } from '@upup/react'
import type { UploaderRef } from '@upup/react'
import * as Sentry from '@sentry/react'

function MyUploader() {
  const ref = useRef<UploaderRef>(null)

  useEffect(() => {
    const core = ref.current?.getCore()
    if (!core) return

    const off = core.on('upload-error', ({ error, file }) => {
      Sentry.captureException(error, {
        tags: {
          upup_code: (error as any).code,
          upup_retryable: String((error as any).retryable ?? false),
        },
        contexts: {
          upload: {
            fileName: file?.name,
            fileSize: file?.size,
            fileType: file?.type,
          },
        },
      })
    })

    return off
  }, [])

  return <UpupUploader ref={ref} {/* ...your props */} />
}
```

### Pipeline errors

Pipeline steps (compression, HEIC conversion) emit `pipeline-error` for
non-fatal diagnostics — the upload may still succeed with the original file:

```ts
core.on('pipeline-error', ({ scope, name, message }) => {
  Sentry.captureMessage(`Pipeline: ${scope}/${name} — ${message}`, {
    level: 'warning',
    tags: { upup_pipeline_scope: scope, upup_pipeline_step: name },
  })
})
```

### Cloud-drive errors

Each drive provider emits namespaced errors. Listen per-provider or catch all
four:

```ts
const providers = ['google-drive', 'onedrive', 'dropbox', 'box'] as const

for (const p of providers) {
  core.on(`${p}:error`, ({ error, action }) => {
    Sentry.captureException(error, {
      tags: { upup_drive: p, upup_drive_action: action },
    })
  })
}
```

### The `onError` prop (simple path)

If you don't need file metadata or error codes, the `onError` prop is the
quickest path:

```tsx
<UpupUploader
  onError={(message) => {
    Sentry.captureMessage(message, { level: 'error' })
  }}
/>
```

This fires for upload-level errors only (not pipeline or drive errors).

## Server-side: Next.js / Express / Hono

Server handler errors are standard `Error` objects with `.cause` chains. If
your server framework is already instrumented with Sentry, handler errors are
captured automatically — no extra upup-specific wiring needed.

For example, with `@sentry/nextjs` configured in your Next.js app, a failed
presign or multipart call surfaces as a caught exception with the full cause
chain (S3 SDK error → upup handler error → your route).

If you instrument manually:

```ts
import { createUpupHandler } from '@upup/server'
import * as Sentry from '@sentry/node'

const handle = createUpupHandler({ /* config */ })

export async function handler(req: Request): Promise<Response> {
  try {
    return await handle(req)
  } catch (err) {
    Sentry.captureException(err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
    })
  }
}
```

## Error taxonomy

Every `UpupError` carries a `code` from the `UpupErrorCode` enum. Use these
codes as Sentry tags to filter and alert:

| Code | Meaning |
|---|---|
| `AUTH_EXPIRED` | OAuth token expired mid-session |
| `AUTH_DENIED` | Server rejected the upload token |
| `FILE_TOO_LARGE` | File exceeds `maxFileSize` |
| `TYPE_MISMATCH` | File type not in `accept` list |
| `LIMIT_EXCEEDED` | `maxFiles` reached |
| `UPLOAD_FAILED` | S3/storage PUT failed |
| `UPLOAD_ABORTED` | User or code called `abort()` |
| `PRESIGN_FAILED` | Presign endpoint returned an error |
| `CORS_ERROR` | Browser blocked the S3 request |
| `NETWORK_ERROR` | Fetch failed (offline, DNS, etc.) |
| `HEIC_CONVERSION_FAILED` | HEIC → JPEG pipeline step failed |
| `PIPELINE_STEP_FAILED` | Generic pipeline step failure |

The `retryable` flag tells you whether the error is transient. A Sentry alert
rule on `upup_retryable: false` surfaces permanent failures that need human
attention.

## What upup guarantees

The codebase enforces these invariants (verified by lint rules and tests):

- **No silent catches.** Every `catch` block either re-throws, emits an error
  event, or has a lint-mandated justification comment.
- **No floating promises.** Async failures always propagate to an error surface.
- **Cause chains.** The original error is preserved in `.cause` — Sentry
  displays the full chain automatically.
- **One upload-failure channel.** All upload errors route through `upload-error`;
  there is no second event to miss.
