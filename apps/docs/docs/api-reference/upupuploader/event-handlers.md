---
sidebar_position: 3
---

# Event Handlers

These callback props allow you to hook into key moments of the file(s) selection and upload lifecycle. All handlers are optional, but provide granular control over the upload operation.

:::tip
For programmatic control of the upload process, you can also use the [Ref API](/docs/api-reference/upupuploader/ref-api.md) which provides a `useUpload` method to access upload state and trigger uploads from parent components.
:::

| Prop | Example | Type | Status | Default Value |
| ---  | ------- | ---- | ------ | ------------- |
| [onError](#onerror) | `onError={(errorMessage) => action()}` | function | optional | [`toast.error`](https://fkhadra.github.io/react-toastify/api/toast) |
| [onFileClick](#onfileclick) | `onFileClick={file => action()}` | function | optional | - |
| [onFileRemove](#onfileremove) | `onFileRemove={file => action()}` | function | optional | - |
| [onFileTypeMismatch](#onfiletypemismatch) | `onFileTypeMismatch={(file, acceptedTypes) => action()}` | function | optional | - |
| [onFileUploadComplete](#onfileuploadcomplete) | `onFileUploadComplete={(file, key) => action()}` | function | optional | - |
| [onFileUploadProgress](#onfileuploadprogress) | `onFileUploadProgress={(file, progress) => action()}` | function | optional | - |
| [onFileUploadStart](#onfileuploadstart) | `onFileUploadStart={file => action()}` | function | optional | - |
| [onFilesDragLeave](#onfilesdragleave) | `onFilesDragLeave={files => action()}` | function | optional | - |
| [onFilesDragOver](#onfilesdragover) | `onFilesDragOver={files => action()}` | function | optional | - |
| [onFilesDrop](#onfilesdrop) | `onFilesDrop={files => action()}` | function | optional | - |
| [onFilesUploadComplete](#onfilesuploadcomplete) | `onFilesUploadComplete={keys => action()}` | function | optional | - |
| [onFilesUploadProgress](#onfilesuploadprogress) | `onFilesUploadProgress={(completedFiles, totalFiles) => action()}` | function | optional | - |
| [onFilesSelected](#onfilesselected) | `onFilesSelected={files => action()}` | function | optional | - |
| [onIntegrationClick](#onintegrationclick) | `onIntegrationClick={integrationType => action()}` | function | optional | - |
| [onPrepareFiles](#onpreparefiles) | `onPrepareFiles={files => action()}` | function | optional | - |
| [onWarn](#onwarn) | `onWarn={warningMessage => action()}` | function | optional | [`toast.warn`](https://fkhadra.github.io/react-toastify/api/toast) |

<!-- ## onCancelUpload

Handles cancellation of active uploads. Receives array of in-progress files with metadata including:

- `id`: Unique file identifier
- `url`: Temporary preview URL
- Original File object properties

**Use case**: Clean up temporary storage or track abandoned uploads -->

## `onError`

Global error handler for critical failures:

- Invalid credentials
- Network errors
- Storage provider API failures
- File validation errors

**Default**: Displays error toast using [`react-toastify`](https://fkhadra.github.io/react-toastify)

## `onFileClick`

Triggered when users click any file in the selection list. The received [`FileWithParams`](#filewithparams) contains:

- `id`: Unique UUIDv4
- `url`: Object URL for previews
- `thumbnailLink`: Cloud storage preview URLs (when available)

**Example use**: Implement analytics tracking

## `onFileRemove`

Post-removal hook after file is deleted from selection. The parameter includes:

- Original file metadata
- Upload progress status
- Any custom properties added in [`onPrepareFiles`](#onpreparefiles)

:::note
This event is Called after internal state update
:::

## `onFileTypeMismatch`

Validates against the [`accept`](/docs/api-reference/upupuploader/optional-props.md#accept) prop (e.g., `image/*`, `.pdf`). Parameters:

1. Offending File object
2. Comma-separated list of accepted types

:::tip
 Use together with [`onError`](#onerror) to implement custom validation workflows
 :::

## `onFileUploadComplete`

Fires per-file when successfully uploaded to storage. Provides:

- `file`: Final processed file object
- `key`: Permanent storage identifier (e.g., S3 object key)

:::note
 Keys are provider-specific and URL-encoded
 :::

## `onFileUploadProgress`

Real-time updates for active uploads. Receives:

- `file`: File being uploaded with metadata
- `progress`: Object containing:
  - `loaded`: Bytes transferred
  - `total`: Total file size in bytes
  - `percentage`: Calculated progress (0-100)

**Example use**: Update custom progress indicators or track transfer speeds

## `onFileUploadStart`

Triggered when a file begins uploading. Ideal for:

- Initializing per-file upload tracking
- Resetting previous upload states
- Adding custom metadata to file object

:::note
This event is called before any chunking or compression occurs
:::

## `onFilesDragLeave`

Signals exit from drop zone. Useful for:

- Resetting UI drag states
- Cleaning up temporary validation
- Tracking abandonment metrics

:::note
This event may fire multiple times during complex drag operations
:::

## `onFilesDragOver`

Detects files dragged over drop zone. Use to:

- Activate visual drop targets
- Validate files before drop
- Implement custom drag-layer previews

**UI pattern**: Typically used with opacity changes or highlight effects

## `onFilesDrop`

Final handler for validated drops. Receives:

- Raw File objects from dataTransfer
- Maintains original file metadata

:::note
The files received in this event haven't been processed/compressed yet
:::

## `onFilesUploadComplete`

Batch completion handler. Provides:

- `keys`: Array of storage identifiers in upload order
- Keys correspond to final processed files

**Typical use**: Update database records with stored file locations

## `onFilesUploadProgress`

Aggregate progress across all files. Parameters:

- `completedFiles`: Number of finished uploads
- `totalFiles`: Total files in batch

**Example**: "3/5 files uploaded" status messages

## `onFilesSelected`

Initial selection handler. Receives:

- Raw File objects from input or drag-drop
- Before compression/preparation hooks

**Use case**: Early validation or metadata injection

## `onIntegrationClick`

Cloud provider selection handler. Returns:

- `integrationType`: One of [`UploadAdapter`](/docs/api-reference/upupuploader/optional-props.md#uploadadapters) enum values

**Typical use**: Analytics tracking or provider-specific UI

## `onPrepareFiles`

Final pre-upload hook. Must return:

- Modified [`FileWithParams`](#filewithparams) array
- Processed files ready for upload

**Common transformations**:

- Metadata tagging
- File renaming
- Size validation
- Thumbnail generation

:::note
This event supports async operations
:::

## `onWarn`

Non-critical notifications including:

- Duplicate file detection
- Empty folder selections
- Partial cloud storage failures
- Near-quota warnings

**Default**: Displays warning toast using [`react-toastify`](https://fkhadra.github.io/react-toastify)

## Custom Event Params

### `FileWithParams`

```typescript
interface FileWithParams extends File {
  id: string
  url: string
  thumbnailLink?: string
  [key: string]: any
}
```

Extended File object with additional metadata used throughout upload lifecycle.

**Properties**:

- `id`: Unique identifier (UUIDv4) generated on file selection
- `url`: Temporary Object URL for previews
- `thumbnailLink`: Cloud provider-generated preview URL (when available)
- Custom properties added in `onPrepareFiles`

**Used in**: [`onFileClick`](#onfileclick), [`onFileRemove`](#onfileremove), [`onFileUploadStart`](#onfileuploadstart), [`onFileUploadComplete`](#onfileuploadcomplete)

---

### `Progress`

```typescript
interface Progress {
  loaded: number  // Bytes transferred
  total: number   // Total file size in bytes
  percentage: number // Calculated completion (0-100)
}
```

Real-time upload metrics provided to progress handlers.  

**Used in**: [`onFileUploadProgress`](#onfileuploadprogress)

---

### `UploadAdapter`

See more info [here](/docs/api-reference/upupuploader/optional-props.md#uploadadapters)

**Used in**: [`onIntegrationClick`](#onintegrationclick)
