<p align="center">
  <a href="https://useupup.com">
    <img src="https://media2.dev.to/dynamic/image/width=1000,height=280,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fbv3pa1myovex6hvw9n05.png" alt="Upup – React file upload component with drag and drop, progress bar, and cloud storage" />
  </a>
</p>

<h3 align="center">Open-source React file upload component with drag & drop, progress bar, and cloud integrations</h3>

<p align="center">
  <a href="https://github.com/DevinoSolutions/upup/actions/workflows/publish.yml"><img src="https://github.com/DevinoSolutions/upup/actions/workflows/publish.yml/badge.svg?branch=master" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/upup-react-file-uploader"><img src="https://img.shields.io/npm/v/upup-react-file-uploader" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/upup-react-file-uploader"><img src="https://img.shields.io/npm/dw/upup-react-file-uploader" alt="npm downloads" /></a>
  <a href="https://bundlephobia.com/package/upup-react-file-uploader"><img src="https://img.shields.io/bundlephobia/minzip/upup-react-file-uploader" alt="bundle size" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://discord.gg/ny5WUE9ayc"><img src="https://img.shields.io/discord/1299099371647930502?label=discord&logo=discord&logoColor=white&color=5865F2" alt="Discord" /></a>
</p>

<p align="center">
  <a href="https://useupup.com">Website</a> · <a href="https://useupup.com/documentation/docs/getting-started">Docs</a> · <a href="https://useupup.com#demo">Live Demo</a> · <a href="https://stackblitz.com/edit/stackblitz-starters-flxnhixb">StackBlitz Playground</a> · <a href="https://discord.gg/ny5WUE9ayc">Discord</a>
</p>

---

**Upup** is a free, open-source **React & TypeScript file upload library** that gives you a production-ready drag-and-drop **dropzone**, **file picker**, **upload button**, **progress bar**, and **retry logic** — all in a single component. Upload images, videos, and multiple large files to **AWS S3**, **Azure Blob**, **Google Drive**, **OneDrive**, **DigitalOcean Spaces**, **Backblaze B2**, and more using **presigned URLs** and **resumable chunked uploads**.

Works with **Next.js**, **Vite**, **Remix**, **Gatsby**, and any React framework.

## Features

- 🗂 **Drag & drop dropzone** — intuitive file picker with customizable upload button and UI
- 📊 **Upload progress bar** — real-time feedback with automatic retry on failure
- 🔄 **Resumable chunked uploads** — upload large files reliably with presigned URLs
- 🖼 **File upload with preview** — image, video, and document previews before uploading
- 📁 **Multiple file upload** — batch upload with file size limit validation
- ☁️ **Multi-cloud support** — S3, R2, Wasabi, MinIO, GCS, Azure Blob, Google Drive, OneDrive, Dropbox, Box, DigitalOcean Spaces, Backblaze B2
- 🔀 **Two modes** — **Client Mode** (browser ↔ storage direct, default) or **Server Mode** (`@upup/server` proxies drive APIs + storage writes for compliance / credential isolation)
- 🎨 **Fully themeable** — `theme.slots` targets every rendered element, 9 locale packs, full ICU i18n
- 📦 **TypeScript-first** — full type definitions out of the box

## Install

```bash
# Client Mode (default) — one package
npm i upup-react-file-uploader

# Server Mode — add the Node-side handler
npm i upup-react-file-uploader @upup/server
```

Styles are in a separate import so consumers without Tailwind get the same look:

```tsx
import "upup-react-file-uploader/styles";
```

See [CHANGELOG.md](CHANGELOG.md) for the full v2.1 / v2.2 notes.

### Client Mode — Frontend (React / Next.js / Vite / Remix)

```tsx
"use client";

import { UpupUploader, UpupProvider } from "upup-react-file-uploader";
import "upup-react-file-uploader/styles";

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.AWS}
      tokenEndpoint="/api/upload-token"
    />
  );
}
```

### Server Mode — one handler, any framework

Server Mode routes browser traffic through your server. Your credentials never reach the client; drive OAuth tokens live server-side in a `tokenStore` you control.

```ts
// app/api/upup/[...route]/route.ts  (Next.js App Router)
import { createHandler, InMemoryTokenStore } from "@upup/server";

const handler = createHandler({
  storage: {
    type: "aws",
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  providers: {
    googleDrive: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
    dropbox:     { appKey:   process.env.DROPBOX_APP_KEY!,  appSecret:    process.env.DROPBOX_APP_SECRET! },
  },
  tokenStore: new InMemoryTokenStore(), // swap for Redis/KV/DynamoDB in prod
  getUserId: async (req) => (await getSession(req))?.userId ?? null,
});

export const GET = handler;
export const POST = handler;
```

```tsx
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

Adapters for Express, Fastify, Hono, and Next.js are published as subpath exports (`@upup/server/express`, `/fastify`, `/hono`, `/next`).

> **Full docs → [useupup.com/documentation](https://useupup.com/documentation/docs/getting-started)** · **Mode comparison → [`apps/docs/docs/guides/modes.md`](apps/docs/docs/guides/modes.md)** · **Server Mode setup → [`apps/docs/docs/guides/server-mode-setup.md`](apps/docs/docs/guides/server-mode-setup.md)**

## Battle-tested in Production

- 📚 **uNotes** – AI doc uploads for past exams → [unotes.net](https://unotes.net)
- 🎙 **Shorty** – media uploads for transcripts → [aishorty.com](https://aishorty.com)

## Contributing

We love PRs! Please see [CONTRIBUTING.md](CONTRIBUTING.md) and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

Found a vulnerability? Check our [Security Policy](SECURITY.md).

---

## Monorepo Setup

This repo is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/repo).

```
upup/
├── packages/react/              # upup-react-file-uploader (published)
├── packages/server/             # @upup/server (published, optional)
├── packages/core/               # @upup/core (private, bundled into both)
├── packages/shared/             # @upup/shared (private, bundled into both)
├── packages/interactive-example/# In-browser playground
├── apps/landing/                # Next.js marketing site at useupup.com
├── apps/docs/                   # Docusaurus documentation site
├── local-dev/                   # Port config & local dev helpers
└── turbo.json                   # Build pipeline configuration
```

### Getting Started (Development)

```bash
git clone https://github.com/DevinoSolutions/upup.git
cd upup
pnpm install
pnpm dev          # runs landing + docs + playground + package watchers via Turborepo
```

### Commands

| Command                                      | Description                           |
| -------------------------------------------- | ------------------------------------- |
| `pnpm dev`                                   | Run everything in watch mode          |
| `pnpm build`                                 | Build all packages + apps             |
| `pnpm test`                                  | Run vitest across the workspace       |
| `pnpm typecheck`                             | `tsc --noEmit` in every package       |

### Publishing

```bash
# From the repo root — publishes both npm packages
pnpm -r --filter upup-react-file-uploader --filter @upup/server publish --access public
```

---

<p align="center">
  <a href="https://discord.gg/ny5WUE9ayc">💬 Discord</a> · <a href="https://github.com/DevinoSolutions/upup/issues">🐛 Issues</a> · <a href="https://www.npmjs.com/package/upup-react-file-uploader">📦 npm</a> · <a href="https://useupup.com">🌐 Website</a>
</p>

<p align="center">
  <a href="LICENSE">MIT License</a> · Made with ❤️ by <a href="https://devino.ca/">Devino</a>
</p>
