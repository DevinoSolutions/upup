import { format } from 'node:url'
import type { NextConfig } from 'next'
import loadCustomRoutes, {
    type Rewrite,
} from 'next/dist/lib/load-custom-routes'
import { modifyRouteRegex } from 'next/dist/lib/redirect-status'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
    TELEMETRY_PATH,
    TELEMETRY_ROUTES,
    rewriteTelemetryPath,
} from '@/lib/analytics/telemetry-proxy'

// The first-party PostHog path has two halves that must agree: the client's
// rewriteRequestPath renames each PostHog path under TELEMETRY_PATH, and
// next.config's rewrites (a mirror, since next.config cannot import src) map
// the renamed path back to the PostHog instance. Each request posthog-js makes
// is replayed through both: the real hook, then the rewrite list Next serves,
// compiled and matched the way the router server does (see
// legacy-docs-redirects.test.ts for the same harness on redirects).

vi.mock('fumadocs-mdx/next', () => ({
    createMDX: () => (config: NextConfig) => config,
}))

const ORIGIN = 'https://useupup.com'
const POSTHOG = 'https://posthog.test'
const E2E_POSTHOG = 'https://e2e.posthog.test'
const TOKEN = 'phc_test'

// Every path shape posthog-js 1.433 requests from api_host (endpointFor
// "api"/"flags"/"assets"), with the query strings it sends.
const POSTHOG_REQUESTS = [
    '/e/?ip=0&_=1700000000000&ver=1.433.6&compression=gzip-js',
    '/i/v0/e/?ip=0&_=1700000000000&ver=1.433.6&compression=gzip-js',
    '/s/?ip=0&_=1700000000000&ver=1.433.6&compression=gzip-js',
    '/flags/?v=2&config=true&ip=0&_=1700000000000&ver=1.433.6',
    '/static/array.js',
    '/static/recorder.js?v=1.433.6',
    '/static/1.433.6/surveys.js',
    `/array/${TOKEN}/config.js`,
    `/array/${TOKEN}/config`,
    `/api/surveys/?token=${TOKEN}`,
]

// PostHog's name and its well-known path prefixes. The public lists already
// block `/e/` on any host (uBlock filters-privacy `/e/*^ip=*^compression=`,
// checked 2026-10-06 against EasyPrivacy, uBlock filters-privacy and AdGuard
// Tracking Protection); the rest are the next generic rules waiting to happen.
const FILTERED_FRAGMENTS = [
    'posthog',
    '/e/',
    '/i/v0/',
    '/s/',
    '/flags/',
    '/static/',
    '/array/',
    '/decide/',
]

type CompiledRewrite = Rewrite & { match: ReturnType<typeof getPathMatch> }

async function loadRewrites(env: Record<string, string>) {
    vi.resetModules()
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
    const config = (await import('../../next.config.mjs')).default as NextConfig
    const { rewrites } = await loadCustomRoutes(config)
    return rewrites.afterFiles.map((rewrite): CompiledRewrite => ({
        ...rewrite,
        match: getPathMatch(rewrite.source, {
            strict: true,
            removeUnnamedParams: true,
            regexModifier: regex => modifyRouteRegex(regex, ['/_next']),
        }),
    }))
}

/** The URL Next forwards a same-origin request to, or null if none matches. */
function rewriteTarget(rewrites: CompiledRewrite[], url: URL): string | null {
    // Next matches with the trailing slash stripped (trailingSlash: true).
    const pathname = url.pathname.replace(/(.)\/$/, '$1')
    const query = Object.fromEntries(url.searchParams)
    for (const rewrite of rewrites) {
        const params = rewrite.match(pathname)
        if (!params) continue
        const { parsedDestination } = prepareDestination({
            appendParamsToQuery: false,
            destination: rewrite.destination,
            params,
            query,
        })
        return format({ ...parsedDestination, search: undefined })
    }
    return null
}

/** What the browser actually requests for a PostHog path. */
function browserUrl(posthogPath: string): URL {
    return rewriteTelemetryPath(
        new URL(`${TELEMETRY_PATH}${posthogPath}`, ORIGIN),
    )
}

let production: CompiledRewrite[] = []
let e2e: CompiledRewrite[] = []

beforeAll(async () => {
    production = await loadRewrites({
        NEXT_PUBLIC_POSTHOG_DATASET: 'production',
        NEXT_PUBLIC_POSTHOG_HOST: POSTHOG,
    })
    e2e = await loadRewrites({
        NEXT_PUBLIC_POSTHOG_DATASET: 'e2e',
        NEXT_PUBLIC_POSTHOG_HOST: POSTHOG,
        NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST: `${E2E_POSTHOG}/`,
    })
})

afterAll(() => {
    vi.unstubAllEnvs()
})

describe('first-party PostHog path', () => {
    it.each(POSTHOG_REQUESTS)(
        'forwards %s to the same path on the PostHog host',
        posthogPath => {
            const target = rewriteTarget(production, browserUrl(posthogPath))
            expect(target).toBe(`${POSTHOG}${posthogPath}`)
        },
    )

    it('forwards to the e2e project host on the e2e dataset', () => {
        const target = rewriteTarget(e2e, browserUrl('/i/v0/e/?ver=1.433.6'))
        expect(target).toBe(`${E2E_POSTHOG}/i/v0/e/?ver=1.433.6`)
    })

    it.each(POSTHOG_REQUESTS)(
        'requests %s without a path fragment the filter lists block',
        posthogPath => {
            const url = browserUrl(posthogPath)
            expect(url.origin).toBe(ORIGIN)
            const path = url.pathname.slice(TELEMETRY_PATH.length)
            for (const fragment of FILTERED_FRAGMENTS) {
                expect(path).not.toContain(fragment)
            }
        },
    )

    it('never asks trailingSlash to redirect a capture request', () => {
        // A 308 on a POST drops the event. Next only adds a slash to paths
        // that lack one and have no file extension.
        for (const posthogPath of POSTHOG_REQUESTS) {
            const { pathname } = browserUrl(posthogPath)
            if (pathname.includes('/config') && !pathname.endsWith('.js')) {
                continue // the GET-only remote-config fallback
            }
            expect(
                pathname.endsWith('/') || /\.[a-z]+$/.test(pathname),
                pathname,
            ).toBe(true)
        }
    })

    it('leaves URLs outside the telemetry path untouched', () => {
        const url = new URL('https://posthog.test/e/?ver=1')
        expect(rewriteTelemetryPath(url).href).toBe(
            'https://posthog.test/e/?ver=1',
        )
    })

    it('gives every PostHog prefix its own opaque segment', () => {
        const opaque = TELEMETRY_ROUTES.map(([, segment]) => segment)
        expect(new Set(opaque).size).toBe(opaque.length)
    })
})
