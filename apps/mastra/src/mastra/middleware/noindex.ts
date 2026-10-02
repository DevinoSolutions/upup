type Context = {
    header: (name: string, value: string) => void
}
type Next = () => Promise<void>

/**
 * Keeps every Mastra response out of search indexes.
 *
 * The server is mounted publicly at useupup.com/mastra (Traefik strips the
 * prefix), and its root answers 200 with a bare "Mastra Server" HTML page that
 * Google had already listed for the site. Nothing here is meant to be found
 * from search, so every response carries `x-robots-tag: noindex, nofollow`.
 *
 * The header is set AFTER `next()` so it lands on the final response —
 * including the 401/403/429 the guards below it return without calling next.
 * Register it first in `server.middleware` for that reason.
 */
const NOINDEX_HEADER_VALUE = 'noindex, nofollow'

export function noindexMiddleware() {
    return async (c: Context, next: Next) => {
        await next()
        c.header('x-robots-tag', NOINDEX_HEADER_VALUE)
    }
}
