import { createUpupNextHandler } from '@upupjs/server/next'
import { env, requireServerEnv } from '@/lib/env'

// Lazy: Next.js imports route modules at build time for page-data collection,
// so top-level requireServerEnv() throws during `next build` when the secrets
// aren't set. Deferring to first request keeps the build clean while still
// failing fast on a bad deploy.
let _handler: ReturnType<typeof createUpupNextHandler> | null = null
function handler() {
    if (_handler) return _handler

    const required = requireServerEnv(['UPUP_UPLOAD_TOKEN_SECRET'] as const)

    _handler = createUpupNextHandler({
        storage: {
            type: 'backblaze',
            bucket: env.S3_BUCKET!,
            region: env.S3_REGION!,
            accessKeyId: env.S3_KEY_ID!,
            secretAccessKey: env.S3_SECRET!,
            endpoint: env.S3_ENDPOINT!,
        },
        uploadTokenSecret: required.UPUP_UPLOAD_TOKEN_SECRET,
        allowAnonymous: true,
        allowAnonymousUploads: true,
        providers: {
            googleDrive: {
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
            dropbox: {
                appKey: env.DROPBOX_CLIENT_ID,
                appSecret: env.DROPBOX_APP_SECRET,
            },
            oneDrive: {
                clientId: env.ONEDRIVE_CLIENT_ID,
                clientSecret: env.ONEDRIVE_CLIENT_SECRET,
            },
        },
    })

    return _handler
}

export const GET = (req: Request) => handler().GET(req)
export const POST = (req: Request) => handler().POST(req)
export const PUT = (req: Request) => handler().PUT(req)
export const DELETE = (req: Request) => handler().DELETE(req)
