import { InMemoryTokenStore } from '@useupup/server'
import { createUpupNextHandler } from '@useupup/server/next'
import { env, requireServerEnv } from '@/lib/env'

let _handler: ReturnType<typeof createUpupNextHandler> | null = null
function handler() {
    if (_handler) return _handler

    const required = requireServerEnv(['UPUP_UPLOAD_TOKEN_SECRET'] as const)

    // Only pass providers that are fully configured — the handler refuses
    // empty-string secrets at construct time, so a half-configured provider
    // (id without secret) would take the whole upload surface down with it.
    const providers = {
        ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
            ? {
                  googleDrive: {
                      clientId: env.GOOGLE_CLIENT_ID,
                      clientSecret: env.GOOGLE_CLIENT_SECRET,
                  },
              }
            : {}),
        ...(env.DROPBOX_CLIENT_ID && env.DROPBOX_APP_SECRET
            ? {
                  dropbox: {
                      appKey: env.DROPBOX_CLIENT_ID,
                      appSecret: env.DROPBOX_APP_SECRET,
                  },
              }
            : {}),
        ...(env.ONEDRIVE_CLIENT_ID && env.ONEDRIVE_CLIENT_SECRET
            ? {
                  oneDrive: {
                      clientId: env.ONEDRIVE_CLIENT_ID,
                      clientSecret: env.ONEDRIVE_CLIENT_SECRET,
                  },
              }
            : {}),
        ...(env.BOX_CLIENT_ID && env.BOX_CLIENT_SECRET
            ? {
                  box: {
                      clientId: env.BOX_CLIENT_ID,
                      clientSecret: env.BOX_CLIENT_SECRET,
                  },
              }
            : {}),
    }

    _handler = createUpupNextHandler(
        {
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
            providers,
            // Demo-grade token store: in-memory, per-process — drive OAuth sessions
            // reset on container restart. A real deployment supplies a Redis/DB store.
            tokenStore: new InMemoryTokenStore(),
        },
        {
            // Behind Traefik on the deployed compose, req.url's origin is the
            // container-internal host (localhost:3000) — the derived OAuth
            // redirect_uri is wrong without the x-forwarded-* override. Traefik
            // owns those headers per-domain, so trusting them is safe here; with
            // no proxy (local dev) there are no forwarded headers and this no-ops.
            trustProxy: true,
        },
    )

    return _handler
}

export const GET = (req: Request) => handler().GET(req)
export const POST = (req: Request) => handler().POST(req)
export const PUT = (req: Request) => handler().PUT(req)
export const DELETE = (req: Request) => handler().DELETE(req)
