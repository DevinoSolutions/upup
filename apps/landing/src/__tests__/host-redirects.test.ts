import type { IncomingMessage } from 'node:http'
import { format } from 'node:url'
import type { NextConfig } from 'next'
import { modifyRouteRegex } from 'next/dist/lib/redirect-status'
import type { Redirect } from 'next/dist/lib/load-custom-routes'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import {
    matchHas,
    prepareDestination,
} from 'next/dist/shared/lib/router/utils/prepare-destination'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The host-level redirects in next.config.mjs (www -> apex, http -> https)
// answer with ABSOLUTE destinations, and Next never re-appends a trailing
// slash to an absolute destination: a rule that drops the slash costs every
// www/plaintext visitor a second 308 on the apex. These tests replay the real
// redirects() array through Next's OWN matcher, wired the way the router
// server wires it (server/lib/router-utils/filesystem.js buildCustomRoute +
// resolve-routes + router-server): strict path-to-regexp with an optional
// trailing slash appended outside the params (modifyRouteRegex), `has`/
// `missing` checked against the request, destination rendered by
// prepareDestination and formatted into the Location header, first match
// wins. The request paths are the slashed page / bare file forms, which
// Next's own trailingSlash redirects never touch, so the first custom rule
// matched here IS the first hop a browser sees.

// createMDX() writes fumadocs' .source/ tree as a side effect; the redirects
// don't depend on it, so it becomes the identity wrapper.
vi.mock('fumadocs-mdx/next', () => ({
    createMDX: () => (config: NextConfig) => config,
}))

const APEX = 'useupup.com'
const PRODUCTION_ORIGIN = `https://${APEX}`
const PLAINTEXT = { 'cf-visitor': '{"scheme":"http"}' }

let redirects: Redirect[] = []

beforeAll(async () => {
    // SITE_BASE is computed when next.config.mjs loads.
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', PRODUCTION_ORIGIN)
    const config = (await import('../../next.config.mjs')).default as NextConfig
    redirects = (await config.redirects?.()) ?? []
})

afterAll(() => {
    vi.unstubAllEnvs()
})

/** The first custom redirect Next would answer this request with, if any. */
function firstRedirect(
    host: string,
    pathname: string,
    headers: Record<string, string> = {},
): { source: string; location: string } | null {
    const req = {
        headers: { host, ...headers },
    } as unknown as IncomingMessage
    for (const route of redirects) {
        const match = getPathMatch(route.source, {
            strict: true,
            removeUnnamedParams: true,
            regexModifier: regex => modifyRouteRegex(regex, ['/_next']),
        })
        const params = match(pathname)
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
        // router-server writes `Location: url.format(parsedDestination)`
        // with the query folded into an (here empty) search string.
        const location = format({
            ...parsedDestination,
            query: undefined,
            search: '',
        })
        return { source: route.source, location }
    }
    return null
}

describe('www host redirects to the apex in a single hop', () => {
    it('sends an extensionless www page to the apex page with its trailing slash kept', () => {
        for (const path of ['/angular/', '/docs/ai-assistants/']) {
            expect(
                firstRedirect(`www.${APEX}`, path)?.location,
                `www ${path}`,
            ).toBe(`${PRODUCTION_ORIGIN}${path}`)
            // ...and that apex URL is final: no further custom rule fires.
            expect(firstRedirect(APEX, path), `apex ${path}`).toBeNull()
        }
    })

    it('sends a www file path to the apex file with no slash appended', () => {
        for (const path of ['/llms.txt', '/sitemap.xml']) {
            expect(
                firstRedirect(`www.${APEX}`, path)?.location,
                `www ${path}`,
            ).toBe(`${PRODUCTION_ORIGIN}${path}`)
        }
    })

    it('sends the bare www root to the apex root', () => {
        expect(firstRedirect(`www.${APEX}`, '/')?.location).toBe(
            `${PRODUCTION_ORIGIN}/`,
        )
    })
})

describe('plaintext requests flagged by the Cloudflare visitor header redirect to https in a single hop', () => {
    it('keeps the trailing slash on pages and adds none to files', () => {
        expect(firstRedirect(APEX, '/react/', PLAINTEXT)?.location).toBe(
            `${PRODUCTION_ORIGIN}/react/`,
        )
        expect(firstRedirect(APEX, '/llms.txt', PLAINTEXT)?.location).toBe(
            `${PRODUCTION_ORIGIN}/llms.txt`,
        )
    })
})
