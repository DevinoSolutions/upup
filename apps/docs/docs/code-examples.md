---
sidebar_position: 3
---

# Code Examples

## Tech Stack Implementations

### Next.js Implementation with SSR Handling

```tsx
"use client";
import { UpupUploader, UpupProvider } from "upup-react-file-uploader";
import 'upup-react-file-uploader/styles'

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.Backblaze} // assuming we are uploading to Backblaze
      tokenEndpoint="http://<path_to_your_server>/api/upload-token" // Path to your server route that calls our exported upload utilities
    />
  );
}
```

```tsx
import Uploader from "./components/Uploader";

export default function Page() {
  return <Uploader />;
}
```

```ts
import { s3GeneratePresignedUrl } from "upup-react-file-uploader/server";
import { NextResponse } from "next/server";

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

:::note
**Important Notes:**

- Import the `UpupUploader` component in a client component using the `use client` directive
- Use dynamic import with `ssr: false` for error-free client-side rendering
- Ensure [`tokenEndpoint`](/docs/api-reference/upupuploader/required-props.md#tokenendpoint) points to your Next.js API route
- Be sure to return the resolved Promise value of [`s3GeneratePresignedUrl`](/docs/api-reference/s3-generate-presigned-url.md) in your response to your front-end

:::

### React.js Basic Implementation

```tsx
import {
  UpupUploader,
  UpupProvider,
  UploadAdapter,
} from "upup-react-file-uploader";
import 'upup-react-file-uploader/styles'

export default function Uploader() {
  return (
    <UpupUploader
      provider={UpupProvider.Azure}
      tokenEndpoint="http://localhost:3000/api/upload"
    />
  );
}
```

:::note
**Key Props:**

- [`provider`](/docs/api-reference/upupuploader/required-props.md#provider): Specify cloud provider (AWS, Azure, Backblaze, DigitalOcean)
- [`tokenEndpoint`](/docs/api-reference/upupuploader/required-props.md#tokenendpoint): Your backend endpoint that calls the utility functions to handle the file upload

> No need for the "use client" directive with React, since all React components are client components by default.
> :::

### Express.js Backend Configuration

```ts
// Base configuration
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  s3GeneratePresignedUrl,
  azureGenerateSasUrl,
} from "upup-react-file-uploader/server";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
```

#### AWS

```ts
app.post("/api/storage/aws/upload-url", async (req, res) => {
  try {
    const { provider, customProps, enableAutoCorsConfig, ...fileParams } =
      req.body;

    const presignedData = await s3GeneratePresignedUrl({
      origin: req.headers.origin as string,
      provider,
      fileParams,
      bucketName: process.env.AWS_BUCKET_NAME!,
      s3ClientConfig: {
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      },
      enableAutoCorsConfig,
    });

    res.status(200).json(presignedData);
  } catch (error) {
    // Error handling
  }
});
```

#### Azure

```ts
app.post("/api/storage/azure/upload-url", async (req, res) => {
  try {
    const { provider, customProps, ...fileParams } = req.body;

    const uploadData = await azureGenerateSasUrl({
      fileParams,
      containerName: process.env.AZURE_STORAGE_CONTAINER!,
      credentials: {
        tenantId: process.env.AZURE_TENANT_ID!,
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        storageAccount: process.env.AZURE_STORAGE_ACCOUNT!,
      },
    });

    res.status(200).json(uploadData);
  } catch (error) {
    // Error handling
  }
});
```

#### BackBlaze

```ts
app.post("/api/storage/backblaze/upload-url", async (req, res) => {
  try {
    const { provider, customProps, enableAutoCorsConfig, ...fileParams } =
      req.body;

    const presignedData = await s3GeneratePresignedUrl({
      origin: req.headers.origin as string,
      provider,
      fileParams,
      bucketName: process.env.BACKBLAZE_BUCKET_NAME!,
      s3ClientConfig: {
        region: process.env.BACKBLAZE_BUCKET_REGION,
        credentials: {
          accessKeyId: process.env.BACKBLAZE_KEY_ID!,
          secretAccessKey: process.env.BACKBLAZE_APP_KEY!,
        },
        endpoint: process.env.BACKBLAZE_S3_ENDPOINT, // In this format: https://...
        forcePathStyle: false,
      },
      enableAutoCorsConfig,
    });

    res.status(200).json(presignedData);
  } catch (error) {
    // Error handling
  }
});
```

#### DigitalOcean

```ts
app.post("/api/storage/digitalocean/upload-url", async (req, res) => {
  try {
    const { provider, customProps, enableAutoCorsConfig, ...fileParams } =
      req.body;

    const presignedData = await s3GeneratePresignedUrl({
      origin: req.headers.origin as string,
      provider,
      fileParams,
      bucketName: process.env.DIGITAL_OCEAN_SPACES_BUCKET!,
      s3ClientConfig: {
        region: process.env.DIGITAL_OCEAN_SPACES_REGION,
        credentials: {
          accessKeyId: process.env.DIGITAL_OCEAN_SPACES_KEY!,
          secretAccessKey: process.env.DIGITAL_OCEAN_SPACES_SECRET!,
        },
        endpoint: process.env.DIGITAL_OCEAN_SPACES_ENDPOINT, // In this format: https://...
        forcePathStyle: false,
      },
      enableAutoCorsConfig,
    });

    res.status(200).json(presignedData);
  } catch (error) {
    // Error handling
  }
});
```
