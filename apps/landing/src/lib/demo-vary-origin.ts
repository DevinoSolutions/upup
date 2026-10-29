// `Vary: Origin` on every response of the demo upload route.
//
// The route answers cross-origin callers differently from same-origin ones (the
// server package keys CORS decisions on the Origin header), so a shared cache
// must key on Origin too. Applied outermost in the route so it also covers the
// 429 from `withDemoRateLimit`, which never reaches the server package.

function varyIncludesOrigin(vary: string | null): boolean {
    if (!vary) return false
    return vary
        .split(',')
        .map(token => token.trim().toLowerCase())
        .some(token => token === 'origin' || token === '*')
}

export function withVaryOrigin(
    handle: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
    return async req => {
        const res = await handle(req)
        const vary = res.headers.get('vary')
        if (varyIncludesOrigin(vary)) return res

        // Rebuild rather than mutate: a handler may hand back a Response whose
        // headers are immutable.
        const out = new Response(res.body, res)
        out.headers.set('vary', vary ? `${vary}, Origin` : 'Origin')
        return out
    }
}
