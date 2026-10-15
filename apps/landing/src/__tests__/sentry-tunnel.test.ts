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
    REPLAY_MASK_SELECTORS,
    REPLAY_ON_ERROR_SAMPLE_RATE,
    REPLAY_SESSION_SAMPLE_RATE,
} from '@/lib/analytics/replay'
import {
    SENTRY_TUNNEL_PATH,
    sentryEnvelopeUrl,
} from '@/lib/analytics/sentry-tunnel'

// The first-party Sentry tunnel has two halves that must agree: the client
// posts envelopes to SENTRY_TUNNEL_PATH, and next.config's rewrite (a mirror,
// since next.config cannot import src) forwards that path to the DSN's
// envelope endpoint. Same harness as telemetry-proxy.test.ts: the rewrite list
// Next serves, compiled and matched the way the router server does.

vi.mock('fumadocs-mdx/next', () => ({
    createMDX: () => (config: NextConfig) => config,
}))

const sentry = vi.hoisted(() => ({
    init: vi.fn(),
    replayIntegration: vi.fn((options: unknown) => ({
        name: 'Replay',
        options,
    })),
}))
vi.mock('@sentry/browser', () => sentry)

const ORIGIN = 'https://useupup.com'
const DSN = 'https://0123456789abcdef@sentry.test/73'
const ENVELOPE = 'https://sentry.test/api/73/envelope/'

type CompiledRewrite = Rewrite & { match: ReturnType<typeof getPathMatch> }

async function loadRewrites(env: Record<string, string>) {
    vi.resetModules()
    vi.unstubAllEnvs()
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

let withDsn: CompiledRewrite[] = []
let withoutDsn: CompiledRewrite[] = []

beforeAll(async () => {
    withDsn = await loadRewrites({ NEXT_PUBLIC_SENTRY_DSN: DSN })
    withoutDsn = await loadRewrites({})
})

afterAll(() => {
    vi.unstubAllEnvs()
})

describe('first-party Sentry tunnel', () => {
    it('forwards the tunnel path to the envelope endpoint of the DSN', () => {
        const url = new URL(SENTRY_TUNNEL_PATH, ORIGIN)
        expect(rewriteTarget(withDsn, url)).toBe(ENVELOPE)
        expect(sentryEnvelopeUrl(DSN)).toBe(ENVELOPE)
    })

    it('adds no Sentry rule to a build without a DSN', () => {
        const url = new URL(SENTRY_TUNNEL_PATH, ORIGIN)
        expect(rewriteTarget(withoutDsn, url)).not.toBe(ENVELOPE)
        expect(withoutDsn.length).toBe(withDsn.length - 1)
    })

    it('posts to a slashed same-origin path that names neither Sentry nor its endpoint', () => {
        // A slashless POST would get a trailingSlash 308 and lose the envelope.
        expect(SENTRY_TUNNEL_PATH.endsWith('/')).toBe(true)
        expect(SENTRY_TUNNEL_PATH).not.toMatch(/sentry|envelope/i)
    })

    it.each([
        [
            'https://key@sentry.example.com/42',
            'https://sentry.example.com/api/42/envelope/',
        ],
        [
            'https://key@example.com/sentry/42',
            'https://example.com/sentry/api/42/envelope/',
        ],
        [
            'https://key@example.com:9000/7/',
            'https://example.com:9000/api/7/envelope/',
        ],
    ])('maps the DSN %s to %s', (dsn, envelope) => {
        expect(sentryEnvelopeUrl(dsn)).toBe(envelope)
    })

    it.each([
        undefined,
        '',
        'not a url',
        'https://sentry.example.com/42',
        'https://key@sentry.example.com/',
        'https://key@sentry.example.com/project',
    ])('rejects the unusable DSN %j', dsn => {
        expect(sentryEnvelopeUrl(dsn)).toBeNull()
    })
})

describe('bootSentry', () => {
    async function boot(env: Record<string, string>) {
        vi.resetModules()
        vi.unstubAllEnvs()
        sentry.init.mockClear()
        sentry.replayIntegration.mockClear()
        for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
        const { bootSentry } = await import('@/lib/analytics/sentry')
        bootSentry()
    }

    it('starts Sentry through the tunnel with the shared replay settings', async () => {
        await boot({ NEXT_PUBLIC_SENTRY_DSN: DSN })
        // The SDK arrives through a dynamic import.
        await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(1))
        const options = sentry.init.mock.calls[0]![0]
        expect(options).toMatchObject({
            dsn: DSN,
            tunnel: SENTRY_TUNNEL_PATH,
            tracesSampleRate: 0,
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1,
        })
        expect(sentry.replayIntegration).toHaveBeenCalledWith({
            maskAllText: true,
            maskAllInputs: true,
            blockAllMedia: true,
            mask: REPLAY_MASK_SELECTORS,
        })
    })

    it('never loads Sentry without a DSN', async () => {
        // bootSentry returns before the dynamic import when the DSN is empty.
        await boot({ NEXT_PUBLIC_SENTRY_DSN: '' })
        expect(sentry.init).not.toHaveBeenCalled()
    })
})

describe('session replay settings', () => {
    it('records one session in ten, and every session that hits an error', () => {
        expect(REPLAY_SESSION_SAMPLE_RATE).toBe(0.1)
        expect(REPLAY_ON_ERROR_SAMPLE_RATE).toBe(1)
    })

    it('masks the ph-sensitive class and the site mask attribute', () => {
        expect(REPLAY_MASK_SELECTORS).toEqual([
            '.ph-sensitive',
            '[data-ph-mask]',
        ])
    })
})
