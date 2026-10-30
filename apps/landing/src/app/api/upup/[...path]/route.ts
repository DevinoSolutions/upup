import { InMemoryTokenStore } from '@useupup/server'
import { createUpupNextHandler } from '@useupup/server/next'
import { withDemoRateLimit } from '@/lib/demo-rate-limit'
import { withVaryOrigin } from '@/lib/demo-vary-origin'
import { getVisitorId, withDemoVisitor } from '@/lib/demo-visitor'
import { env, requireServerEnv } from '@/lib/env'

// Largest file the homepage/interactive demo offers (its max-file-size control
// tops out at 100 MB; the landing default is 25 MB). Enforced server-side so a
// direct caller can't presign an arbitrarily large object on the demo bucket.
const DEMO_MAX_FILE_SIZE = 100 * 1024 * 1024

type DemoHandlers = Record<
    'GET' | 'POST' | 'PUT' | 'DELETE',
    (req: Request) => Promise<Response>
>

let _handler: DemoHandlers | null = null
function handler(): DemoHandlers {
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

    const inner = createUpupNextHandler(
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
            // Every visitor gets their own signed-cookie identity (see
            // lib/demo-visitor.ts). getUserId never returns null, so neither
            // allowAnonymous nor allowAnonymousUploads is needed: drive tokens,
            // OAuth state and upload keys are all namespaced per visitor.
            getUserId: getVisitorId,
            maxFileSize: DEMO_MAX_FILE_SIZE,
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

    const secret = required.UPUP_UPLOAD_TOKEN_SECRET
    _handler = {
        GET: withVaryOrigin(
            withDemoRateLimit(withDemoVisitor(secret, inner.GET)),
        ),
        POST: withVaryOrigin(
            withDemoRateLimit(withDemoVisitor(secret, inner.POST)),
        ),
        PUT: withVaryOrigin(
            withDemoRateLimit(withDemoVisitor(secret, inner.PUT)),
        ),
        DELETE: withVaryOrigin(
            withDemoRateLimit(withDemoVisitor(secret, inner.DELETE)),
        ),
    }
    return _handler
}

export const GET = (req: Request) => handler().GET(req)
export const POST = (req: Request) => handler().POST(req)
export const PUT = (req: Request) => handler().PUT(req)
export const DELETE = (req: Request) => handler().DELETE(req)
