import { defineUpupConfig } from '@upupjs/next/server'
import type { UpupServerConfig } from '@upupjs/next/server'
import { env, requireServerEnv } from './env'

// Lazy singleton: Next.js imports route modules at build time for page-data
// collection, so a top-level requireServerEnv() throws during `next build`
// when the secrets aren't set. Deferring to first request keeps the build
// clean while still failing fast on a bad deploy.
let _config: UpupServerConfig | null = null

export function getUpupConfig(): UpupServerConfig {
    if (_config) return _config

    const required = requireServerEnv([
        'MINIO_ROOT_USER',
        'MINIO_ROOT_PASSWORD',
        'UPUP_UPLOAD_TOKEN_SECRET',
    ] as const)

    _config = defineUpupConfig({
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
        allowAnonymous: true,
        allowAnonymousUploads: true,
    })

    return _config
}
