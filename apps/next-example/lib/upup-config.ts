import { defineUpupConfig } from '@upup/next/server'
import type { UpupServerConfig } from '@upup/next/server'
import { env } from './env'

export const upupConfig: UpupServerConfig = defineUpupConfig({
  storage: {
    type: 'aws',
    bucket: env.UPUP_E2E_BUCKET,
    region: env.UPUP_E2E_REGION,
    endpoint: env.UPUP_E2E_ENDPOINT,
    accessKeyId: env.MINIO_ROOT_USER,
    secretAccessKey: env.MINIO_ROOT_PASSWORD,
    forcePathStyle: true,
  },
  uploadTokenSecret: env.UPUP_UPLOAD_TOKEN_SECRET,
  // Demo app: single shared namespace. Real apps set getUserId instead.
  allowAnonymous: true,
  allowAnonymousUploads: true,
})
