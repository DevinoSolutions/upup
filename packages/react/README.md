# @upupjs/react

React file uploader with drag-and-drop, a progress bar, file previews,
cloud-drive sources (Google Drive, OneDrive, Dropbox, Box), resumable uploads, an
image editor, theming, and ICU i18n. This is the canonical
[upup](https://github.com/DevinoSolutions/upup) UI — every other framework
package mirrors its DOM.

Requires React 19 (`react` and `react-dom` are peer dependencies).

## Install

```sh
npm i @upupjs/react
```

## Usage (Client Mode)

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived upload credentials at `uploadEndpoint`.

```tsx
'use client'

import { UpupUploader } from '@upupjs/react'
import '@upupjs/react/styles'

export default function Uploader() {
    return (
        <UpupUploader
            provider="aws"
            uploadEndpoint="/api/upload-token"
            onFileUploadComplete={(file, key) =>
                console.log('Uploaded', file.name, 'to', key)
            }
        />
    )
}
```

`uploadEndpoint` is your own route that returns a presigned upload URL — see the
quickstart for a ready-made handler, or use [`@upupjs/server`](https://www.npmjs.com/package/@upupjs/server).

The stylesheet is a separate import so projects without Tailwind get the same
look.

## Server Mode

For credential isolation and server-proxied cloud drives, add
[`@upupjs/server`](https://www.npmjs.com/package/@upupjs/server) and point the
uploader at it:

```tsx
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

## Also exported

`UpupThemeProvider`, the brand source icons (`GoogleDriveIcon`, `OneDriveIcon`,
`DropboxIcon`, `BoxIcon`, `CameraIcon`, and more), and the `use*` uploader hooks
(`useUpupUpload`, `useUploaderFiles`, `useUploaderContext`, and more) for building
custom UIs on the same engine.

## Links

- [React quickstart](https://useupup.com/documentation/quickstarts/react)
- [Documentation](https://useupup.com/documentation/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
