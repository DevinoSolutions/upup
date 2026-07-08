# @upup/core

The headless engine behind [upup](https://github.com/DevinoSolutions/upup): file
state and upload orchestration, the upload pipeline (image compression, HEIC
decode, web-worker offload), cloud-drive plugins (Google Drive, OneDrive,
Dropbox, Box), theming, and ICU i18n. It has **zero framework dependencies** and
powers every `@upup/*` UI package.

## Install

Most consumers should install a framework package instead —
[`@upup/react`](https://www.npmjs.com/package/@upup/react), `@upup/vue`,
`@upup/svelte`, `@upup/angular`, `@upup/vanilla`, or `@upup/preact` — which bundle
this engine and render a ready-made UI. Install `@upup/core` directly only to
drive uploads headlessly or to build your own UI binding.

```sh
npm i @upup/core
```

## Headless usage

```ts
import { UpupCore } from '@upup/core'

const core = new UpupCore({
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
})
```

`UpupCore` owns the file/progress state, the upload lifecycle, and the
cloud-drive plugins. See the docs for the full event and method surface.

## Entry points

The main `@upup/core` entry is a curated allow-list of stable exports (the
`UpupCore` engine, the drive plugins, the `UploadError` taxonomy, the locale
bundles, and the theme presets). Advanced, deep-import-only subpaths are also
published:

- `@upup/core/internal` — implementation internals (managers, orchestrator, controllers)
- `@upup/core/contracts`, `@upup/core/i18n`, `@upup/core/theme`, `@upup/core/strategies`
- `@upup/core/pipeline` and `@upup/core/steps/*` (`hash`, `heic`, `exif`, `compress`, `thumbnail`)

Heavy capabilities (HEIC decode, resumable/tus uploads) load lazily via these
subpaths, so they never weigh down the main entry.

## Links

- Documentation: <https://useupup.com/documentation/docs/getting-started>
- Monorepo & source: <https://github.com/DevinoSolutions/upup>

## License

MIT
