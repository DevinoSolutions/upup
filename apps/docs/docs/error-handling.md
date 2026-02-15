---
sidebar_position: 4
---

# Error Handling

All upload methods throw `UploadError` with:

- Human-readable message
- Error type classification
- HTTP status code
- Retryability flag

```typescript
export enum UploadErrorType {
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    EXPIRED_URL = 'EXPIRED_URL',

    FILE_VALIDATION_ERROR = 'FILE_VALIDATION_ERROR',
    PRESIGNED_URL_ERROR = 'PRESIGNED_URL_ERROR',

    SIGNED_URL_ERROR = 'SIGNED_URL_ERROR',
    CORS_CONFIG_ERROR = 'CORS_CONFIG_ERROR',
    TEMPORARY_CREDENTIALS_ERROR = 'TEMPORARY_CREDENTIALS_ERROR',

    UNKNOWN_UPLOAD_ERROR = 'UNKNOWN_UPLOAD_ERROR',
}

export class UploadError extends Error {
    private DEFAULT_ERROR_STATUS_CODE = 500

    constructor(
        message: string,
        public type = UploadErrorType.UNKNOWN_UPLOAD_ERROR,
        public retryable = false,
        public status?: number,
    ) {
        super(message)
        this.name = 'UploadError'
        this.status = status || this.DEFAULT_ERROR_STATUS_CODE
    }
}
```

## Retry Behavior

You can configure automatic retries for failed uploads using the [`maxRetries`](/docs/api-reference/upupuploader/optional-props.md#maxretries) prop on the `UpupUploader` component. When set, each file upload is silently retried up to the specified number of times before being considered a failure.

```tsx
<UpupUploader
  provider={UpupProvider.AWS}
  tokenEndpoint="/api/upload-token"
  maxRetries={3} // Automatically retry failed uploads up to 3 times
/>
```

When `maxRetries` is not set, a manual **"Retry Upload"** button appears in the UI on failure, allowing users to retry at their discretion.

### Resumable Upload Recovery

When [resumable multipart uploads](/docs/resumable-uploads.md) are enabled (`resumable={{ mode: 'multipart' }}`), error recovery is enhanced:

- On failure, the progress bar **preserves** the current progress instead of resetting to zero
- The retry button shows **"Resume Upload"** instead of "Retry Upload"
- Clicking "Resume Upload" continues from the last completed part rather than restarting the entire upload
- Upload sessions persist in `localStorage`, so even after a page refresh, re-selecting the same file resumes from where it left off
- If the server-side multipart session has expired (stale session), the upload transparently starts fresh with no user intervention required
