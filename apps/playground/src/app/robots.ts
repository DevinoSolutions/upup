import type { MetadataRoute } from 'next'

// The playground is a developer harness, not public content, and it has NO
// production host — deploy/site/README.md routes only dev-playground.useupup.com
// at this app. So there is no "is this prod?" branch to make: every host that
// serves the playground is one that should stay out of search results. Before
// this file existed the app shipped no robots.txt at all, so the only response
// was Cloudflare's managed content-signals boilerplate (comments only, zero
// directives) and the whole app was crawlable by default.
//
// If a public playground host is ever introduced, this becomes a conditional on
// its base URL — mirror apps/landing/src/app/robots.ts rather than inventing a
// second pattern.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: '*', disallow: '/' }],
    }
}
