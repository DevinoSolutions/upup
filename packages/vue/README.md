# @upupjs/vue

Vue 3 file uploader with cloud-drive sources (Google Drive, OneDrive, Dropbox,
Box), resumable uploads, theming, and ICU i18n. A native port of the canonical
[upup](https://github.com/DevinoSolutions/upup) React UI, DOM-identical to it.

Requires Vue 3.4+ (`vue` is a peer dependency).

## Install

```sh
npm i @upupjs/vue
```

## Usage (Client Mode)

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived upload credentials at `uploadEndpoint`.

```vue
<script setup lang="ts">
import { UpupUploader } from '@upupjs/vue'
import '@upupjs/vue/styles'
</script>

<template>
    <UpupUploader
        provider="aws"
        upload-endpoint="/api/upload-token"
        :on-file-upload-complete="
            (file, key) => console.log('Uploaded', file.name, 'to', key)
        "
    />
</template>
```

The stylesheet is a separate import so projects without Tailwind get the same
look. `upload-endpoint` is your own route returning a presigned upload URL — see
the quickstart for a ready-made handler.

## Server Mode

For credential isolation and server-proxied cloud drives, add
[`@upupjs/server`](https://www.npmjs.com/package/@upupjs/server) and point the
uploader at it:

```vue
<template>
    <UpupUploader mode="server" server-url="/api/upup" provider="aws" />
</template>
```

## Also exported

The `use*` uploader composables (`useUpupUpload`, `useUploaderFiles`,
`useUploaderContext`, and more), plus the `FileSource`, `StorageProvider`, and
`UploadStatus` enums.

## Links

- [Vue quickstart](https://useupup.com/documentation/quickstarts/vue)
- [Documentation](https://useupup.com/documentation/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
