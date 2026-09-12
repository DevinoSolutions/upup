import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMDX } from 'fumadocs-mdx/next'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../..')

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

// Build-time mirror of src/lib/site-url.ts (next.config cannot import from
// src). The docs subdomain (`docs.<host>`) is a courtesy alias for agents and
// humans guessing the common docs-URL shape — it 301s into the canonical
// `/docs` path on the main host rather than serving content, so there is
// never a second indexable docs origin.
const SITE_BASE = (
    process.env.NEXT_PUBLIC_BASE_URL || 'https://useupup.com'
).replace(/\/+$/, '')
const SITE_HOST = new URL(SITE_BASE).host
const DOCS_ALIAS_HOST = `docs.${SITE_HOST}`
// `www.<host>` resolves to this same app, so without a redirect the whole site
// is served twice under two hostnames. Page canonicals already point at the
// apex, but a canonical is a hint — this makes the apex the only 200.
const WWW_HOST = `www.${SITE_HOST}`
// Mirrors src/lib/site-url.ts's isProductionSite(). Non-production hosts serve
// a byte-identical copy of the site, so they get a noindex header.
const IS_PRODUCTION_SITE = SITE_HOST === 'useupup.com'

const nextConfig = {
    reactStrictMode: true,
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    experimental: !isDev
        ? {
              optimizePackageImports: ['@stackblitz/sdk'],
          }
        : undefined,
    transpilePackages: ['@stackblitz/sdk', '@useupup/interactive-example'],
    trailingSlash: true,
    turbopack: {
        root: repoRoot,
    },
    async rewrites() {
        // llms.txt / llms-full.txt: served from a dedicated docs-llms route
        // group so the catch-all `/docs/[[...slug]]` fumadocs route never
        // sees them. The llms.txt convention's canonical location is the site
        // root, so those two are rewritten there too, alongside the /docs/
        // copies referenced from within the docs themselves.
        return [
            { source: '/docs/llms.txt', destination: '/docs-llms/llms.txt' },
            {
                source: '/docs/llms-full.txt',
                destination: '/docs-llms/llms-full.txt',
            },
            { source: '/llms.txt', destination: '/docs-llms/llms.txt' },
            {
                source: '/llms-full.txt',
                destination: '/docs-llms/llms-full.txt',
            },
        ]
    },
    // The legacy Docusaurus app (apps/docs) that used to serve /documentation
    // is gone; every old URL permanently redirects into the new /docs surface
    // that now lives in this app. Specific sources are listed before the
    // wildcard so they win the match. A single `:path*` source (no separate
    // slashed variant needed) covers both a bare and a trailing-slash legacy
    // request — verified live: with trailingSlash:true, Next's OWN trailing-
    // slash redirect runs BEFORE this one for an unslashed request (it
    // normalizes `/documentation/x` -> `/documentation/x/` first, a 308),
    // then this rule fires (-> `/docs/x`, 308), then trailingSlash normalizes
    // the destination too (-> `/docs/x/`, 308) — 3 hops total but the same
    // final URL a slashed request reaches in 2 (this rule fires directly,
    // then one trailingSlash hop appends the slash).
    async redirects() {
        return [
            // http -> https, FIRST so no other rule can answer a plaintext
            // request with a 200. Keyed on Cloudflare's `cf-visitor` header
            // (`{"scheme":"http"}`) and NOTHING else: `x-forwarded-proto` is
            // rewritten by Traefik on the way to this container, so a rule
            // reading it sees "http" on every request and redirects forever.
            // Cloudflare's own "Always Use HTTPS" toggle is the belt (an owner
            // item); this is the braces that lives in the repo and survives a
            // zone-settings change.
            //
            // TWO rules, because Next strips the trailing slash before matching
            // a source and does NOT re-append it to an ABSOLUTE destination
            // (it does for relative ones) — a single `${SITE_BASE}/:path*`
            // sends /react/ to `…/react`, costing a second 308. The first rule
            // therefore matches extensionless paths only (`[^/.]+` final
            // segment) and restores the slash; file paths and the bare root
            // fall through to the second, which must NOT gain one.
            {
                source: '/:path((?:[^/]+/)*[^/.]+)',
                has: [
                    {
                        type: 'header',
                        key: 'cf-visitor',
                        value: '.*"scheme":"http".*',
                    },
                ],
                destination: `${SITE_BASE}/:path/`,
                permanent: true,
            },
            {
                source: '/:path*',
                has: [
                    {
                        type: 'header',
                        key: 'cf-visitor',
                        value: '.*"scheme":"http".*',
                    },
                ],
                destination: `${SITE_BASE}/:path*`,
                permanent: true,
            },
            // The wildcard `/documentation/:path*` rule below also covers the
            // bare path (`:path*` matches zero segments) — this explicit entry
            // is kept for clarity, not necessity.
            {
                source: '/documentation',
                destination: '/docs/',
                permanent: true,
            },
            {
                source: '/documentation/llms.txt',
                destination: '/llms.txt',
                permanent: true,
            },
            {
                source: '/documentation/llms-full.txt',
                destination: '/llms-full.txt',
                permanent: true,
            },
            {
                source: '/documentation/migration/v2-to-v2.1',
                destination: '/docs/migration/v1-to-v3/',
                permanent: true,
            },
            // Docusaurus generated-index (category) pages have no counterpart
            // in the new tree — sections are sidebar folders without index
            // pages — so each legacy section URL maps to the section's first
            // page (meta.json order). Two shapes existed: default
            // `/category/<label>` URLs and custom-slug URLs (quickstarts,
            // comparisons). Must precede the wildcard below.
            {
                source: '/documentation/quickstarts',
                destination: '/docs/quickstarts/react/',
                permanent: true,
            },
            {
                source: '/documentation/comparisons',
                destination: '/docs/comparisons/upup-vs-uppy/',
                permanent: true,
            },
            {
                source: '/documentation/category/api-reference',
                destination: '/docs/api-reference/s3-generate-presigned-url/',
                permanent: true,
            },
            {
                source: '/documentation/category/upupuploader',
                destination: '/docs/api-reference/upupuploader/required-props/',
                permanent: true,
            },
            // Two sitemap URLs still registered in Search Console from the
            // Docusaurus era, both currently dead: `/sitemap-landing.xml` is a
            // bare 404 (nothing ever served it), and `/documentation/sitemap.xml`
            // fell through to the wildcard below, which appends a slash to a
            // FILE path and lands on the docs catch-all's 404. GSC has been
            // reporting "couldn't fetch" for both ever since. Extension paths
            // get no trailing-slash hop, so each of these is a single 308.
            // They must precede the wildcard. (Owner follow-up: delete the two
            // stale submissions in Search Console once these are live.)
            {
                source: '/sitemap-landing.xml',
                destination: '/sitemap.xml',
                permanent: true,
            },
            {
                source: '/documentation/sitemap.xml',
                destination: '/sitemap.xml',
                permanent: true,
            },
            // Destination carries the trailing slash so trailingSlash:true
            // does not have to spend a SECOND 308 appending it. Safe here only
            // because every extensionless legacy path maps to a real page and
            // the file paths under /documentation are handled by the explicit
            // llms + sitemap rules above — a slash appended to a file URL would
            // break it (Next never slashes paths with an extension).
            {
                source: '/documentation/:path*',
                destination: '/docs/:path*/',
                permanent: true,
            },
            // docs.<host> alias — placed AFTER the /documentation rules on
            // purpose: a legacy path on the alias host takes the relative
            // /documentation/* -> /docs/* hop first (staying on the alias
            // host), then the /docs/* rule below moves it to the main host.
            //
            // The explicit rules come before the two catch-alls because a
            // catch-all destination of `/docs/:path*/` is wrong for exactly
            // two shapes: an EMPTY `:path*` (which would render `/docs//`) and
            // a FILE path (which must not gain a trailing slash). Listing them
            // explicitly lets the catch-alls stay slashed for the page shapes
            // that are 99% of alias traffic.
            //
            // robots.txt and sitemap.xml are the file paths a crawler probes on
            // any host it meets. Without these two they took the catch-all to
            // `${SITE_BASE}/docs/robots.txt/`, then a trailing-slash hop, then
            // the docs catch-all's 404 — a broken robots on a live alias host.
            // They belong on the APEX copies, not under /docs.
            {
                source: '/robots.txt',
                has: [{ type: 'host', value: DOCS_ALIAS_HOST }],
                destination: `${SITE_BASE}/robots.txt`,
                permanent: true,
            },
            {
                source: '/sitemap.xml',
                has: [{ type: 'host', value: DOCS_ALIAS_HOST }],
                destination: `${SITE_BASE}/sitemap.xml`,
                permanent: true,
            },
            {
                source: '/llms.txt',
                has: [{ type: 'host', value: DOCS_ALIAS_HOST }],
                destination: `${SITE_BASE}/docs/llms.txt`,
                permanent: true,
            },
            {
                source: '/llms-full.txt',
                has: [{ type: 'host', value: DOCS_ALIAS_HOST }],
                destination: `${SITE_BASE}/docs/llms-full.txt`,
                permanent: true,
            },
            // Bare alias root and a bare `/docs` on the alias — the empty
            // `:path*` cases the catch-alls below cannot express.
            {
                source: '/',
                has: [{ type: 'host', value: DOCS_ALIAS_HOST }],
                destination: `${SITE_BASE}/docs/`,
                permanent: true,
            },
            {
                source: '/docs',
                has: [{ type: 'host', value: DOCS_ALIAS_HOST }],
                destination: `${SITE_BASE}/docs/`,
                permanent: true,
            },
            // The /docs/* source must precede the catch-all so an already-
            // prefixed path isn't doubled to /docs/docs/*.
            {
                source: '/docs/:path*',
                has: [{ type: 'host', value: DOCS_ALIAS_HOST }],
                destination: `${SITE_BASE}/docs/:path*/`,
                permanent: true,
            },
            {
                source: '/:path*',
                has: [{ type: 'host', value: DOCS_ALIAS_HOST }],
                destination: `${SITE_BASE}/docs/:path*/`,
                permanent: true,
            },
            // www.<host> -> apex. Catch-all only: www serves the SAME routes,
            // so unlike the docs alias there is no /docs prefixing. The bare
            // root is listed separately for the same empty-`:path*` reason.
            {
                source: '/',
                has: [{ type: 'host', value: WWW_HOST }],
                destination: `${SITE_BASE}/`,
                permanent: true,
            },
            {
                source: '/:path*',
                has: [{ type: 'host', value: WWW_HOST }],
                destination: `${SITE_BASE}/:path*`,
                permanent: true,
            },
        ]
    },
    // Two mutually exclusive header sets.
    //
    // PRODUCTION: HSTS. Two years + includeSubDomains + preload is the
    // preload-list-eligible value; the site is https-only in practice and the
    // cf-visitor redirect above guarantees a plaintext request never gets a
    // 200, so there is no http-only subdomain this can strand. (Submitting to
    // hstspreload.org is an owner step, taken only after the header has been
    // live for a while — `preload` in the value is a prerequisite, not the
    // submission itself.)
    //
    // NON-PRODUCTION (dev, previews): those hosts serve a byte-identical copy
    // of the whole site. robots.txt disallows crawling there; this header is
    // what actually keeps a URL discovered some other way out of the index.
    // They get no HSTS — a preload directive from a preview host is a
    // liability, not a protection.
    async headers() {
        if (IS_PRODUCTION_SITE) {
            return [
                {
                    source: '/:path*',
                    headers: [
                        {
                            key: 'Strict-Transport-Security',
                            value: 'max-age=63072000; includeSubDomains; preload',
                        },
                    ],
                },
            ]
        }
        return [
            {
                source: '/:path*',
                headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
            },
        ]
    },
}

const withMDX = createMDX()

/**
 * fumadocs-mdx 15.2.0 (npm latest, verified no newer dist-tag exists) emits
 * turbopack rule conditions for its *.json/*.yaml meta-loader using a `query`
 * key — a webpack `resourceQuery`-style match that next@16.1.6's
 * TurbopackRuleCondition schema no longer accepts (only all/any/not/path/
 * content/builtin — see node_modules/next/dist/server/config-shared.d.ts).
 * Turbopack panics parsing the config without this fix. Rewrite the
 * offending conditions to an equivalent `path` restriction scoped to the
 * docs content dir, since content/docs is the only place fumadocs generates
 * meta.json/meta.yaml imports for. Delete this shim once fumadocs-mdx ships
 * a Next-16-compatible Turbopack adapter (re-test by removing it and
 * building — if the build still passes AND no "Unrecognized key(s)"
 * warning appears, the upstream fix has landed).
 */
function sanitizeTurbopackRules(config) {
    const rules = config.turbopack?.rules
    if (!rules) return config
    for (const rule of Object.values(rules)) {
        // Only a top-level `query` key is stripped. A future fumadocs version
        // nesting conditions under all/any/not would slip past this shim and
        // Turbopack would panic loudly again — re-handle it then.
        if (
            rule &&
            typeof rule === 'object' &&
            rule.condition &&
            'query' in rule.condition
        ) {
            const rest = { ...rule.condition }
            delete rest.query
            rule.condition = { ...rest, path: '**/content/docs/**' }
        }
    }
    return config
}

export default sanitizeTurbopackRules(withMDX(nextConfig))
