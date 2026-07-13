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

## Errors

Upload failures are typed. Catch `UpupError` and branch on its stable
`UpupErrorCode`; the concrete subclasses (`UpupValidationError`,
`UpupNetworkError`, `UpupStorageError`, `UpupAuthError`, `UpupQuotaError`,
`UpupConfigError`) let you narrow further.

```ts
import { UpupError, UpupErrorCode } from '@upup/core'

function isRetryable(err: unknown): boolean {
    return err instanceof UpupError && err.code === UpupErrorCode.NETWORK_ERROR
}
```

`StorageProvider` enumerates the supported storage providers
(`StorageProvider.AWS`, `StorageProvider.CloudflareR2`, `StorageProvider.MinIO`,
and more).

## Entry points

The main `@upup/core` entry is a curated allow-list of stable exports (the
`UpupCore` engine, the drive plugins, the `UpupError` taxonomy — `UpupError`
plus its typed subclasses and the `UpupErrorCode` enum — the locale bundles, and
the theme presets). Advanced, deep-import-only subpaths are also published:

- `@upup/core/internal` — implementation internals (managers, orchestrator, controllers)
- `@upup/core/contracts`, `@upup/core/i18n`, `@upup/core/theme`, `@upup/core/strategies`
- `@upup/core/pipeline` and `@upup/core/steps/*` (`hash`, `heic`, `exif`, `compress`, `thumbnail`)

Heavy capabilities (HEIC decode, resumable/tus uploads) load lazily via these
subpaths, so they never weigh down the main entry.

## Links

- [Documentation](https://useupup.com/documentation/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
