# @upupjs/preact

Preact file uploader with cloud-drive sources (Google Drive, OneDrive, Dropbox,
Box), resumable uploads, theming, and ICU i18n. It is a **`preact/compat`
re-export of [`@upupjs/react`](https://www.npmjs.com/package/@upupjs/react)** — the
same UI and API, resolved against Preact.

Requires Preact 10.13+ (`preact` is a peer dependency; the image editor has
additional optional peers — see below).

## Install

```sh
npm i @upupjs/preact
```

## Usage (Client Mode)

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived upload credentials at `uploadEndpoint`.

```tsx
import { UpupUploader } from '@upupjs/preact'
import '@upupjs/preact/styles'

export function App() {
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

`uploadEndpoint` is your own route returning a presigned upload URL — see the
quickstart for a ready-made handler.

Use it in a Preact project that has the standard `preact/compat` aliases
(`react` / `react-dom` → `preact/compat`) configured in its bundler, as with any
React-compatible library.

## Server Mode

For credential isolation and server-proxied cloud drives, add
[`@upupjs/server`](https://www.npmjs.com/package/@upupjs/server) and point the
uploader at it — server mode works identically through the `preact/compat`
re-export:

```tsx
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

## Image editor

The optional image editor runs as an **isolated real-React island**: it lazily
loads actual `react` / `react-dom` on demand to render Filerobot, so React never
enters your main Preact bundle. If you enable the editor, install its peers
(`react`, `react-dom`, `react-filerobot-image-editor`, and the `konva` /
`react-konva` / `styled-components` dependencies it needs — see this package's
`peerDependencies`).

## Also exported

Because it re-exports `@upupjs/react`, the public surface matches `@upupjs/react`
exactly (`UpupUploader`, `UpupThemeProvider`, the brand icons, and the `use*`
hooks).

## Links

- [Preact quickstart](https://useupup.com/docs/quickstarts/preact)
- [Documentation](https://useupup.com/docs/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
