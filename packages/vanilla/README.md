# @upup/vanilla

Framework-free file uploader (built on lit-html) with cloud-drive sources (Google
Drive, OneDrive, Dropbox, Box), resumable uploads, theming, and ICU i18n. A native
port of the canonical [upup](https://github.com/DevinoSolutions/upup) React UI,
DOM-identical to it — no framework required. Mount it into any DOM element.

## Install

```sh
npm i @upup/vanilla
```

## Usage (Client Mode)

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived upload credentials at `uploadEndpoint`.

```ts
import { createUploader } from '@upup/vanilla'
import '@upup/vanilla/styles'

const uploader = createUploader('#uploader', {
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
})
```

`createUploader(target, options)` accepts a CSS selector string or an
`HTMLElement`.

## Custom element

A `<upup-uploader>` custom element is also published. Importing
`@upup/vanilla/element` registers it, after which you can use it declaratively in
HTML:

```ts
import '@upup/vanilla/element'
```

## Server Mode

For credential isolation and server-proxied cloud drives, add
[`@upup/server`](https://www.npmjs.com/package/@upup/server) and set the mode:

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

- Documentation: <https://useupup.com/documentation/docs/getting-started>
- Monorepo & source: <https://github.com/DevinoSolutions/upup>

## License

MIT
