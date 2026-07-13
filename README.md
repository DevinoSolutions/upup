<p align="center">
  <a href="https://useupup.com">
    <img src="./assets/upup-banner.png" alt="upup — one file uploader with native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact" width="720" />
  </a>
</p>

<h3 align="center">One file uploader. Every framework.</h3>

<p align="center">
  A headless upload engine with native, byte-identical UI packages for
  <b>React</b>, <b>Vue</b>, <b>Svelte</b>, <b>Angular</b>, <b>Vanilla&nbsp;JS</b>, and <b>Preact</b> —
  with optional server-mode uploads, cloud drives, camera, screen capture, and link imports.
</p>

<!-- npm badges: add after first @upup publish -->
<p align="center">
  <a href="https://github.com/DevinoSolutions/upup/actions/workflows/main.yml"><img src="https://github.com/DevinoSolutions/upup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://discord.gg/ny5WUE9ayc"><img src="https://img.shields.io/discord/1299099371647930502?label=discord&logo=discord&logoColor=white&color=5865F2" alt="Discord" /></a>
</p>

<p align="center">
  <a href="https://useupup.com">Website</a> ·
  <a href="https://useupup.com/documentation/getting-started">Docs</a> ·
  <a href="https://useupup.com#demo">Live Demo</a> ·
  <a href="https://discord.gg/ny5WUE9ayc">Discord</a>
</p>

---

**upup** is a free, MIT-licensed file uploader built as one headless
[`@upup/core`](packages/core) engine with a matching native UI for every major
framework. React is the visual canon; the Vue, Svelte, Angular, Vanilla, and
Preact ports render the **same DOM** with the **same props**, verified
byte-for-byte by a cross-framework parity harness. Upload straight from the
browser to any S3-compatible storage (Client Mode), or route through your own
backend with an HMAC-signed trust model (Server Mode via
[`@upup/server`](packages/server)).

## Install

Pick the package for your framework — the component API and rendered DOM are identical across all of them:

| Package         | Install               | Get started                                                                 |
| --------------- | --------------------- | --------------------------------------------------------------------------- |
| `@upup/react`   | `npm i @upup/react`   | [React quickstart](https://useupup.com/documentation/quickstarts/react)     |
| `@upup/vue`     | `npm i @upup/vue`     | [Vue quickstart](https://useupup.com/documentation/quickstarts/vue)         |
| `@upup/svelte`  | `npm i @upup/svelte`  | [Svelte quickstart](https://useupup.com/documentation/quickstarts/svelte)   |
| `@upup/angular` | `npm i @upup/angular` | [Angular quickstart](https://useupup.com/documentation/quickstarts/angular) |
| `@upup/vanilla` | `npm i @upup/vanilla` | [Vanilla quickstart](https://useupup.com/documentation/quickstarts/vanilla) |
| `@upup/preact`  | `npm i @upup/preact`  | [Preact quickstart](https://useupup.com/documentation/quickstarts/preact)   |
| `@upup/next`    | `npm i @upup/next`    | Client re-export + `/server` route handlers (App & Pages routers)           |
| `@upup/core`    | `npm i @upup/core`    | Headless engine — state, pipeline, drive plugins, i18n, theme               |
| `@upup/server`  | `npm i @upup/server`  | Server Mode — S3 presign/proxy, drive OAuth, HMAC trust model               |

## Quick start (React)

```tsx
import { UpupUploader } from '@upup/react'
import '@upup/react/styles'

export default function Uploader() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
```

Client Mode uploads directly from the browser to your storage; your server only
issues short-lived presigned URLs at `uploadEndpoint` — a route you provide,
either a small presign handler of your own or `@upup/server`'s
`createUpupHandler` (see [Server mode](#server-mode) below). The stylesheet is a
separate import so projects without Tailwind get the same look. Every other
framework mounts the same component with the same props — see the per-framework
quickstarts in the [install table](#install) above.

## Server mode

Route uploads through your own backend so storage credentials and drive OAuth
tokens never reach the browser. `createUpupHandler` mounts on any Node or edge
framework and enforces an HMAC-signed trust model — `uploadTokenSecret` is
**required** and must be at least 16 characters:

```ts
// app/api/upup/[...route]/route.ts  (Next.js App Router)
import { createUpupHandler } from '@upup/server'

const handler = createUpupHandler({
    storage: {
        type: 'aws',
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION!,
    },
    uploadTokenSecret: process.env.UPUP_UPLOAD_TOKEN_SECRET!, // required · stable · high-entropy · >=16 chars
})

export const GET = handler
export const POST = handler
```

S3 credentials resolve from the standard AWS environment
(`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or an IAM role), or you can pass
`accessKeyId` / `secretAccessKey` explicitly. Then point the uploader at the handler:

```tsx
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

Express, Fastify, and Hono handlers ship as subpath exports
(`@upup/server/express`, `@upup/server/fastify`, `@upup/server/hono`), and
`@upup/next` wraps both the App and Pages routers.

> **Full docs → [useupup.com/documentation/getting-started](https://useupup.com/documentation/getting-started)** · **Server Mode setup → [`apps/docs/docs/guides/server-mode-setup.md`](apps/docs/docs/guides/server-mode-setup.md)**

## Features

- **Headless core.** `@upup/core` is a zero-framework-dependency engine: file state, an upload pipeline (compression, HEIC→JPEG, EXIF stripping, checksums, thumbnails, optional Web Worker offload), cloud-drive plugins, i18n, and theming. Build your own UI on it, or use a native package.
- **Native UI for six frameworks.** React, Vue, Svelte, Angular, Vanilla JS, and Preact — same DOM, same Tailwind classes, enforced byte-for-byte by a parity harness.
- **Client or Server mode.** Direct browser → storage presigned uploads, or a server-proxied [`@upup/server`](packages/server) with an HMAC-signed trust model (signed length, key/uploadId binding, mandatory secrets).
- **S3-compatible storage.** AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, Backblaze B2, Wasabi — any S3-compatible endpoint.
- **Cloud drives.** Import from Google Drive, OneDrive, Dropbox, and Box, in client or server mode.
- **More sources.** Drag-and-drop, file picker, camera, screen capture, audio recording, and link (URL) import.
- **Resumable uploads.** Optional chunked/resumable strategy (tus) for large files, loaded on demand so it never weighs down the core bundle.
- **Image editor.** Crop, rotate, and annotate before upload (React / Preact only).
- **i18n & theming.** ICU-based localization with 9 bundled locales and RTL support, plus a slot-level theming system that targets every rendered element.
- **TypeScript-first.** Full type definitions out of the box.

## Battle-tested in production

- **uNotes** — AI doc uploads for past exams → [unotes.net](https://unotes.net)
- **Shorty** — media uploads for transcripts → [aishorty.com](https://aishorty.com)

## Contributing

PRs welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). Found a vulnerability? See the
[Security Policy](SECURITY.md).

---

## Monorepo layout

This repo is a [pnpm workspace](https://pnpm.io/workspaces) driven by
[Turborepo](https://turbo.build/repo).

```
upup/
├── packages/core/     # @upup/core    — headless engine (state, pipeline, drives, i18n, theme)
├── packages/react/    # @upup/react   — canonical UI
├── packages/vue/      # @upup/vue     — native Vue port (DOM-identical to react)
├── packages/svelte/   # @upup/svelte  — native Svelte port
├── packages/angular/  # @upup/angular — native Angular port
├── packages/vanilla/  # @upup/vanilla — framework-free port
├── packages/preact/   # @upup/preact  — preact/compat re-export of react
├── packages/next/     # @upup/next    — client re-export + /server route handlers
├── packages/server/   # @upup/server  — server-mode endpoints (S3 presign/proxy, drive OAuth)
├── apps/playground/   # Main dev app
├── apps/landing/      # Marketing site (useupup.com)
├── apps/docs/         # Documentation site
├── apps/e2e-test/     # Playwright: deep React suite + cross-framework parity harness
└── turbo.json         # Build pipeline
```

### Getting started (development)

```bash
git clone https://github.com/DevinoSolutions/upup.git
cd upup
nvm use                 # Node 20.20.2, pinned in .nvmrc
pnpm install
pnpm dev                # landing + docs + playground + package watchers, via Turborepo
```

| Command          | Description                         |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | Run everything in watch mode        |
| `pnpm build`     | Build all packages + apps           |
| `pnpm test`      | Run every package's vitest suite    |
| `pnpm typecheck` | `tsc --noEmit` across every package |

Releases go through [changesets](https://github.com/changesets/changesets):
pushes to `master` open a release PR and publish the public packages via CI
(`.github/workflows/publish.yml`).

---

<p align="center">
  <a href="https://discord.gg/ny5WUE9ayc">💬 Discord</a> · <a href="https://github.com/DevinoSolutions/upup/issues">🐛 Issues</a> · <a href="https://useupup.com">🌐 Website</a>
</p>

<p align="center">
  <a href="LICENSE">MIT License</a> · Made with ❤️ by <a href="https://devino.ca/">Devino</a>
</p>
