import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import EntityStructuredData from '@/components/StructuredData/EntityStructuredData'
import StructuredData from '@/components/StructuredData'
import { AI_CRAWLER_USER_AGENTS } from '@/lib/seo/ai-crawlers'

// The public site's machine-readable surfaces — sitemap, robots, JSON-LD — are
// the ones nobody looks at until a search engine has already acted on them.
// Every assertion here pins a decision that was made deliberately and would be
// silently reversible otherwise (a fake lastmod, a stray /mobile-demo entry, a
// Review node nobody can substantiate).

const PRODUCTION_ORIGIN = 'https://useupup.com'

/** Every `application/ld+json` payload in a rendered markup string. */
function parseJsonLdBlocks(markup: string): unknown[] {
    const blocks = [
        ...markup.matchAll(
            /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
        ),
    ]
    return blocks.map(match => JSON.parse(match[1]) as unknown)
}

/** Flattens `@graph` containers so nodes can be looked up by `@type`. */
function flattenGraph(documents: unknown[]): Record<string, unknown>[] {
    const nodes: Record<string, unknown>[] = []
    for (const doc of documents) {
        const record = doc as Record<string, unknown>
        const graph = record['@graph']
        if (Array.isArray(graph))
            nodes.push(...(graph as Record<string, unknown>[]))
        else nodes.push(record)
    }
    return nodes
}

function nodeOfType(
    nodes: Record<string, unknown>[],
    type: string,
): Record<string, unknown> {
    const found = nodes.find(node => node['@type'] === type)
    expect(found, `no ${type} node in the rendered JSON-LD`).toBeDefined()
    return found as Record<string, unknown>
}

describe('sitemap enumerates only canonical, indexable page URLs', () => {
    const entries = sitemap()

    it('lists the homepage, six framework pages, support and privacy, and all 64 docs pages', () => {
        // 1 home + 6 frameworks + support + privacy + 64 fumadocs pages. The
        // docs count is independently pinned by docs-source.test.ts, so a page
        // added to content/docs updates both or neither.
        expect(entries).toHaveLength(1 + 6 + 2 + 64)
    })

    it('points every entry at the production origin with the trailing slash the site actually serves', () => {
        for (const entry of entries) {
            expect(entry.url.startsWith(`${PRODUCTION_ORIGIN}/`)).toBe(true)
            expect(entry.url.endsWith('/')).toBe(true)
        }
    })

    it('omits the demo harness, the API routes, and the agent-only text surfaces', () => {
        // /mobile-demo and /api are robots-disallowed; /docs-md and /llms*.txt
        // are alternate representations of pages already listed here, not pages.
        const excluded = ['/mobile-demo', '/api/', '/docs-md', '/llms']
        for (const entry of entries) {
            for (const fragment of excluded) {
                expect(
                    entry.url.includes(fragment),
                    `${entry.url} must not contain ${fragment}`,
                ).toBe(false)
            }
        }
    })

    it('stamps no lastModified date on any entry', () => {
        // A build-time `new Date()` on all 73 URLs claimed the whole site
        // changed on every deploy; Google's response to an uncorroborated
        // lastmod is to ignore the field site-wide. No real per-page date
        // exists, so the field stays absent rather than invented.
        for (const entry of entries) {
            expect(entry.lastModified, `${entry.url} lastModified`).toBe(
                undefined,
            )
        }
    })
})

describe('robots.txt grants crawl access per host and names the AI agents', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.resetModules()
    })

    it('allows the whole site to the wildcard agent except the API and demo harness', () => {
        const rules = [robots().rules].flat()
        const wildcard = rules.find(rule => rule.userAgent === '*')
        expect(wildcard?.allow).toBe('/')
        expect(wildcard?.disallow).toEqual(['/api/', '/mobile-demo/'])
    })

    it('carries a second rule listing exactly the AI crawler allow-list', () => {
        const rules = [robots().rules].flat()
        const agentRule = rules.find(rule => Array.isArray(rule.userAgent))
        expect(agentRule?.userAgent).toEqual([...AI_CRAWLER_USER_AGENTS])
        expect(agentRule?.allow).toBe('/')
        // The named agents must never get a laxer disallow set than `*`.
        expect(agentRule?.disallow).toEqual(['/api/', '/mobile-demo/'])
    })

    it('advertises the production sitemap URL', () => {
        expect(robots().sitemap).toBe(`${PRODUCTION_ORIGIN}/sitemap.xml`)
    })

    it('blanket-disallows crawling when the deployment is not the production site', async () => {
        // clientEnv is parsed once at module load, so the stub has to land
        // before a FRESH import of the robots route and the site-url helper
        // underneath it.
        vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://dev.useupup.com')
        vi.resetModules()
        const devRobots = (await import('@/app/robots')).default
        const result = devRobots()
        expect(result.rules).toEqual([{ userAgent: '*', disallow: '/' }])
        expect(result.sitemap).toBe('https://dev.useupup.com/sitemap.xml')
    })
})

describe('entity JSON-LD ties the brand to one referenced organization', () => {
    const entityNodes = flattenGraph(
        parseJsonLdBlocks(
            renderToStaticMarkup(createElement(EntityStructuredData)),
        ),
    )

    it('describes the Organization with a stable id, alternate names, and verified profiles', () => {
        const org = nodeOfType(entityNodes, 'Organization')
        expect(org['@id']).toBe(`${PRODUCTION_ORIGIN}/#organization`)
        expect(org.name).toBe('upup')
        expect(org.alternateName).toContain('useupup')
        expect(org.alternateName).toContain('@useupup')
        const sameAs = org.sameAs as string[]
        expect(sameAs.length).toBeGreaterThanOrEqual(2)
        for (const profile of sameAs)
            expect(profile.startsWith('https://')).toBe(true)
    })

    it('names Devino as the parent organization', () => {
        const org = nodeOfType(entityNodes, 'Organization')
        expect(org.parentOrganization).toEqual({
            '@type': 'Organization',
            name: 'Devino',
            url: 'https://devino.ca/',
        })
    })

    it('makes the WebSite publisher reference the organization node by id', () => {
        const site = nodeOfType(entityNodes, 'WebSite')
        expect(site['@id']).toBe(`${PRODUCTION_ORIGIN}/#website`)
        expect(site.publisher).toEqual({
            '@id': `${PRODUCTION_ORIGIN}/#organization`,
        })
    })

    it('makes the page-level SoftwareApplication publisher reference the same organization node', () => {
        const pageNodes = flattenGraph(
            parseJsonLdBlocks(
                renderToStaticMarkup(createElement(StructuredData)),
            ),
        )
        const app = nodeOfType(pageNodes, 'SoftwareApplication')
        expect(app['@id']).toBe(`${PRODUCTION_ORIGIN}/#software`)
        expect(app.publisher).toEqual({
            '@id': `${PRODUCTION_ORIGIN}/#organization`,
        })
        expect(app.author).toEqual({
            '@id': `${PRODUCTION_ORIGIN}/#organization`,
        })
    })

    it('emits no AggregateRating or Review anywhere in the rendered markup', () => {
        // We have no first-party review corpus. Rating markup we cannot
        // substantiate is a manual-action risk, so its absence is a pin, not
        // an omission — this fails the moment someone adds one.
        const markup =
            renderToStaticMarkup(createElement(EntityStructuredData)) +
            renderToStaticMarkup(createElement(StructuredData))
        expect(markup).not.toContain('AggregateRating')
        expect(markup).not.toContain('"Review"')
    })
})

describe('AI crawler allow-list holds the exact agreed agent names', () => {
    it('pins all eighteen user-agent tokens in their published spelling', () => {
        // Spelling is load-bearing: robots.txt user-agent matching is on these
        // literal tokens, so a "tidied" name silently drops that agent's group.
        expect([...AI_CRAWLER_USER_AGENTS]).toEqual([
            'GPTBot',
            'OAI-SearchBot',
            'ChatGPT-User',
            'ClaudeBot',
            'Claude-User',
            'Claude-SearchBot',
            'anthropic-ai',
            'PerplexityBot',
            'Perplexity-User',
            'Google-Extended',
            'Googlebot',
            'Bingbot',
            'Applebot',
            'Applebot-Extended',
            'CCBot',
            'Amazonbot',
            'Bytespider',
            'meta-externalagent',
        ])
    })
})
