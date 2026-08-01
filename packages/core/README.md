# @upupjs/core

The headless engine behind [upup](https://github.com/DevinoSolutions/upup): file
state and upload orchestration, the upload pipeline (image compression, HEIC
decode, web-worker offload), cloud-drive plugins (Google Drive, OneDrive,
Dropbox, Box), theming, and ICU i18n. It has **zero framework dependencies** and
powers every `@upupjs/*` UI package.

## Install

Most consumers should install a framework package instead —
[`@upupjs/react`](https://www.npmjs.com/package/@upupjs/react), `@upupjs/vue`,
`@upupjs/svelte`, `@upupjs/angular`, `@upupjs/vanilla`, or `@upupjs/preact` — which bundle
this engine and render a ready-made UI. Install `@upupjs/core` directly only to
drive uploads headlessly or to build your own UI binding.

```sh
npm i @upupjs/core
```

## Headless usage

```ts
import { UpupCore } from '@upupjs/core'

const core = new UpupCore({
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
})
```

`UpupCore` owns the file/progress state, the upload lifecycle, and the
cloud-drive plugins. See the docs for the full event and method surface.

## Errors

Upload failures are typed. Catch `UpupError` and branch on its stable
`UpupErrorCode`; the concrete subclasses (`UpupValidationError`,
`UpupNetworkError`, `UpupStorageError`, `UpupAuthError`, `UpupQuotaError`,
`UpupConfigError`) let you narrow further.

```ts
import { UpupError, UpupErrorCode } from '@upupjs/core'

function isRetryable(err: unknown): boolean {
    return err instanceof UpupError && err.code === UpupErrorCode.NETWORK_ERROR
}
```

`StorageProvider` enumerates the supported storage providers
(`StorageProvider.AWS`, `StorageProvider.CloudflareR2`, `StorageProvider.MinIO`,
and more).

## Entry points

The main `@upupjs/core` entry is a curated allow-list of stable exports (the
`UpupCore` engine, the drive plugins, the `UpupError` taxonomy — `UpupError`
plus its typed subclasses and the `UpupErrorCode` enum — the locale bundles, and
the theme presets). Advanced, deep-import-only subpaths are also published:

- `@upupjs/core/internal` — implementation internals (managers, orchestrator, controllers)
- `@upupjs/core/contracts`, `@upupjs/core/i18n`, `@upupjs/core/theme`, `@upupjs/core/strategies`
- `@upupjs/core/pipeline` and `@upupjs/core/steps/*` (`hash`, `heic`, `exif`, `compress`, `thumbnail`)

Heavy capabilities (HEIC decode, resumable/tus uploads) load lazily via these
subpaths, so they never weigh down the main entry.

## Links

- [Documentation](https://useupup.com/docs/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
