# @useupup/vanilla

Framework-free file uploader (built on lit-html) with cloud-drive sources (Google
Drive, OneDrive, Dropbox, Box), resumable uploads, theming, and ICU i18n. A native
port of the canonical [upup](https://github.com/DevinoSolutions/upup) React UI,
DOM-identical to it — no framework required. Mount it into any DOM element.

## Install

```sh
npm i @useupup/vanilla
```

## Usage (Client Mode)

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived upload credentials at `uploadEndpoint`.

```ts
import { createUploader } from '@useupup/vanilla'
import '@useupup/vanilla/styles'

const uploader = createUploader('#uploader', {
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
    onFileUploadComplete: (file, key) =>
        console.log('Uploaded', file.name, 'to', key),
})
```

`createUploader(target, options)` accepts a CSS selector string or an
`HTMLElement`. `uploadEndpoint` is your own route returning a presigned upload
URL — see the quickstart for a ready-made handler.

## Custom element

A `<upup-uploader>` custom element is also published. Importing
`@useupup/vanilla/element` registers it, after which you can use it declaratively in
HTML:

```ts
import '@useupup/vanilla/element'
```

## Server Mode

For credential isolation and server-proxied cloud drives, add
[`@useupup/server`](https://www.npmjs.com/package/@useupup/server) and set the mode:

```ts
createUploader('#uploader', {
    mode: 'server',
    serverUrl: '/api/upup',
    provider: 'aws',
})
```

## Also exported

`FileSource`, `StorageProvider`, and `UploadStatus`.

## Links

- [Vanilla quickstart](https://useupup.com/documentation/quickstarts/vanilla)
- [Documentation](https://useupup.com/documentation/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
