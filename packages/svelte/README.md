# @upup/svelte

Svelte 5 file uploader with cloud-drive sources (Google Drive, OneDrive, Dropbox,
Box), resumable uploads, theming, and ICU i18n. A native port of the canonical
[upup](https://github.com/DevinoSolutions/upup) React UI, DOM-identical to it.

Requires Svelte 5 (`svelte` is a peer dependency).

## Install

```sh
npm i @upup/svelte
```

## Usage (Client Mode)

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived upload credentials at `uploadEndpoint`.

```svelte
<script lang="ts">
    import { UpupUploader } from '@upup/svelte'
    import '@upup/svelte/styles'
</script>

<UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
```

The stylesheet is a separate import so projects without Tailwind get the same
look.

## Server Mode

For credential isolation and server-proxied cloud drives, add
[`@upup/server`](https://www.npmjs.com/package/@upup/server) and point the
uploader at it:

```svelte
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

## Also exported

`toReadable` (adapts an uploader store to a Svelte readable), the `use*` uploader
helpers, and the `FileSource`, `StorageProvider`, and `UploadStatus` enums.

## Links

- Documentation: <https://useupup.com/documentation/docs/getting-started>
- Monorepo & source: <https://github.com/DevinoSolutions/upup>

## License

MIT
