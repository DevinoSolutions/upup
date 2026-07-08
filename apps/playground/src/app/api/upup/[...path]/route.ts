import { createUpupNextHandler } from '@upup/server/next'
import { env, requireServerEnv } from '@/lib/env'

// Fail fast (by name) if the HMAC upload-token secret is missing. Constructing
// the real handler on an absent/public secret would defeat the server trust
// model, so this boundary refuses to boot without it. In zero-config mock mode
// this route is never loaded, so `pnpm dev` still works with no env.
const required = requireServerEnv(['UPUP_UPLOAD_TOKEN_SECRET'] as const)

export const { GET, POST, PUT, DELETE } = createUpupNextHandler({
    storage: {
        type: 'backblaze',
        bucket: env.S3_BUCKET!,
        region: env.S3_REGION!,
        accessKeyId: env.S3_KEY_ID!,
        secretAccessKey: env.S3_SECRET!,
        endpoint: env.S3_ENDPOINT!,
    },
    uploadTokenSecret: required.UPUP_UPLOAD_TOKEN_SECRET,
    // Demo app: single shared anonymous namespace. Real apps set getUserId instead.
    allowAnonymous: true,
    allowAnonymousUploads: true,
    providers: {
        // Server-mode OAuth secrets come from env (absent → that drive is simply
        // not configured for server-mode transfer), mirroring dropbox below.
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
