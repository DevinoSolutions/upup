// GET /.well-known/api-catalog: the list of upup's APIs (RFC 9727, a linkset
// per RFC 9264), part of the fleet agent-surface contract (GetItDone T-5785).
// What is in it, and why it points at documentation rather than an endpoint
// on this host: src/lib/api-catalog.ts.
import { API_CATALOG_PATH, apiCatalog } from '@/lib/api-catalog'

// Content is frozen at build time, like llms.txt.
export const dynamic = 'force-static'

export function GET(): Response {
    return new Response(JSON.stringify(apiCatalog(), null, 2), {
        status: 200,
        headers: {
            'content-type':
                'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
            // RFC 9727 section 2: the catalog names itself with rel="api-catalog".
            link: `<${API_CATALOG_PATH}>; rel="api-catalog"`,
            'access-control-allow-origin': '*',
        },
    })
}
