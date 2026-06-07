// Dev-only presign/transfer/OAuth server for the MinIO upload-validation
// milestone. Wires @upup/server's express adapter to a local MinIO. NOT for
// production (single-user in-memory token store).
//
//   Run: pnpm e2e:minio:server   (loads local-dev/.env.minio via dotenv-cli)
//   Requires: pnpm --filter @upup/server build  (resolves @upup/server/express)
import express from 'express'
import { createUpupMiddleware } from '@upup/server/express'
import { InMemoryTokenStore } from '@upup/server'

const PORT = Number(process.env.UPUP_E2E_SERVER_PORT ?? 53060)
const STORYBOOK_ORIGIN =
  process.env.UPUP_E2E_STORYBOOK_ORIGIN ?? 'http://localhost:53052'

const required = [
  'UPUP_E2E_BUCKET',
  'UPUP_E2E_REGION',
  'UPUP_E2E_ENDPOINT',
  'MINIO_ROOT_USER',
  'MINIO_ROOT_PASSWORD',
]
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  console.error(
    `[upup-e2e] missing env: ${missing.join(', ')} — create local-dev/.env.minio from the example`,
  )
  process.exit(1)
}

const config = {
  storage: {
    type: 'aws',
    bucket: process.env.UPUP_E2E_BUCKET,
    region: process.env.UPUP_E2E_REGION,
    endpoint: process.env.UPUP_E2E_ENDPOINT,
    forcePathStyle: true,
    accessKeyId: process.env.MINIO_ROOT_USER,
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD,
  },
  tokenStore: new InMemoryTokenStore(),
  providers: {
    googleDrive: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  cors: {
    allowedOrigins: [STORYBOOK_ORIGIN],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
}

const app = express()
app.use(express.json({ limit: '5mb' }))
app.get('/healthz', (_req, res) => res.status(200).send('ok'))
app.use(createUpupMiddleware(config))

app.listen(PORT, () => {
  const gd = config.providers.googleDrive.clientId ? 'configured' : 'NOT configured'
  console.log(`[upup-e2e] presign/transfer server: http://localhost:${PORT}`)
  console.log(`[upup-e2e] storage: ${config.storage.endpoint} bucket=${config.storage.bucket}`)
  console.log(`[upup-e2e] CORS origin: ${STORYBOOK_ORIGIN}`)
  console.log(`[upup-e2e] google-drive OAuth: ${gd} (redirect http://localhost:${PORT}/auth/google-drive/cb)`)
})
