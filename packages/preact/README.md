# @upup/preact

Preact file uploader with cloud-drive sources (Google Drive, OneDrive, Dropbox,
Box), resumable uploads, theming, and ICU i18n. It is a **`preact/compat`
re-export of [`@upup/react`](https://www.npmjs.com/package/@upup/react)** — the
same UI and API, resolved against Preact.

Requires Preact 10.13+ (`preact` is a peer dependency; the image editor has
additional optional peers — see below).

## Install

```sh
npm i @upup/preact
```

## Usage (Client Mode)

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived upload credentials at `uploadEndpoint`.

```tsx
import { UpupUploader } from '@upup/preact'
import '@upup/preact/styles'

export function App() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
```

Use it in a Preact project that has the standard `preact/compat` aliases
(`react` / `react-dom` → `preact/compat`) configured in its bundler, as with any
React-compatible library.

## Image editor

The optional image editor runs as an **isolated real-React island**: it lazily
loads actual `react` / `react-dom` on demand to render Filerobot, so React never
enters your main Preact bundle. If you enable the editor, install its peers
(`react`, `react-dom`, `react-filerobot-image-editor`, and the `konva` /
`react-konva` / `styled-components` dependencies it needs — see this package's
`peerDependencies`).

## Exports

Because it re-exports `@upup/react`, the public surface matches `@upup/react`
exactly (`UpupUploader`, `UpupThemeProvider`, the brand icons, and the `use*`
hooks).

## Links

- Documentation: <https://useupup.com/documentation/docs/getting-started>
- Monorepo & source: <https://github.com/DevinoSolutions/upup>

## License

MIT
