---
sidebar_position: 5
---

# Optional Props

These optional props are not required for the UpupUploader component to work.

| Prop                                          | Example                                                                                            | Type            | Status   | Default Value                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------- | -------- | ---------------------------------------------- |
| [accept](#accept)                             | `accept="image/png"`                                                                               | string          | optional | `*`                                            |
| [dark](#dark)                                 | `dark={true}`                                                                                      | boolean         | optional | `false`                                        |
| [driveConfigs](#driveconfigs)                 | `driveConfigs={{ oneDrive: { onedrive_client_id: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID! } }}` | object          | optional | -                                              |
| [limit](#limit)                               | `limit={5}`                                                                                        | number          | optional | `1`                                            |
| [maxFileSize](#maxfilesize)                   | `maxFileSize={{ size: 20, unit: "MB" }}`                                                           | object          | optional | `{ size: 10, unit: "MB" }`                     |
| [maxRetries](#maxretries)                     | `maxRetries={3}`                                                                                   | number          | optional | -                                              |
| [mini](#mini)                                 | `mini={true}`                                                                                      | boolean         | optional | `false`                                        |
| [resumable](#resumable)                       | `resumable={{ mode: 'multipart' }}`                                                                | object          | optional | -                                              |
| [uploadAdapters](#uploadadapters)             | `uploadAdapters={[UploadAdapter.LINK]}`                                                            | UploadAdapter[] | optional | `[UploadAdapter.INTERNAL, UploadAdapter.LINK]` |
| [enableAutoCorsConfig](#enableautocorsconfig) | `enableAutoCorsConfig={false}`                                                                     | boolean         | optional | `false`                                        |

## `accept`

Specifies which file types the uploader will accept. Uses standard MIME type format. Defaults to accepting all files.

**Example patterns:**

- `image/*` - All images
- `application/pdf` - PDFs only
- `image/png, application/pdf` - PNGs and PDFs

## `dark`

Enables dark mode styling for the uploader component. Uses a dark background (#232323) and light text when enabled.

## `driveConfigs`

Configuration object for cloud drive integrations. Required if using Google Drive or OneDrive [upload adapters](#uploadadapters).

**Example configuration:**

```javascript
driveConfigs={{
  googleDrive: {
    google_api_key: <KEY_NAME_IN_ENV_FILE>,
    google_app_id: <KEY_NAME_IN_ENV_FILE>,
    google_client_id: <KEY_NAME_IN_ENV_FILE>
  },
  oneDrive: {
    onedrive_client_id: <KEY_NAME_IN_ENV_FILE>,
  }
}}
```

:::note
For Next.js, don't forget to add the `NEXT_PUBLIC_` before the environment variable name. For instance: `GOOGLE_API_KEY` will now become `NEXT_PUBLIC_GOOGLE_API_KEY`
:::

## `limit`

Maximum number of files allowed for upload. When using [`mini`](#mini) mode, this is automatically set to 1.

:::note
Files beyond the limit will trigger [`onWarn`](/docs/api-reference/upupuploader/event-handlers.md#onwarn) callback with a message:"Allowed limit has been surpassed!"
:::

## `maxFileSize`

Maximum allowed file size configuration. Files exceeding this size will be rejected and trigger [`onError`](/docs/api-reference/upupuploader/event-handlers.md#onerror).

**Supported units:** `"B"`, `"KB"`, `"MB"`, `"GB"`

## `maxRetries`

Number of times to automatically retry a failed file upload before marking it as failed. Each file is retried independently.

When `maxRetries` is set, the component silently retries failed uploads up to the specified number of times. When omitted (the default), no automatic retries occur and a manual **"Retry Upload"** button is shown to the user on failure instead.

```tsx
import { UpupUploader, UpupProvider } from "upup-react-file-uploader";
import 'upup-react-file-uploader/styles'

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.AWS}
      tokenEndpoint="/api/upload-token"
      maxRetries={3} // Retry each failed file up to 3 times
    />
  );
}
```

:::note
When `maxRetries` is set, the manual "Retry Upload" button is hidden since retries are handled automatically. If all retry attempts are exhausted, the upload is marked as failed and the [`onError`](/docs/api-reference/upupuploader/event-handlers.md#onerror) callback is triggered.
:::

:::tip
A value of `3` is a good starting point for most use cases. Increase it for unreliable network conditions, or omit it entirely if you prefer users to manually decide when to retry.
:::

## `mini`

Enables compact mode for the uploader component. When enabled:

- Limits file selection to 1 file (overrides [`limit`](#limit) prop)
- Uses smaller container dimensions
- Simplifies UI elements

## `resumable`

Enables resumable multipart uploads for large files. When configured, files are split into chunks and uploaded individually, allowing uploads to survive page refreshes and network interruptions.

```tsx
import { UpupUploader, UpupProvider } from "upup-react-file-uploader";
import 'upup-react-file-uploader/styles'

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.AWS}
      tokenEndpoint="/api/upload-token"
      resumable={{ mode: "multipart" }}
    />
  );
}
```

**Configuration options:**

```typescript
type ResumableUploadOptions = {
  mode: "multipart";
  /** Part size in bytes. Minimum 5 MiB, clamped automatically. */
  chunkSizeBytes?: number;
  /** Persist sessions in localStorage for cross-refresh resume. Default: true */
  persist?: boolean;
};
```

| Option           | Type    | Default | Description                                                                               |
| ---------------- | ------- | ------- | ----------------------------------------------------------------------------------------- |
| `mode`           | string  | -       | Must be `"multipart"`. (`"tus"` is reserved for future use.)                            |
| `chunkSizeBytes` | number  | auto    | Override the part size. Minimum 5 MiB. Auto-computed based on file size if omitted.       |
| `persist`        | boolean | `true`  | Save upload sessions to `localStorage` so uploads survive page refreshes.                 |

:::info
Resumable uploads require additional server-side setup. Your `tokenEndpoint` must handle the multipart actions (`multipart:init`, `multipart:signPart`, `multipart:listParts`, `multipart:complete`, `multipart:abort`).

See the full [Resumable Uploads guide](/docs/resumable-uploads.md) for server setup instructions and code examples.
:::

:::note
Resumable uploads are only supported for S3-compatible providers (AWS, BackBlaze, DigitalOcean). Azure uploads always use a single PUT request regardless of this setting.
:::

## `uploadAdapters`

Array of enabled upload methods.

:::info
When using TypeScript, you must use the `UploadAdapter` enum value exported from the package to avoid type errors:

**Example:**

```javascript
import { UpupUploader, UploadAdapter } from "upup-react-file-uploader";
import 'upup-react-file-uploader/styles'

// Correct usage with enum
<UpupUploader
  uploadAdapters={[UploadAdapter.INTERNAL, UploadAdapter.GOOGLE_DRIVE]}
/>

// ❌ Incorrect string usage
<UpupUploader uploadAdapters={["INTERNAL", "GOOGLE_DRIVE"]} />
```

The component will validate against these enum values and throw an error if invalid values are passed.
:::

:::note
The order of the upload adapters in the array determines the display order in the UI
:::

## `customProps`

An object for custom values that you want to pass to the [`tokenEndpoint`](/docs/api-reference/upupuploader/required-props.md). For example:

```tsx
import { UpupUploader, UpupProvider } from "upup-react-file-uploader";
import 'upup-react-file-uploader/styles'

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.AWS} // assuming we are uploading to AWS
      tokenEndpoint="http://<path_to_your_server>/api/upload-token" // Path to your server route that calls our exported upload utilities
      customProps={{ customValue: "hello world" }}
    />
  );
}
```

```ts
import { s3GeneratePresignedUrl } from "upup-react-file-uploader/server";

app.post("/api/upload-token", async (req, res) => {
  try {
    const { provider, customProps, ...fileParams } = req.body; // The request body sent from the `UpupUploader` client component
    const { customValue } = customProps;

    // ...Rest of code
  } catch (error) {
    return res.status(500).json({
      message: (error as Error).message,
      error: true,
    });
  }
});
```

## `enableAutoCorsConfig`

Controls automatic CORS configuration for S3-compatible providers.

> `false` by default

For example:

```tsx
import { UpupUploader, UpupProvider } from "upup-react-file-uploader";
import 'upup-react-file-uploader/styles'

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.AWS} // assuming we are uploading to AWS
      tokenEndpoint="http://<path_to_your_server>/api/upload-token" // Path to your server route that calls our exported upload utilities
      customProps={{ customValue: "hello world" }}
      enableAutoCorsConfig
    />
  );
}
```

```ts
import { s3GeneratePresignedUrl } from "upup-react-file-uploader/server";

app.post("/api/upload-token", async (req, res) => {
  try {
    const { provider, customProps, enableAutoCorsConfig, ...fileParams } =
      req.body; // The request body sent from the `UpupUploader` client component
    const { customValue } = customProps;

    // Generate presigned URL
    const presignedData = await s3GeneratePresignedUrl({
      origin: origin as string,
      provider,
      fileParams,
      bucketName: process.env.AWS_BUCKET_NAME as string,
      s3ClientConfig: {
        region: process.env.AWS_REGION as string,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        },
      },
      enableAutoCorsConfig,
    });

    // ...Rest of code
  } catch (error) {
    return res.status(500).json({
      message: (error as Error).message,
      error: true,
    });
  }
});
```

:::info
For more information on this, see these [docs](/docs/credentials-configuration.md#server-side-configurations)
:::
