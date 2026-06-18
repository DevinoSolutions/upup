# @upup/next

Next.js integration for the [upup](https://github.com/DevinoSolutions/upup) uploader. One install gives you the client UI and the server handlers, split across two entry points so the AWS SDK never reaches your client bundle.

```bash
pnpm add @upup/next
```

## Client (App Router or Pages Router)

```tsx
import { UpupUploader } from '@upup/next'
import '@upup/next/styles'

export default function Page() {
  return <UpupUploader mode="server" serverUrl="/api/upup" />
}
```

## Server — App Router (`app/api/upup/[...path]/route.ts`)

```ts
import { createUpupHandler, defineUpupConfig } from '@upup/next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const { GET, POST, PUT, DELETE } = createUpupHandler(
  defineUpupConfig({
    storage: { type: 'aws', bucket: process.env.S3_BUCKET!, region: process.env.S3_REGION! /* creds... */ },
  }),
)
```

## Server — Pages Router (`pages/api/upup/[...path].ts`)

```ts
import { createUpupPagesHandler, defineUpupConfig } from '@upup/next/server'

export const config = { api: { bodyParser: false } } // REQUIRED — we read the raw body

export default createUpupPagesHandler(defineUpupConfig({ /* storage, providers */ }))
```

## Deploying to serverless (Vercel / Lambda / Netlify)

- **Persist OAuth state + tokens.** The default `InMemoryTokenStore` keeps OAuth
  `state` and drive tokens in a process-local `Map`. On serverless the redirect and
  callback can hit different instances, so login fails with `400 "Invalid or expired
  state"`. Implement the `TokenStore { get, set, delete }` interface against Redis /
  Upstash / KV and pass it as `config.tokenStore`.
- **Function timeout.** Server-mode drive→S3 transfer streams *through* the function.
  Set `maxDuration` (App Router segment config) and raise it toward your platform max
  for large files. (Direct local uploads bypass the function via presigned PUT.)
- **Memory.** `@upup/server` buffers files below `multipartThreshold` (default 100 MB)
  in RAM during transfer. On 128–256 MB functions, lower `multipartThreshold` so
  transfers stream in chunks instead.
- **Proxy/CDN origin.** Behind a proxy, pass `createUpupHandler(config, { baseUrl })`
  (or `{ trustProxy: true }` to read `x-forwarded-*`) so the OAuth callback URL is
  correct. No-op on Vercel App Router (`req.url` is already public).
- **OAuth redirect URIs.** Register your deployed callback URL
  (`https://<your-domain>/api/upup/auth/<provider>/cb`) in each drive provider's OAuth
  app (Google / Dropbox / OneDrive / Box). It must match the origin that
  `baseUrl`/`trustProxy` resolves to, or login fails with `redirect_uri_mismatch`.
- **Bundling.** Add `serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner']`
  to `next.config`.

## Self-hosted (`next start` / Docker)

- The in-memory store works for a single instance but breaks across replicas/restarts
  — use a shared `TokenStore` when scaling horizontally.
- No function timeout, so large transfers are fine; the `multipartThreshold` guidance
  still helps under concurrency.

## S3 bucket CORS

Presigned uploads go browser→S3 directly, so the bucket's CORS policy must allow your
site origin for `PUT` (and `GET` for previews). This is bucket configuration, not
`@upup/next` code.
