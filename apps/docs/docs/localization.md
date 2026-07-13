---
sidebar_position: 5
---

# Localization (i18n)

Upup uses ICU locale bundles from `@useupup/core/i18n`.

## Built-in Locales

This table is generated from `LOCALE_CODES` (`packages/core/src/i18n/locales/registry.ts`) — the single source of truth for supported locales. Keep it in sync when the registry changes.

| Export | Locale  | Direction |
| ------ | ------- | --------- |
| `enUS` | `en-US` | `ltr`     |
| `arSA` | `ar-SA` | `rtl`     |
| `deDE` | `de-DE` | `ltr`     |
| `esES` | `es-ES` | `ltr`     |
| `frFR` | `fr-FR` | `ltr`     |
| `jaJP` | `ja-JP` | `ltr`     |
| `koKR` | `ko-KR` | `ltr`     |
| `zhCN` | `zh-CN` | `ltr`     |
| `zhTW` | `zh-TW` | `ltr`     |

## Using a Locale

```tsx
import { UpupUploader } from '@useupup/react'
import '@useupup/react/styles'
import { jaJP } from '@useupup/core/i18n'

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
import { arSA } from '@useupup/core/i18n'

;<UpupUploader i18n={{ locale: arSA }} />
```

## Overrides

Use `i18n.overrides` for small copy changes.

```tsx
import { frFR } from '@useupup/core/i18n'

;<UpupUploader
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

## Adding a Locale

Supported locales live behind one compiler-checked registry
(`packages/core/src/i18n/locales/registry.ts`), so contributing a new one is
a 2-file change:

1. Create `packages/core/src/i18n/locales/<code>.ts` (e.g. `pt-BR.ts`)
   exporting a `LocaleBundle` — copy the closest existing bundle as a
   starting point and set its `code`, `language`, and `dir`.
2. In `registry.ts`, add the import, add the code to the `LOCALE_CODES`
   tuple, add the bundle to the `LOCALE_REGISTRY` map, and add the
   identifier to the re-export line.

Everything else — `LOCALE_META`, the `UpupLocaleCode` type, both i18n
barrel exports, and the locale test fixtures — derives from the registry
automatically. The `Record<RegisteredLocaleCode, LocaleBundle>` type
annotation on `LOCALE_REGISTRY` makes the compiler reject a code that's
missing its bundle or a bundle that's missing its code, and
`locale-registry.test.ts` asserts every bundle file under `locales/` is
actually registered (the one thing the compiler can't see on its own).
