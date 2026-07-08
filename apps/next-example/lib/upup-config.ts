import { defineUpupConfig } from '@upup/next/server'
import type { UpupServerConfig } from '@upup/next/server'
import { env, requireServerEnv } from './env'

// Credentials + HMAC secret are required by name at this boundary — a missing
// one fails loudly here instead of silently booting on a committed default.
// The rest of the site still renders; only the upup route (which imports this
// config) trips the check. Non-secret endpoint/bucket/region keep their :9100
// MinIO defaults from ./env.
const required = requireServerEnv([
    'MINIO_ROOT_USER',
    'MINIO_ROOT_PASSWORD',
    'UPUP_UPLOAD_TOKEN_SECRET',
] as const)

export const upupConfig: UpupServerConfig = defineUpupConfig({
    storage: {
        type: 'aws',
        bucket: env.UPUP_E2E_BUCKET,
        region: env.UPUP_E2E_REGION,
        endpoint: env.UPUP_E2E_ENDPOINT,
        accessKeyId: required.MINIO_ROOT_USER,
        secretAccessKey: required.MINIO_ROOT_PASSWORD,
        forcePathStyle: true,
    },
    uploadTokenSecret: required.UPUP_UPLOAD_TOKEN_SECRET,
    // Demo app: single shared namespace. Real apps set getUserId instead.
    allowAnonymous: true,
    allowAnonymousUploads: true,
})
