import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMDX } from 'fumadocs-mdx/next'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../..')

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

const nextConfig = {
    reactStrictMode: true,
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    experimental: !isDev
        ? {
              optimizePackageImports: ['@stackblitz/sdk'],
          }
        : undefined,
    transpilePackages: ['@stackblitz/sdk', '@upupjs/interactive-example'],
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
            {
                source: '/documentation/:path*',
                destination: '/docs/:path*',
                permanent: true,
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
