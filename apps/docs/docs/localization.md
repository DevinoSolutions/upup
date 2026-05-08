---
sidebar_position: 5
---

# Localization (i18n)

Upup uses ICU locale bundles from `@upup/core/i18n`.

## Built-in Locales

| Export | Locale | Direction |
| --- | --- | --- |
| `enUS` | `en-US` | `ltr` |
| `arSA` | `ar-SA` | `rtl` |
| `deDE` | `de-DE` | `ltr` |
| `esES` | `es-ES` | `ltr` |
| `frFR` | `fr-FR` | `ltr` |
| `jaJP` | `ja-JP` | `ltr` |
| `koKR` | `ko-KR` | `ltr` |
| `zhCN` | `zh-CN` | `ltr` |
| `zhTW` | `zh-TW` | `ltr` |

## Using a Locale

```tsx
import { UpupUploader } from '@upup/react'
import '@upup/react/styles'
import { jaJP } from '@upup/core/i18n'

export default function Uploader() {
  return (
    <UpupUploader
      uploadEndpoint="/api/upload-token"
      i18n={{ locale: jaJP }}
    />
  )
}
```

Arabic automatically sets right-to-left layout:

```tsx
import { arSA } from '@upup/core/i18n'

<UpupUploader i18n={{ locale: arSA }} />
```

## Overrides

Use `i18n.overrides` for small copy changes.

```tsx
import { frFR } from '@upup/core/i18n'

<UpupUploader
  i18n={{
    locale: frFR,
    overrides: {
      browseFiles: 'choisir des fichiers',
    },
  }}
/>
```

Locale messages use ICU placeholders:

```ts
{
  addDocumentsHere: 'Upload up to {limit} files',
  uploadFiles: 'Upload {count, plural, one {# file} other {# files}}',
}
```
