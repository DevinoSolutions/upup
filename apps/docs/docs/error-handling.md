---
sidebar_position: 4
---

# Error Handling

upup reports failures as a typed `UpupError` (or one of its subclasses). Every
`UpupError` carries:

- `message` — human-readable description
- `code` — a stable string from the `UpupErrorCode` enum
- `retryable` — whether the failure is transient and worth retrying
- `status` — the originating HTTP status, when the error came from a response

## Error types

Import the error classes and the code enum from `@useupup/core`:

```typescript
import {
    UpupError,
    UpupErrorCode,
    UpupAuthError,
    UpupNetworkError,
    UpupValidationError,
    UpupQuotaError,
    UpupStorageError,
    UpupConfigError,
} from '@useupup/core'
```

| Class                 | Raised when                                                 | Extra fields                   |
| --------------------- | ----------------------------------------------------------- | ------------------------------ |
| `UpupError`           | Base class for every upup error                             | `code`, `retryable`, `status?` |
| `UpupValidationError` | A file fails a size / type / count check                    | `reason`, `file`               |
| `UpupNetworkError`    | A fetch / XHR fails (marked `retryable`)                    | `status?`                      |
| `UpupStorageError`    | An S3 / storage operation fails                             | `provider`, `operation`        |
| `UpupAuthError`       | A cloud-drive OAuth / provider call fails                   | `provider`                     |
| `UpupQuotaError`      | A configured quota is exceeded                              | `limit`, `used`                |
| `UpupConfigError`     | Configuration is missing or invalid (e.g. no upload target) | —                              |

The `code` values come from the `UpupErrorCode` enum — `NO_UPLOAD_TARGET`,
`FILE_TOO_LARGE`, `TYPE_MISMATCH`, `LIMIT_EXCEEDED`, `PRESIGN_FAILED`,
`UPLOAD_FAILED`, `NETWORK_ERROR`, `AUTH_EXPIRED`, and more. See [Error
Monitoring](guides/error-monitoring.md) for the codes you'll tag most often.

## Inspecting an error

Upload failures surface through the core `upload-error` event with the full
`Error` object and the file that failed. Narrow with `instanceof`, or switch on
`code`:

```typescript
import { UpupError, UpupErrorCode, UpupValidationError } from '@useupup/core'

// error is the Error object from an upload-error event (see Error Monitoring).
function describeUploadError(error: unknown): string {
    if (error instanceof UpupValidationError) {
        return `${error.file.name} rejected: ${error.reason}`
    }
    if (error instanceof UpupError) {
        if (error.code === UpupErrorCode.PRESIGN_FAILED) {
            return 'Your token endpoint returned an error.'
        }
        return error.retryable
            ? 'Transient failure — safe to retry.'
            : 'Permanent failure — needs attention.'
    }
    return 'Unknown error.'
}
```

Both surfaces — the headless core's `upload-error` event (full `Error`) and the
React `onError` prop (message string) — plus wiring them into an error tracker
are covered in [Error Monitoring](guides/error-monitoring.md).

## Retry Behavior

You can configure automatic retries for failed uploads using the [`maxRetries`](api-reference/upupuploader/optional-props.md#maxretries) prop on the `UpupUploader` component. When set, each file upload is silently retried up to the specified number of times before being considered a failure.

```tsx
<UpupUploader
    provider="aws"
    uploadEndpoint="/api/upload-token"
    maxRetries={3} // Automatically retry failed uploads up to 3 times
/>
```

When `maxRetries` is not set, a manual **"Retry Upload"** button appears in the UI on failure, allowing users to retry at their discretion.

### Resumable Upload Recovery

When [resumable multipart uploads](resumable-uploads.md) are enabled (`resumable={{ protocol: 'multipart' }}`), error recovery is enhanced:

- On failure, the progress bar **preserves** the current progress instead of resetting to zero
- The retry button shows **"Resume Upload"** instead of "Retry Upload"
- Clicking "Resume Upload" continues from the last completed part rather than restarting the entire upload
- Upload sessions persist in `localStorage`, so even after a page refresh, re-selecting the same file resumes from where it left off
- If the server-side multipart session has expired (stale session), the upload transparently starts fresh with no user intervention required
