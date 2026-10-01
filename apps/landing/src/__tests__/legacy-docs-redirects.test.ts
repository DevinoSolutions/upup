import type { IncomingMessage } from 'node:http'
import { format } from 'node:url'
import type { NextConfig } from 'next'
import loadCustomRoutes, {
    type Redirect,
} from 'next/dist/lib/load-custom-routes'
import { modifyRouteRegex } from 'next/dist/lib/redirect-status'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import {
    matchHas,
    prepareDestination,
} from 'next/dist/shared/lib/router/utils/prepare-destination'
import { normalizeRepeatedSlashes } from 'next/dist/shared/lib/utils'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { source } from '@/lib/docs/source'
import {
    LEGACY_DOCUSAURUS,
    type LegacyUrl,
    legacyDocusaurusUrls,
} from './legacy-docusaurus-urls'

// Every URL the deleted Docusaurus app served, in both of its route shapes,
// must still reach a real docs page. The risk is the newer-shape wildcard
// `/documentation/:path*`: it also captures an older-shape
// `/documentation/docs/<slug>` URL and doubles it into a `/docs/docs/<slug>/`
// 404. These tests replay each legacy URL, slashed and unslashed, through the
// redirect list Next actually serves. loadCustomRoutes() returns the
// next.config redirects with Next's own trailingSlash redirects prepended.
// Each route is compiled the way the router server compiles it
// (server/lib/router-utils/filesystem.js buildCustomRoute: strict
// path-to-regexp, plus modifyRouteRegex's optional trailing slash for
// non-internal routes), and each hop is answered the way resolve-routes
// answers it (first match wins, `has`/`missing` checked against the request,
// destination rendered by prepareDestination, repeated slashes collapsed).
// Hops are followed until no route matches.

// createMDX() writes fumadocs' .source/ tree as a side effect; the redirects
// don't depend on it, so it becomes the identity wrapper.
vi.mock('fumadocs-mdx/next', () => ({
    createMDX: () => (config: NextConfig) => config,
}))

const APEX = 'useupup.com'
const PRODUCTION_ORIGIN = `https://${APEX}`
const MAX_HOPS = 5

interface Hop {
    /** Next's own trailingSlash normalization, not a next.config rule. */
    internal: boolean
    source: string
    /** Absolute URL the Location header points at. */
    to: string
}

interface Trail {
    hops: Hop[]
    /** Absolute URL where the redirects stop. */
    final: string
}

type CompiledRoute = Redirect & {
    internal?: boolean
    match: ReturnType<typeof getPathMatch>
}

// Every request a legacy URL can arrive as: bare and trailing-slashed.
const REQUESTS: LegacyUrl[] = legacyDocusaurusUrls(LEGACY_DOCUSAURUS).flatMap(
    url => [url, { ...url, path: `${url.path}/` }],
)

let routes: CompiledRoute[] = []
let servedPages = new Set<string>()
const trails = new Map<string, Trail>()

/** The hop Next would answer an apex request for `pathname` with, if any. */
function nextHop(pathname: string): Hop | null {
    const req = { headers: { host: APEX } } as unknown as IncomingMessage
    for (const route of routes) {
        const params = route.match(pathname)
        if (!params) continue
        if (route.has || route.missing) {
            const hasParams = matchHas(req, {}, route.has, route.missing)
            if (!hasParams) continue
            Object.assign(params, hasParams)
        }
        const { parsedDestination } = prepareDestination({
            appendParamsToQuery: false,
            destination: route.destination,
            params,
            query: {},
        })
        const location = format({
            ...parsedDestination,
            pathname: normalizeRepeatedSlashes(
                parsedDestination.pathname ?? '/',
            ),
            query: undefined,
            search: '',
        })
        return {
            internal: route.internal === true,
            source: route.source,
            to: new URL(location, PRODUCTION_ORIGIN).href,
        }
    }
    return null
}

function follow(path: string): Trail {
    const hops: Hop[] = []
    let current = new URL(path, PRODUCTION_ORIGIN)
    while (current.origin === PRODUCTION_ORIGIN) {
        const hop = nextHop(current.pathname)
        if (!hop) break
        hops.push(hop)
        if (hops.length > MAX_HOPS) {
            throw new Error(`${path} redirects more than ${MAX_HOPS} times`)
        }
        current = new URL(hop.to)
    }
    return { hops, final: current.href }
}

function relative(url: string): string {
    return url.startsWith(PRODUCTION_ORIGIN)
        ? url.slice(PRODUCTION_ORIGIN.length)
        : url
}

function hopLabel(hop: Hop): string {
    return `${relative(hop.to)}${hop.internal ? ' (trailingSlash)' : ''}`
}

function describeTrail(path: string, { hops }: Trail): string {
    return [path, ...hops.map(hopLabel)].join(' -> ')
}

beforeAll(async () => {
    // SITE_BASE is computed when next.config.mjs loads.
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', PRODUCTION_ORIGIN)
    const config = (await import('../../next.config.mjs')).default as NextConfig
    const { redirects } = await loadCustomRoutes(config)
    routes = redirects.map(redirect => {
        const route = redirect as Redirect & { internal?: boolean }
        return {
            ...route,
            match: getPathMatch(route.source, {
                strict: true,
                removeUnnamedParams: true,
                regexModifier: regex =>
                    route.internal
                        ? regex
                        : modifyRouteRegex(regex, ['/_next']),
            }),
        }
    })
    // A docs page is served at its URL plus the trailing slash
    // (trailingSlash: true).
    servedPages = new Set(
        source
            .getPages()
            .map(page => `${PRODUCTION_ORIGIN}${page.url.replace(/\/$/, '')}/`),
    )
    for (const { path } of REQUESTS) trails.set(path, follow(path))
})

afterAll(() => {
    vi.unstubAllEnvs()
})

describe('legacy Docusaurus /documentation URLs redirect to real docs pages', () => {
    it('replays all 80 legacy URLs, bare and trailing-slashed', () => {
        expect(REQUESTS).toHaveLength(160)
    })

    it('lands every legacy URL of both route shapes on a docs page that exists', () => {
        const misses: string[] = []
        for (const { path } of REQUESTS) {
            const trail = trails.get(path)!
            if (trail.hops.length === 0) {
                misses.push(`${path} matches no redirect`)
            } else if (!servedPages.has(trail.final)) {
                misses.push(
                    `${describeTrail(path, trail)}: ${relative(trail.final)} is no docs page`,
                )
            }
        }
        expect(misses).toEqual([])
    })

    it('reaches that page through exactly one next.config redirect, the last hop', () => {
        // Next's own trailingSlash hop may normalize the REQUEST first (an
        // unslashed page URL, or a slashed dotted one); it is not a rule hop.
        // The rule's destination must then be final. Nothing, not even
        // trailingSlash, may redirect it again.
        const extraHops: string[] = []
        for (const { path } of REQUESTS) {
            const trail = trails.get(path)!
            const ruleHops = trail.hops.filter(hop => !hop.internal)
            if (ruleHops.length !== 1 || trail.hops.at(-1)?.internal) {
                extraHops.push(describeTrail(path, trail))
            }
        }
        expect(extraHops).toEqual([])
    })

    it('never sends a legacy URL through a /docs/docs/ path', () => {
        const doubled: string[] = []
        for (const { path } of REQUESTS) {
            const trail = trails.get(path)!
            if (
                trail.hops.some(hop =>
                    /^\/docs\/docs(\/|$)/.test(new URL(hop.to).pathname),
                )
            ) {
                doubled.push(describeTrail(path, trail))
            }
        }
        expect(doubled).toEqual([])
    })

    it('sends a legacy page whose slug still exists to that page, not a fallback', () => {
        const displaced: string[] = []
        let pagesStillServed = 0
        for (const { path, slug } of REQUESTS) {
            if (!slug) continue
            const ownPage = `${PRODUCTION_ORIGIN}/docs/${slug}/`
            if (!servedPages.has(ownPage)) continue
            pagesStillServed++
            const trail = trails.get(path)!
            if (trail.final !== ownPage) {
                displaced.push(
                    `${describeTrail(path, trail)}: want ${relative(ownPage)}`,
                )
            }
        }
        // 35 of the 36 legacy slugs still have a page (only
        // migration/v2-to-v2.1 was renamed), x 2 shapes x bare/slashed.
        expect(pagesStillServed).toBe(140)
        expect(displaced).toEqual([])
    })

    it('lands the older-shape URLs Search Console still ranks on their exact pages', () => {
        // [request, the hops Next answers it with]. An internal hop is Next's
        // trailingSlash normalization of the request, before the rule fires.
        const cases: [string, string[]][] = [
            ['/documentation/docs/error-handling/', ['/docs/error-handling/']],
            [
                '/documentation/docs/getting-started',
                [
                    '/documentation/docs/getting-started/ (trailingSlash)',
                    '/docs/getting-started/',
                ],
            ],
            [
                '/documentation/docs/api-reference/upupuploader/event-handlers/',
                ['/docs/api-reference/upupuploader/event-handlers/'],
            ],
            [
                '/documentation/docs/api-reference/upupuploader/icon-prop/',
                ['/docs/api-reference/upupuploader/icon-prop/'],
            ],
            [
                '/documentation/docs',
                ['/documentation/docs/ (trailingSlash)', '/docs/'],
            ],
            [
                '/documentation/docs/category/upupuploader/',
                ['/docs/api-reference/upupuploader/required-props/'],
            ],
            [
                '/documentation/docs/category/api-reference/',
                ['/docs/api-reference/s3-generate-presigned-url/'],
            ],
            // Dotted last segment: trailingSlash STRIPS the slash first.
            [
                '/documentation/docs/migration/v2-to-v2.1/',
                [
                    '/documentation/docs/migration/v2-to-v2.1 (trailingSlash)',
                    '/docs/migration/v1-to-v3/',
                ],
            ],
            [
                '/documentation/docs/migration/v2-to-v2.1',
                ['/docs/migration/v1-to-v3/'],
            ],
            // The newer shape keeps resolving exactly as before.
            ['/documentation/getting-started/', ['/docs/getting-started/']],
        ]
        for (const [path, expected] of cases) {
            expect(follow(path).hops.map(hopLabel), path).toEqual(expected)
        }
    })
})
