export type UpupNextOptions = {
    /** Explicit public base URL, e.g. "https://app.example.com". Wins over headers. */
    baseUrl?: string
    /** Trust x-forwarded-* headers to derive the origin. OFF by default (spoofable). */
    trustProxy?: boolean
}

function firstHeader(value: string | null): string | undefined {
    if (!value) return undefined
    const first = value.split(',')[0]?.trim()
    return first || undefined
}

/** Resolve the true public origin, or null when no override applies. */
export function resolveOrigin(
    req: Request,
    opts?: UpupNextOptions,
): string | null {
    if (opts?.baseUrl) return new URL(opts.baseUrl).origin
    if (opts?.trustProxy) {
        const host = firstHeader(req.headers.get('x-forwarded-host'))
        if (host) {
            const proto =
                firstHeader(req.headers.get('x-forwarded-proto')) ?? 'https'
            return `${proto}://${host}`
        }
    }
    return null
}

/**
 * Return a Request whose URL origin reflects the true public origin, so the core
 * handler's OAuth callback URL is correct behind a proxy/CDN. Returns the SAME
 * request untouched when no override applies or the origin already matches.
 */
export function normalizeRequestOrigin(
    req: Request,
    opts?: UpupNextOptions,
): Request {
    const target = resolveOrigin(req, opts)
    if (!target) return req
    const current = new URL(req.url)
    if (current.origin === target) return req

    const nextUrl = new URL(
        current.pathname + current.search,
        target,
    ).toString()
    const method = req.method ?? 'GET'
    const hasBody = method !== 'GET' && method !== 'HEAD'
    const init: RequestInit & { duplex?: 'half' } = {
        method,
        headers: req.headers,
        redirect: req.redirect,
        body: hasBody ? req.body : undefined,
    }
    if (hasBody && req.body) init.duplex = 'half'
    return new Request(nextUrl, init)
}
