import { defineUpupConfig } from '@upup/next/server'
import type { UpupServerConfig } from '@upup/next/server'

// Local MinIO from the repo's e2e:minio infra. Ports are remapped to 9100/9101
// on this machine; .env.minio (loaded by the dev script) overrides these defaults.
export const upupConfig: UpupServerConfig = defineUpupConfig({
  storage: {
    type: 'aws',
    bucket: process.env.UPUP_E2E_BUCKET ?? 'upup-e2e',
    region: process.env.UPUP_E2E_REGION ?? 'us-east-1',
    endpoint: process.env.UPUP_E2E_ENDPOINT ?? 'http://localhost:9100',
    accessKeyId: process.env.MINIO_ROOT_USER ?? 'upupadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'upupadmin123',
    forcePathStyle: true,
  },
  uploadTokenSecret:
    process.env.UPUP_UPLOAD_TOKEN_SECRET ?? 'next-example-dev-secret-not-for-prod',
  // Demo app: single shared namespace. Real apps set getUserId instead.
  allowAnonymous: true,
  allowAnonymousUploads: true,
})
