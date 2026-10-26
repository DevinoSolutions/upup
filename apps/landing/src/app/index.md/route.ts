// GET /index.md: the home page's Markdown twin (fleet agent-surface contract,
// GetItDone T-5785). Also the answer to `GET /` with `Accept: text/markdown`:
// next.config.mjs rewrites that request here before the HTML page can match,
// and puts a `Link` to this URL on the HTML answer.
//
// The body is src/lib/home-markdown.ts. The headers are the point:
//  - `Vary: Accept` + `Cache-Control: private, no-store`, because `/` now has
//    two bodies and no shared cache may ever hold the Markdown one;
//  - `Link: <https://useupup.com/>; rel="canonical"`, the only place a
//    non-HTML answer can name its page, so /index.md is never indexed as a
//    thinner copy of the home page.
//
// Dynamic on purpose: a prerendered route handler is served with Next's own
// `Vary` list, which would replace `Vary: Accept`. Rendering is a string join.
import { MARKDOWN_TWIN_HEADERS, renderHomeMarkdown } from '@/lib/home-markdown'
import { canonicalUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export function GET(): Response {
    return new Response(`${renderHomeMarkdown()}\n`, {
        status: 200,
        headers: {
            ...MARKDOWN_TWIN_HEADERS,
            link: `<${canonicalUrl()}>; rel="canonical"`,
        },
    })
}
