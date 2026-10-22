// Per-IP limit on the demo upload route's session-creating endpoints.
//
// `withDemoVisitor` mints a fresh visitor id for a client that sends no cookie,
// so the visitor id cannot throttle anything: a cookieless client could ask for
// unlimited 100 MB presigns / multipart sessions against the demo bucket. The
// IP is the one identity such a client cannot rotate for free, resolved with the
// support route's trusted-proxy logic (never a raw X-Forwarded-For).
//
// Only /presign and /multipart/init are limited. They are the calls that grant
// storage capability; sign-part / complete / abort / drive routes only continue
// a session already granted, and a legitimate large upload fires many sign-part
// calls, so limiting those would break the real demo.
//
// Sizing: the homepage/mobile demo offers a handful of files, one presign or
// multipart/init each. A burst of 15 covers a multi-file batch plus retries, and
// 15/minute refill keeps a sustained attacker to ~1.5 GB/min of 100 MB sessions
// per IP instead of unbounded.

import {
    clientIpFromHeaders,
    createTokenBucket,
} from '@/lib/support/rate-limit'

export const DEMO_RATE_LIMIT = { capacity: 15, windowMs: 60_000 } as const

const bucket = createTokenBucket(
    DEMO_RATE_LIMIT.capacity,
    DEMO_RATE_LIMIT.windowMs,
)

function isSessionCreating(req: Request): boolean {
    if (req.method !== 'POST') return false
    const path = new URL(req.url).pathname
    return path.endsWith('/presign') || path.endsWith('/multipart/init')
}

export function withDemoRateLimit(
    handle: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
    return async req => {
        if (
            isSessionCreating(req) &&
            !bucket.take(clientIpFromHeaders(req.headers))
        ) {
            return new Response(
                JSON.stringify({
                    error: 'Too many upload requests. Please wait a minute and try again.',
                    code: 'RATE_LIMITED',
                }),
                {
                    status: 429,
                    headers: {
                        'content-type': 'application/json',
                        'retry-after': String(DEMO_RATE_LIMIT.windowMs / 1000),
                    },
                },
            )
        }
        return handle(req)
    }
}
