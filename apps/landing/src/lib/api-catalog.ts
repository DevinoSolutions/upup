// The body of /.well-known/api-catalog (RFC 9727): a linkset (RFC 9264) whose
// first context is the catalog itself, listing each API as an `item`, followed
// by one context per API carrying its documentation links. Fleet agent-surface
// contract, GetItDone T-5785.
//
// Only what exists goes in. upup is an SDK, not a hosted service: its one HTTP
// API is the one `createUpupHandler()` from @useupup/server serves, and it runs
// on the developer's OWN server, at whatever prefix they mount it. So the
// catalog points at that API's wire-level reference (every route, body, status
// code and header) rather than at an endpoint on useupup.com. The routes under
// useupup.com/api/ are this site's own demo backend, docs search and support
// form: robots.txt keeps crawlers off them and none is offered as an API.
// There is no OpenAPI description, so no `service-desc` is claimed.
import { canonicalUrl, siteUrl } from '@/lib/site-url'

export const API_CATALOG_PATH = '/.well-known/api-catalog'

/** The docs page of the @useupup/server HTTP API (content/docs/api-reference/server-http.mdx). */
export const SERVER_HTTP_DOCS_SLUG = 'api-reference/server-http'

interface LinkTarget {
    href: string
    type?: string
    title?: string
}

export interface LinkContext {
    anchor: string
    [relation: string]: string | LinkTarget[]
}

export function apiCatalog(): { linkset: LinkContext[] } {
    const site = siteUrl()
    const serverHttpDocs = canonicalUrl(`docs/${SERVER_HTTP_DOCS_SLUG}`)
    return {
        linkset: [
            {
                anchor: `${site}${API_CATALOG_PATH}`,
                item: [
                    {
                        href: serverHttpDocs,
                        type: 'text/html',
                        title: '@useupup/server HTTP API (self-hosted: runs on your own server via createUpupHandler)',
                    },
                ],
            },
            {
                anchor: serverHttpDocs,
                'service-doc': [
                    {
                        href: serverHttpDocs,
                        type: 'text/html',
                        title: 'Server HTTP API reference',
                    },
                    {
                        href: `${site}/docs/${SERVER_HTTP_DOCS_SLUG}.md`,
                        type: 'text/markdown',
                        title: 'Server HTTP API reference (Markdown)',
                    },
                    {
                        href: `${site}/llms-full.txt`,
                        type: 'text/plain',
                        title: 'Full upup docs corpus for agents',
                    },
                ],
            },
        ],
    }
}
