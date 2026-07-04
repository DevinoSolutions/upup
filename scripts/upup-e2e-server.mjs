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
// Comma-separated list so the cross-framework e2e gate can allow all six
// storybook origins (:53050–:53055) at once. A single value still works.
const STORYBOOK_ORIGIN =
  process.env.UPUP_E2E_STORYBOOK_ORIGIN ?? 'http://localhost:53052'
const ALLOWED_ORIGINS = STORYBOOK_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean)

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
  uploadTokenSecret:
    process.env.UPUP_E2E_UPLOAD_TOKEN_SECRET ?? 'upup-e2e-dev-secret-not-for-prod',
  // Single-user dev harness: one shared anonymous namespace is intentional.
  allowAnonymous: true,
  allowAnonymousUploads: true,
  tokenStore: new InMemoryTokenStore(),
  providers: {
    googleDrive: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  cors: {
    allowedOrigins: ALLOWED_ORIGINS,
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
  console.log(`[upup-e2e] CORS origins: ${ALLOWED_ORIGINS.join(', ')}`)
  console.log(`[upup-e2e] google-drive OAuth: ${gd} (redirect http://localhost:${PORT}/auth/google-drive/cb)`)
})
