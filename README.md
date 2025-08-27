# Upup – React File Uploads Made Easy ☁️

[![CI](https://github.com/DevinoSolutions/upup/actions/workflows/publish.yml/badge.svg?branch=master)](https://github.com/DevinoSolutions/upup/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/upup-react-file-uploader)](https://www.npmjs.com/package/upup-react-file-uploader)
[![npm downloads](https://img.shields.io/npm/dw/upup-react-file-uploader)](https://www.npmjs.com/package/upup-react-file-uploader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1299099371647930502?label=discord&logo=discord&logoColor=white&color=5865F2)](https://discord.gg/ny5WUE9ayc)

Open-source, plug-and-play uploads to **S3, DigitalOcean Spaces, Backblaze B2, Azure Blob, Google Drive, OneDrive** and more – with a single React component and tiny server helpers.

👉 Try out the live demo: https://useupup.com#demo

You can even play with the code without any setup: https://stackblitz.com/edit/stackblitz-starters-flxnhixb

## Install

```bash
npm i upup-react-file-uploader     # or yarn add / pnpm add / bun install
```

## Quick start (React / Next.js)

```tsx
// On your frontend (aka React, Next.JS Pages, etc).

'use client'

import { UpupUploader, UpupProvider } from 'upup-react-file-uploader'
import 'upup-react-file-uploader/styles'

export default function Uploader() {
    return <UpupUploader provider={UpupProvider.AWS} tokenEndpoint="/api/upload-token" />
}
```

```tsx
// On your backend (aka, NextJS APIs, Express.JS server, NestJS, etc.)

import { s3GeneratePresignedUrl } from "upup-react-file-uploader/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, customProps, enableAutoCorsConfig ...fileParams } = body;

    const origin = req.headers.get("origin");

    // Generate presigned URL
    const presignedData = await s3GeneratePresignedUrl({
      origin: origin as string,
      provider,
      fileParams,
      bucketName: process.env.BACKBLAZE_BUCKET_NAME!,
      s3ClientConfig: {
        region: process.env.BACKBLAZE_BUCKET_REGION,
        credentials: {
          accessKeyId: process.env.BACKBLAZE_KEY_ID!,
          secretAccessKey: process.env.BACKBLAZE_APP_KEY!,
        },
        endpoint: process.env.BACKBLAZE_S3_ENDPOINT,
        forcePathStyle: false,
      },
      enableAutoCorsConfig
    });

    return NextResponse.json(presignedData);
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      message: (error as Error).message,
      error: true,
    });
  }
}
```

☞ **Full documentation & code examples → [https://useupup.com/documentation/docs/getting-started](https://useupup.com/documentation/docs/getting-started)**

## Contributing

We love PRs! Please see [CONTRIBUTING](CONTRIBUTING.md) and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Battle-tested in production:

-   📚 uNotes – AI doc uploads for past exams → https://unotes.net
-   🎙 Shorty – media uploads for transcripts → https://aishorty.com

## Security

Found a vulnerability? Check our [Security Policy](SECURITY.md).

## Discord & Support

Please join our Discord if you need any support: https://discord.com/invite/ny5WUE9ayc

## License

[MIT](LICENSE)

Made with ❤️ by [Devino](https://devino.ca/)
