# @useupup/core

The headless engine behind [upup](https://github.com/DevinoSolutions/upup): file
state and upload orchestration, the upload pipeline (image compression, HEIC
decode, web-worker offload), cloud-drive plugins (Google Drive, OneDrive,
Dropbox, Box), theming, and ICU i18n. It has **zero framework dependencies** and
powers every `@useupup/*` UI package.

## Install

Most consumers should install a framework package instead —
[`@useupup/react`](https://www.npmjs.com/package/@useupup/react), `@useupup/vue`,
`@useupup/svelte`, `@useupup/angular`, `@useupup/vanilla`, or `@useupup/preact` — which bundle
this engine and render a ready-made UI. Install `@useupup/core` directly only to
drive uploads headlessly or to build your own UI binding.

```sh
npm i @useupup/core
```

## Headless usage

```ts
import { UpupCore } from '@useupup/core'

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
import { UpupError, UpupErrorCode } from '@useupup/core'

function isRetryable(err: unknown): boolean {
    return err instanceof UpupError && err.code === UpupErrorCode.NETWORK_ERROR
}
```

`StorageProvider` enumerates the supported storage providers
(`StorageProvider.AWS`, `StorageProvider.CloudflareR2`, `StorageProvider.MinIO`,
and more).

## Entry points

The main `@useupup/core` entry is a curated allow-list of stable exports (the
`UpupCore` engine, the drive plugins, the `UpupError` taxonomy — `UpupError`
plus its typed subclasses and the `UpupErrorCode` enum — the locale bundles, and
the theme presets). Advanced, deep-import-only subpaths are also published:

- `@useupup/core/internal` — implementation internals (managers, orchestrator, controllers)
- `@useupup/core/contracts`, `@useupup/core/i18n`, `@useupup/core/theme`, `@useupup/core/strategies`
- `@useupup/core/pipeline` and `@useupup/core/steps/*` (`hash`, `heic`, `exif`, `compress`, `thumbnail`)

Heavy capabilities (HEIC decode, resumable/tus uploads) load lazily via these
subpaths, so they never weigh down the main entry.

## Links

- [Documentation](https://useupup.com/documentation/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
