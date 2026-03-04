---
sidebar_position: 6
---

# Image Editor

The optional **Image Editor** integration lets users crop, rotate, resize, apply filters and annotate images before uploading — powered by [Filerobot Image Editor](https://github.com/scaleflex/filerobot-image-editor).

> The editor is **lazy-loaded** at runtime, so your bundle stays small when the feature is disabled.

## Installation

Install the editor as an additional dependency alongside the uploader:

```bash
# npm
npm install react-filerobot-image-editor

# pnpm
pnpm add react-filerobot-image-editor

# yarn
yarn add react-filerobot-image-editor
```

## Quick start

Pass `imageEditor` to enable the feature with defaults:

```tsx
<UpupUploader
  imageEditor
  provider={UpupProvider.AWS}
  tokenEndpoint="/api/upload"
/>
```

Once enabled, a pencil ✏️ button appears on every image thumbnail. Clicking it opens a full-screen editor. After editing, the updated image replaces the original in the file list.

## Configuration

`imageEditor` accepts either a **boolean** or an **`ImageEditorOptions`** object:

| Option       | Type                                          | Default     | Description                                                                                          |
| ------------ | --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `enabled`    | `boolean`                                     | `false`     | Master switch.                                                                                       |
| `autoOpen`   | `'never' \| 'single' \| 'always'`             | `'never'`   | `'single'` opens the editor automatically when exactly one image is selected. `'always'` opens for every image. |
| `output`     | `{ mimeType?: string; quality?: number; fileName?: (file) => string }` | —      | Control the saved image format, quality (0–1), and file name.                              |
| `tabs`       | `string[]`                                    | all tabs    | Restrict visible tabs (e.g. `[TABS.ADJUST, TABS.FILTERS]`).                                         |
| `tools`      | `string[]`                                    | all tools   | Restrict available tools.                                                                            |
| `onOpen`     | `(file: FileWithParams) => void`              | —           | Callback fired when the editor opens.                                                                |
| `onCancel`   | `(file: FileWithParams) => void`              | —           | Callback fired when the user cancels editing.                                                        |
| `onSave`     | `(original: FileWithParams, edited: FileWithParams) => void` | — | Callback fired after saving. Receives both the original and the new file.                  |

### Example with custom options

```tsx
import { UpupUploader, UpupProvider, ImageEditorOptions } from 'upup-react-file-uploader'

const editorConfig: ImageEditorOptions = {
  enabled: true,
  autoOpen: 'single',
  output: {
    mimeType: 'image/webp',
    quality: 0.85,
    fileName: (file) => `edited-${file.name}`,
  },
  onSave: (original, edited) => {
    console.log('Replaced', original.name, '→', edited.name)
  },
}

function App() {
  return (
    <UpupUploader
      imageEditor={editorConfig}
      provider={UpupProvider.AWS}
      tokenEndpoint="/api/upload"
    />
  )
}
```

## How it works

1. **User selects files** — images are added to the file list as usual.
2. **Edit button** — a pencil icon appears on each image thumbnail when the editor is enabled.
3. **Editor opens** — the Filerobot Image Editor loads in a full-screen modal portal.
4. **Save** — the edited image replaces the original in the file list (same internal `id`, fresh blob URL).
5. **Upload** — the upload pipeline sends the edited version to your cloud provider.

### Auto-open behaviour

| `autoOpen` value | Behaviour                                                  |
| ---------------- | ---------------------------------------------------------- |
| `'never'`        | Users must click the edit button manually (default).       |
| `'single'`       | The editor opens automatically when exactly one image is selected. |
| `'always'`       | The editor opens automatically for every selected image, one at a time. |

## Bundle impact

The editor is **not** bundled with `upup-react-file-uploader`. It is listed as an **optional peer dependency** and loaded via a dynamic `import()` only when a user opens the editor for the first time. If `react-filerobot-image-editor` is not installed, the uploader works normally without the edit button.
