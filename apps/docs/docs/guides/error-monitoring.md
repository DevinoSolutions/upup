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

| Surface              | Event / API              | Payload                               |
| -------------------- | ------------------------ | ------------------------------------- |
| Upload failure       | `upload-error` event     | `{ error: Error, file?: UploadFile }` |
| Pipeline step        | `pipeline-error` event   | `{ scope, name, message }`            |
| Cloud drive          | `<provider>:error` event | `{ error: Error, action: string }`    |
| React/framework prop | `onError` callback       | `errorMessage: string`                |
| Server handler       | Thrown `Error`           | Standard Node.js error                |

Every error thrown by upup carries a `code` string from a fixed taxonomy
(`UpupErrorCode`) and a `retryable` boolean.

## Client-side: React

### The `onError` prop (component surface)

The `UpupUploader` component reports upload failures through its `onError`
prop as a message string — this is the supported wiring for the shipped
component today:

```tsx
import { UpupUploader } from '@upup/react'
import * as Sentry from '@sentry/react'

<UpupUploader
  onError={(message) => {
    Sentry.captureMessage(message, { level: 'error' })
  }}
  {/* ...your props */}
/>
```

This fires for upload-level errors only (not pipeline or drive errors), and
it carries the message string, not the `Error` object.

:::note Known limitation
The component does not currently expose its internal core — `UploaderRef`
exposes `useUpload()` only — so the rich `upload-error` payload (the full
`Error` with `code`/`retryable`, plus the failing file) is not reachable
from the component API. A ref-level core accessor is on the roadmap. The
event examples below apply when you drive `@upup/core` yourself (headless
or custom-UI integrations).
:::

### Full-fidelity events (headless `@upup/core`)

On the headless core, the `upload-error` event gives you the richest
context — the full `Error` object plus the file that failed:

```ts
import { UpupCore, UpupError } from '@upup/core'
import * as Sentry from '@sentry/browser'

const core = new UpupCore({/* ...your options */})

const off = core.on('upload-error', ({ error, file }) => {
    const upup = error instanceof UpupError ? error : undefined
    Sentry.captureException(error, {
        tags: {
            upup_code: upup?.code,
            upup_retryable: String(upup?.retryable ?? false),
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
```

### Pipeline errors

The HEIC-conversion step emits `pipeline-error` for non-fatal diagnostics —
the upload may still succeed with the original file:

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

## Server-side: Next.js / Express / Hono

Server handler errors are standard `Error` objects. If your server framework
is already instrumented with Sentry, handler errors are captured
automatically — no extra upup-specific wiring needed.

For example, with `@sentry/nextjs` configured in your Next.js app, a failed
presign or multipart call surfaces as a caught exception in your route.

If you instrument manually:

```ts
import { createUpupHandler } from '@upup/server'
import * as Sentry from '@sentry/node'

const handle = createUpupHandler({/* config */})

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

| Code                     | Meaning                            |
| ------------------------ | ---------------------------------- |
| `AUTH_EXPIRED`           | OAuth token expired mid-session    |
| `AUTH_DENIED`            | Server rejected the upload token   |
| `FILE_TOO_LARGE`         | File exceeds `maxFileSize`         |
| `TYPE_MISMATCH`          | File type not in `accept` list     |
| `LIMIT_EXCEEDED`         | `maxFiles` reached                 |
| `UPLOAD_FAILED`          | S3/storage PUT failed              |
| `UPLOAD_ABORTED`         | User or code called `abort()`      |
| `PRESIGN_FAILED`         | Presign endpoint returned an error |
| `CORS_ERROR`             | Browser blocked the S3 request     |
| `NETWORK_ERROR`          | Fetch failed (offline, DNS, etc.)  |
| `HEIC_CONVERSION_FAILED` | HEIC → JPEG pipeline step failed   |
| `PIPELINE_STEP_FAILED`   | Generic pipeline step failure      |

The `retryable` flag tells you whether the error is transient. A Sentry alert
rule on `upup_retryable: false` surfaces permanent failures that need human
attention.

## What upup guarantees

The codebase enforces these invariants (verified by lint rules and tests):

- **No silent catches.** Every `catch` block either re-throws, emits an error
  event, or has a lint-mandated justification comment.
- **No floating promises in TypeScript sources.** Async failures propagate to
  an error surface (linting inside `.vue`/`.svelte` templates is a tracked
  phase-2).
- **One upload-failure channel.** All upload errors route through `upload-error`;
  there is no second event to miss.
