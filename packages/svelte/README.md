# @upupjs/svelte

Svelte 5 file uploader with cloud-drive sources (Google Drive, OneDrive, Dropbox,
Box), resumable uploads, theming, and ICU i18n. A native port of the canonical
[upup](https://github.com/DevinoSolutions/upup) React UI, DOM-identical to it.

Requires Svelte 5 (`svelte` is a peer dependency).

## Install

```sh
npm i @upupjs/svelte
```

## Usage (Client Mode)

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived upload credentials at `uploadEndpoint`.

```svelte
<script lang="ts">
    import { UpupUploader } from '@upupjs/svelte'
    import '@upupjs/svelte/styles'
</script>

<UpupUploader
    provider="aws"
    uploadEndpoint="/api/upload-token"
    onFileUploadComplete={(file, key) => console.log('Uploaded', file.name, 'to', key)}
/>
```

The stylesheet is a separate import so projects without Tailwind get the same
look. `uploadEndpoint` is your own route returning a presigned upload URL — see
the quickstart for a ready-made handler.

## Server Mode

For credential isolation and server-proxied cloud drives, add
[`@upupjs/server`](https://www.npmjs.com/package/@upupjs/server) and point the
uploader at it:

```svelte
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

## Also exported

`toReadable` (adapts an uploader store to a Svelte readable), the `use*` uploader
helpers, and the `FileSource`, `StorageProvider`, and `UploadStatus` enums.

## Links

- [Svelte quickstart](https://useupup.com/docs/quickstarts/svelte)
- [Documentation](https://useupup.com/docs/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
