<p align="center">
  <a href="https://useupup.com">
    <img src="https://media2.dev.to/dynamic/image/width=1000,height=280,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fbv3pa1myovex6hvw9n05.png" alt="Upup – QReact file upload component with drag and drop, progress bar, and cloud storage" />
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
- ☁️ **Multi-cloud support** — S3, Azure Blob, Google Drive, OneDrive, DigitalOcean Spaces, Backblaze B2
- ⚙️ **Server-side helpers** — tiny Node.js utilities for presigned URL generation (S3 & Azure)
- 🎨 **Fully customizable** — themes, styles, and components you can override
- 📦 **TypeScript-first** — full type definitions out of the box

## Install

```bash
npm i upup-react-file-uploader     # or yarn add / pnpm add / bun install
```

## Quick Start

### Frontend (React / Next.js / Vite / Remix)

```tsx
'use client'

import { UpupUploader, UpupProvider } from 'upup-react-file-uploader'
import 'upup-react-file-uploader/styles'

export default function Uploader() {
    return (
        <UpupUploader
            provider={UpupProvider.AWS}
            tokenEndpoint="/api/upload-token"
        />
    )
}
```

### Backend (Next.js API / Express / NestJS)

```tsx
import { s3GeneratePresignedUrl } from "upup-react-file-uploader/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { provider, customProps, enableAutoCorsConfig ...fileParams } = body;

  const presignedData = await s3GeneratePresignedUrl({
    origin: req.headers.get("origin") as string,
    provider,
    fileParams,
    bucketName: process.env.S3_BUCKET_NAME!,
    s3ClientConfig: {
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    },
    enableAutoCorsConfig,
  });

  return Response.json(presignedData);
}
```

> **Full documentation & examples → [useupup.com/documentation/docs/getting-started](https://useupup.com/documentation/docs/getting-started)**

## Battle-tested in Production

- 📚 **uNotes** – AI doc uploads for past exams → [unotes.net](https://unotes.net)
- 🎙 **Shorty** – media uploads for transcripts → [aishorty.com](https://aishorty.com)

## Contributing

We love PRs! Please see [CONTRIBUTING](packages/upup/CONTRIBUTING.md) and adhere to our [Code of Conduct](packages/upup/CODE_OF_CONDUCT.md).

Found a vulnerability? Check our [Security Policy](packages/upup/SECURITY.md).

---

## Monorepo Setup

This repo is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/repo).

```
upup/
├── packages/upup/      # The published npm package (upup-react-file-uploader)
├── apps/landing/       # Next.js marketing site at useupup.com
├── apps/docs/          # Docusaurus documentation site
├── local-dev/          # Port config & local dev helpers
└── turbo.json          # Build pipeline configuration
```

### Getting Started (Development)

```bash
git clone https://github.com/DevinoSolutions/upup.git
cd upup
pnpm install
pnpm dev          # runs landing + docs + package watcher via Turborepo
```

### Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run everything in watch mode |
| `pnpm dev:package` | Storybook + local mock server |
| `pnpm build` | Build all (package → docs → landing) |
| `pnpm lint` / `pnpm test` / `pnpm typecheck` | Workspace-wide pipelines |

### Publishing

```bash
pnpm changeset
pnpm changeset version
pnpm --filter upup-react-file-uploader run release
```

---

<p align="center">
  <a href="https://discord.gg/ny5WUE9ayc">💬 Discord</a> · <a href="https://github.com/DevinoSolutions/upup/issues">🐛 Issues</a> · <a href="https://www.npmjs.com/package/upup-react-file-uploader">📦 npm</a> · <a href="https://useupup.com">🌐 Website</a>
</p>

<p align="center">
  <a href="LICENSE">MIT License</a> · Made with ❤️ by <a href="https://devino.ca/">Devino</a>
</p>
