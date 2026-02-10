---
sidebar_position: 5
---

# Localization (i18n)

Upup has built-in multilingual support with zero additional dependencies. You can use one of the bundled locale packs or provide your own custom translations.

## Built-in Locales

The following locales are included out of the box:

| Locale  | Language              |
| ------- | --------------------- |
| `en_US` | English (default)     |
| `ar_SA` | Arabic (العربية)      |
| `de_DE` | German (Deutsch)      |
| `es_ES` | Spanish (Español)     |
| `fr_FR` | French (Français)     |
| `ja_JP` | Japanese (日本語)      |
| `ko_KR` | Korean (한국어)         |
| `zh_CN` | Chinese Simplified    |
| `zh_TW` | Chinese Traditional   |

## Using a Locale

Import the desired locale from `upup-react-file-uploader/locales` and pass it to the `locale` prop:

```tsx
import { UpupUploader, UpupProvider } from 'upup-react-file-uploader'
import 'upup-react-file-uploader/styles'
import { ja_JP } from 'upup-react-file-uploader/locales'

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.AWS}
      tokenEndpoint="/api/upload-token"
      locale={ja_JP}
    />
  )
}
```

When no `locale` is provided, the component defaults to `en_US` (English).

## Overriding Individual Strings

Use the `translations` prop to override specific keys without replacing the entire locale. Overrides are merged on top of the active locale:

```tsx
import { UpupUploader, UpupProvider } from 'upup-react-file-uploader'
import 'upup-react-file-uploader/styles'
import { fr_FR } from 'upup-react-file-uploader/locales'

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.AWS}
      tokenEndpoint="/api/upload-token"
      locale={fr_FR}
      translations={{
        browseFiles: 'sélectionner des fichiers', // override one key
      }}
    />
  )
}
```

You can also use `translations` without a `locale` to tweak the default English strings:

```tsx
<UpupUploader
  provider={UpupProvider.AWS}
  tokenEndpoint="/api/upload-token"
  translations={{
    addDocumentsHere: 'Drop your images here (max {{limit}} files)',
    browseFiles: 'choose files',
  }}
/>
```

## Interpolation

Some strings contain `{{placeholder}}` variables that are replaced at runtime:

| Placeholder   | Description                                  |
| ------------- | -------------------------------------------- |
| `{{limit}}`   | Maximum number of files allowed              |
| `{{count}}`   | Number of files currently selected           |
| `{{size}}`    | Maximum file size number                     |
| `{{unit}}`    | File size unit (KB, MB, etc.)                |
| `{{side}}`    | Camera side (front / back)                   |
| `{{message}}` | Error message text                           |

**Example:**

```ts
{
  addDocumentsHere: 'Upload up to {{limit}} files',
  filesSelected_other: '{{count}} files ready',
}
```

## Pluralization

Keys that differ between singular and plural use the `_one` and `_other` suffixes:

| Key pattern         | When used        |
| ------------------- | ---------------- |
| `*_one`             | count === 1      |
| `*_other`           | count !== 1      |

For example, the following keys control the upload button text:

```ts
{
  uploadFiles_one: 'Upload {{count}} file',
  uploadFiles_other: 'Upload {{count}} files',
}
```

The component automatically picks the correct variant based on the current count.

## All Translation Keys

Below is the full list of translation keys with their default English values:

| Key | Default Value |
| --- | ------------- |
| `cancel` | Cancel |
| `done` | Done |
| `loading` | Loading... |
| `myDevice` | My Device |
| `googleDrive` | Google Drive |
| `oneDrive` | OneDrive |
| `dropbox` | Dropbox |
| `link` | Link |
| `camera` | Camera |
| `dragFileOr` | Drag your file or |
| `dragFilesOr` | Drag your files or |
| `browseFiles` | browse files |
| `or` | or |
| `selectAFolder` | select a folder |
| `maxFileSizeAllowed_one` | Max \{\{size\}\} \{\{unit\}\} file is allowed |
| `maxFileSizeAllowed_other` | Max \{\{size\}\} \{\{unit\}\} files are allowed |
| `addDocumentsHere` | Add your documents here, you can upload up to \{\{limit\}\} files max |
| `builtBy` | Built by |
| `removeAllFiles` | Remove all files |
| `addingMoreFiles` | Adding more files |
| `filesSelected_one` | \{\{count\}\} file selected |
| `filesSelected_other` | \{\{count\}\} files selected |
| `addMore` | Add More |
| `uploadFiles_one` | Upload \{\{count\}\} file |
| `uploadFiles_other` | Upload \{\{count\}\} files |
| `removeFile` | Remove file |
| `clickToPreview` | Click to preview |
| `zeroBytes` | 0 Byte |
| `bytes` | Bytes |
| `kb` | KB |
| `mb` | MB |
| `gb` | GB |
| `tb` | TB |
| `previewError` | Error: \{\{message\}\} |
| `noAcceptedFilesFound` | No accepted files found |
| `selectThisFolder` | Select this folder |
| `addFiles_one` | Add \{\{count\}\} file |
| `addFiles_other` | Add \{\{count\}\} files |
| `logOut` | Log out |
| `search` | Search |
| `enterFileUrl` | Enter file url |
| `fetch` | Fetch |
| `capture` | Capture |
| `switchToCamera` | switch to \{\{side\}\} |
| `addImage` | Add Image |
| `front` | front |
| `back` | back |
| `poweredBy` | Powered by |

## Contributing a New Locale

To add a new locale:

1. Create a new file in `packages/upup/src/shared/i18n/locales/` (e.g., `pt_BR.ts`)
2. Import the `Translations` type and export a constant satisfying it:

```ts
import type { Translations } from '../types'

export const pt_BR: Translations = {
  cancel: 'Cancelar',
  done: 'Concluído',
  // ... all other keys
}
```

3. Re-export it from `packages/upup/src/shared/i18n/locales/index.ts`:

```ts
export { pt_BR } from './pt_BR'
```

4. Since `Translations` is a complete type, TypeScript will ensure you don't miss any keys.
