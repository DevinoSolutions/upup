import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMDX } from 'fumadocs-mdx/next'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../..')

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

const docsPort = process.env.DOCS_PORT || '53002'
const docsOrigin = `http://localhost:${docsPort}`

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
        if (isDev) {
            return {
                beforeFiles: [
                    {
                        source: '/documentation',
                        destination: `${docsOrigin}/documentation/`,
                    },
                    {
                        source: '/documentation/:path*',
                        destination: `${docsOrigin}/documentation/:path*`,
                    },
                ],
                afterFiles: [],
                fallback: [],
            }
        }

        return [
            {
                source: '/documentation/:path*',
                destination: '/documentation/index.html',
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
