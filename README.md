# upup

Upup is an open-source, free-to-use **Full-stack library** that easily handles your file upload needs with seamless DigitalOcean Spaces, Amazon S3, Backblaze, Microsoft Azure Blob Storage, Google Drive, and OneDrive integrations.

🎮 Join our Discord, where we can provide quick support: [Discord Invite Link](https://discord.gg/ny5WUE9ayc)

![Static Badge](https://img.shields.io/badge/gzipped-206kb-4ba0f6)

---

## Installation

Install upup with your favourite package manager

### npm

```bash
npm install upup-react-file-uploader
```

### yarn

```bash
yarn add upup-react-file-uploader
```

### pnpm

```bash
pnpm add upup-react-file-uploader
```

### bun

```bash
bun install upup-react-file-uploader
```

## Logic Diagram

This logic diagram explains how the client and server parts of the upup package works

![logic diagram](https://i.ibb.co/8gzsPXqp/Screenshot-2025-01-30-at-14-10-24.png)

## Usage

The example below shows a minimal configuration for AWS S3 upload, using the [UpupUploader](https://upup-landing-page.vercel.app/docs/category/upupuploader) client component and the [`s3GeneratePresignedUrl`](https://upup-landing-page.vercel.app/docs/api-reference/s3-generate-presigned-url) utility. For full code examples check these [docs](https://upup-landing-page.vercel.app/docs/code-examples)

### Client Side

```tsx
import { UpupUploader, UpupProvider } from 'upup-react-file-uploader'
import 'upup-react-file-uploader/styles'

export default function Uploader() {
    return (
        <UpupUploader
            provider={UpupProvider.AWS} // assuming we are uploading to AWS
            tokenEndpoint="http://<path_to_your_server>/api/upload-token" // Path to your server route that calls our exported upload utilities
        />
    )
}
```

> The [`UpupUploader`](https://upup-landing-page.vercel.app/docs/category/upupuploader) must be placed in a client component. i.e For Next.js add the `use client` directive at the top of the example `Uploader` component.

Then use it in your application:

```tsx
import Uploader from '<path_to_your_uploader_component>'

export default function App() {
    return <Uploader />
}
```

> [`provider`](https://upup-landing-page.vercel.app/docs/api-reference/upupuploader/required-props#provider) and [`tokenEndpoint`](https://upup-landing-page.vercel.app/docs/api-reference/upupuploader/required-props#tokenendpoint) are the only required props for the UpupUploader component. For a full list of component props, check out these [docs](https://upup-landing-page.vercel.app/docs/category/upupuploader).

### Server Side

> The example below is the minimal required configuration for **AWS** S3 upload. For uploading to other services see these [docs](https://upup-landing-page.vercel.app/docs/code-examples)

For the upload to work without errors, it is important to:

1. Manually configure CORS using our [credentials guide](https://upup-landing-page.vercel.app/docs/credentials-configuration#server-side-configurations), OR
2. Enabling `enableAutoCorsConfig` with properly restricted credentials

```ts
import { s3GeneratePresignedUrl } from 'upup-react-file-uploader/server'

app.post('/api/upload-token', async (req, res) => {
    try {
        const { provider, customProps, enableAutoCorsConfig, ...fileParams } =
            req.body // The request body sent from the `UpupUploader` client component
        const origin = req.headers['origin'] // The origin of your client application

        // Generate presigned URL
        const presignedData = await s3GeneratePresignedUrl({
            origin: origin as string,
            provider,
            fileParams,
            bucketName: process.env.AWS_BUCKET_NAME as string,
            s3ClientConfig: {
                region: process.env.AWS_REGION as string,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
                    secretAccessKey: process.env
                        .AWS_SECRET_ACCESS_KEY as string,
                },
            },
            enableAutoCorsConfig,
        })

        return res.status(200).json(presignedData)
    } catch (error) {
        return res.status(500).json({
            message: (error as Error).message,
            error: true,
        })
    }
})
```

### Important Note

It is important to note that while it is possible to:

-   Implement your own custom logic on the client and use the server utilities provided by this component on the server OR
-   Use the `UpupUploader` React component on the client and implement your own custom server logic to handle uploads,

For best performance and minimal overhead, we advise that you use both the [`UpupUploader`](https://upup-landing-page.vercel.app/docs/category/upupuploader) React component together with the server utilities, like [`s3GeneratePresignedUrl`](https://upup-landing-page.vercel.app/docs/api-reference/s3-generate-presigned-url)

The full list of exported server utility functions include:

-   [`s3GeneratePresignedUrl`](https://upup-landing-page.vercel.app/docs/api-reference/s3-generate-presigned-url): for S3-compatible Uploads: like AWS, Digital Ocean, Backblaze
-   [`azureGenerateSasUrl`](https://upup-landing-page.vercel.app/docs/api-reference/azure-generate-sas-url): for Azure Blob Uploads only

> For a full list of values sent by the React component to the server, check out these [docs](https://upup-landing-page.vercel.app/docs/api-reference/upupuploader/required-props#tokenendpoint).

## Advanced Usage

### Programmatic Control

For more advanced use cases, you can control the upload process programmatically using the component's [ref API](https://upup-landing-page.vercel.app/docs/api-reference/upupuploader/ref-api)

## All done! 🎉

### Documentation

Find the full API reference and guides in the [official documentation](https://upup-landing-page.vercel.app/docs).

### Contributing

Please read our [Contributing Guidelines](CONTRIBUTING) before submitting pull requests. All contributions fall under our [Code of Conduct](CODE_OF_CONDUCT).

### Security

For security concerns, please review our [Security Policy](SECURITY).

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Devino](https://devino.ca/)
