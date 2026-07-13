---
title: Localization (i18n)
sidebar_position: 5
description: upup ships nine ICU locale bundles from @useupup/core/i18n — set the locale on any framework's uploader, override individual namespaced message keys, and get automatic RTL and pluralization.
---

# Localization (i18n)

upup uses ICU locale bundles from `@useupup/core/i18n`. Messages are grouped
into namespaces, formatted with ICU MessageFormat (so plurals and interpolation
work in every language), and Arabic switches the layout to right-to-left
automatically.

## Built-in locales

<!-- Table generated from LOCALE_CODES (packages/core/src/i18n/locales/registry.ts); keep in sync. -->

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

## Using a locale

Pass a bundle to `i18n.locale`:

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

## The `i18n` prop

The `i18n` object accepts four fields, all optional:

```ts
i18n?: {
    /** A locale bundle. Takes precedence over `locale`. */
    bundle?: LocaleBundle
    /** A locale bundle, or a BCP-47 code string (e.g. 'fr-FR') for lang/dir. */
    locale?: LocaleBundle | string
    /** Bundle/code used when the active locale is missing a key. */
    fallbackLocale?: LocaleBundle | string
    /** Per-key overrides merged on top of the locale. */
    overrides?: PartialMessages
}
```

- Pass a full bundle (like `jaJP`) to **`locale`** — that is the field to reach
  for. **`bundle`** exists for when you construct a bundle object yourself and
  want it to take precedence: if both are set, `bundle` wins.
- A **string** code (`'fr-FR'`) is resolved from the registry; an unregistered
  code falls back to English for content but still sets the language/direction.
- **`fallbackLocale`** supplies missing keys (defaults to English).

## Overrides

Use `i18n.overrides` for small copy changes. Overrides are a `PartialMessages`
object — **keyed by namespace**, then by the message key inside it. `browseFiles`,
for example, lives under the `dropzone` namespace:

```tsx
import { frFR } from '@useupup/core/i18n'

;<UpupUploader
    i18n={{
        locale: frFR,
        overrides: {
            dropzone: { browseFiles: 'choisir des fichiers' },
            common: { cancel: 'annuler' },
        },
    }}
/>
```

## Message structure

Every message belongs to a namespace, and every value uses ICU MessageFormat.
The namespaces are `common`, `sources`, `dropzone`, `header`, `fileList`,
`filePreview`, `driveBrowser`, `url`, `camera`, `audio`, `screenCapture`,
`branding`, and `errors`. A few real keys:

```ts
{
  common:   { cancel: 'Cancel', done: 'Done' },
  sources:  { myDevice: 'My Device', googleDrive: 'Google Drive', oneDrive: 'OneDrive' },
  dropzone: {
    browseFiles: 'browse files',
    // ICU interpolation:
    addDocumentsHere: 'Add your documents here, you can upload up to {limit} files max',
  },
  fileList: {
    // ICU pluralization:
    uploadFiles: 'Upload {count, plural, one {# file} other {# files}}',
  },
}
```

Your `overrides` follow this same namespaced shape, so you can retranslate or
tweak any single key without shipping a whole bundle.

## Setting the locale per framework

The `i18n` prop is shared across every framework — it is part of the common
uploader props. Only the binding syntax differs:

| Framework  | How to pass it                                            |
| ---------- | --------------------------------------------------------- |
| React      | `<UpupUploader i18n={{ locale: jaJP }} />`                |
| Vue        | `<UpupUploader :i18n="{ locale: jaJP }" />`               |
| Svelte     | `<UpupUploader i18n={{ locale: jaJP }} />`                |
| Angular    | `<upup-uploader [config]="{ i18n: { locale: jaJP } }" />` |
| Vanilla JS | `createUploader('#el', { i18n: { locale: jaJP } })`       |

Preact re-exports `@useupup/react`, so its uploader takes the same `i18n` prop
as the React row.

In the [headless](./guides/headless.md) path — `useUpupUpload` or `UpupCore` —
there is no `i18n` wrapper; set the engine's flat `locale` option to a bundle
or code instead (`useUpupUpload({ locale: jaJP })`). It also drives the
translator available to pipeline steps.

## Adding a locale

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

## Next steps

- [Theming](./guides/theming.md) — restyle the components whose copy you just
  localized.
- [Headless Usage](./guides/headless.md) — set the `locale` option on the engine
  when you build your own UI.
