---
sidebar_position: 5
---

# Optional Props

These optional props are not required for the UpupUploader component to work.

| Prop                                          | Example                                                                                            | Type                 | Status   | Default Value                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------- | -------- | ---------------------------------------------- |
| [accept](#accept)                             | `accept="image/png"`                                                                               | string               | optional | `*`                                            |
| [dark](#dark)                                 | `dark={true}`                                                                                      | boolean              | optional | `false`                                        |
| [driveConfigs](#driveconfigs)                 | `driveConfigs={{ oneDrive: { onedrive_client_id: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID! } }}` | object               | optional | -                                              |
| [imageEditor](#imageeditor)                   | `imageEditor={true}`                                                                               | `boolean \| ImageEditorOptions` | optional | `false`                        |
| [limit](#limit)                               | `limit={5}`                                                                                        | number               | optional | `1`                                            |
| [localePack](#localepack)                             | `localePack={ja_JP}`                                                                                   | `Translations`       | optional | `en_US`                                        |
| [maxFileSize](#maxfilesize)                   | `maxFileSize={{ size: 20, unit: "MB" }}`                                                           | object               | optional | `{ size: 10, unit: "MB" }`                     |
| [mini](#mini)                                 | `mini={true}`                                                                                      | boolean              | optional | `false`                                        |
| [translations](#translations)                | `translations={{ browseFiles: "pick files" }}`                                                     | `Partial<Translations>` | optional | -                                              |
| [uploadAdapters](#uploadadapters)             | `uploadAdapters={[UploadAdapter.LINK]}`                                                            | `UploadAdapter[]`    | optional | `[UploadAdapter.INTERNAL, UploadAdapter.LINK]` |
| [enableAutoCorsConfig](#enableautocorsconfig) | `enableAutoCorsConfig={false}`                                                                     | boolean              | optional | `false`                                        |

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

## `imageEditor`

Enables the built-in image editor. Set to `true` for defaults or pass an `ImageEditorOptions` object for advanced behavior.

See [Image Editor](/docs/api-reference/upupuploader/image-editor) for full configuration.

## `limit`

Maximum number of files allowed for upload. When using [`mini`](#mini) mode, this is automatically set to 1.

:::note
Files beyond the limit will trigger [`onWarn`](/docs/api-reference/upupuploader/event-handlers.md#onwarn) callback with a message:"Allowed limit has been surpassed!"
:::

## `localePack`

A complete locale object that replaces the default English strings. Import a built-in locale from `upup-react-file-uploader/locales` and pass it as `localePack`:

```tsx
import { ja_JP } from 'upup-react-file-uploader/locales'

<UpupUploader localePack={ja_JP} />
```

Available locales: `en_US`, `ar_SA`, `de_DE`, `es_ES`, `fr_FR`, `ja_JP`, `ko_KR`, `zh_CN`, `zh_TW`.

See [Localization](/docs/localization) for full details, interpolation, and custom locale authoring.

## `maxFileSize`

Maximum allowed file size configuration. Files exceeding this size will be rejected and trigger [`onError`](/docs/api-reference/upupuploader/event-handlers.md#onerror).

**Supported units:** `"B"`, `"KB"`, `"MB"`, `"GB"`

## `mini`

Enables compact mode for the uploader component. When enabled:

- Limits file selection to 1 file (overrides [`limit`](#limit) prop)
- Uses smaller container dimensions
- Simplifies UI elements

## `translations`

Partial overrides for individual translation keys. These are merged on top of the active [`localePack`](#localepack) (or the default `en_US`):

```tsx
<UpupUploader
  translations={{
    browseFiles: 'pick files',
    addMore: 'Select more',
  }}
/>
```

You can combine `localePack` and `translations` — the overrides take priority:

```tsx
import { fr_FR } from 'upup-react-file-uploader/locales'

<UpupUploader
  localePack={fr_FR}
  translations={{ browseFiles: 'choisir des fichiers' }}
/>
```

See [Localization](/docs/localization) for the full list of keys, interpolation, and pluralization.

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
