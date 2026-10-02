import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostHog } from 'posthog-js'
import {
    PENDING_LIMIT,
    capturePostHog,
    getPostHogClient,
    resetPostHogClientForTests,
    setPostHogClient,
    whenPostHogReady,
} from '@/lib/analytics/posthog-client'
import {
    LANDING_FRAMEWORK_SLUGS,
    OAUTH_REDIRECT_PATHS,
    isMarketingLandingPath,
    isOAuthRedirectPath,
} from '@/lib/analytics/landing-routes'

// The marketing landing routes boot PostHog after the page has loaded, and
// posthog-js drops any capture() made before init(). These tests pin the
// guarantee that made the deferral safe: an event captured before PostHog is
// ready is held (with the time it happened) and delivered once it is.

type CaptureCall = [string, Record<string, unknown>, { timestamp?: Date }?]

function fakePostHog(): { instance: PostHog; calls: CaptureCall[] } {
    const calls: CaptureCall[] = []
    const instance = {
        capture: (
            name: string,
            properties: Record<string, unknown>,
            options?: { timestamp?: Date },
        ) => {
            calls.push(
                options ? [name, properties, options] : [name, properties],
            )
            return undefined
        },
        get_distinct_id: () => 'distinct-123',
    } as unknown as PostHog
    return { instance, calls }
}

describe('PostHog capture before the SDK has booted', () => {
    beforeEach(() => resetPostHogClientForTests())
    afterEach(() => vi.useRealTimers())

    it('holds events captured before PostHog is ready and delivers them in order once it registers', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-26T10:00:00.000Z'))
        capturePostHog('agent_setup_prompt_copied', { surface: 'hero' })
        vi.setSystemTime(new Date('2026-09-26T10:00:01.500Z'))
        capturePostHog('ai_feedback_submitted', { rating: 'up' })

        const { instance, calls } = fakePostHog()
        expect(calls).toHaveLength(0)
        vi.setSystemTime(new Date('2026-09-26T10:00:04.000Z'))
        setPostHogClient(instance)

        expect(calls).toEqual([
            [
                'agent_setup_prompt_copied',
                { surface: 'hero' },
                { timestamp: new Date('2026-09-26T10:00:00.000Z') },
            ],
            [
                'ai_feedback_submitted',
                { rating: 'up' },
                { timestamp: new Date('2026-09-26T10:00:01.500Z') },
            ],
        ])
    })

    it('sends straight to PostHog once it is ready, and never replays a delivered event twice', () => {
        const { instance, calls } = fakePostHog()
        capturePostHog('queued_first', {})
        setPostHogClient(instance)
        capturePostHog('after_ready', { a: 1 })

        expect(calls.map(c => c[0])).toEqual(['queued_first', 'after_ready'])
        expect(calls[1]).toEqual(['after_ready', { a: 1 }])
        expect(getPostHogClient()).toBe(instance)
    })

    it('keeps at most PENDING_LIMIT events while PostHog is loading (the earliest ones)', () => {
        for (let i = 0; i < PENDING_LIMIT + 10; i += 1)
            capturePostHog(`event_${i}`, {})
        const { instance, calls } = fakePostHog()
        setPostHogClient(instance)

        expect(PENDING_LIMIT).toBe(50)
        expect(calls).toHaveLength(PENDING_LIMIT)
        expect(calls[0][0]).toBe('event_0')
        expect(calls[PENDING_LIMIT - 1][0]).toBe(`event_${PENDING_LIMIT - 1}`)
    })

    it('hands the live instance to anyone waiting for it (the Ask-AI distinct id)', () => {
        const seen: string[] = []
        whenPostHogReady(ph => seen.push(ph.get_distinct_id()))
        const unsubscribed = whenPostHogReady(() => seen.push('unsubscribed'))
        unsubscribed()
        expect(seen).toEqual([])

        const { instance } = fakePostHog()
        setPostHogClient(instance)
        expect(seen).toEqual(['distinct-123'])

        whenPostHogReady(ph => seen.push(`late:${ph.get_distinct_id()}`))
        expect(seen).toEqual(['distinct-123', 'late:distinct-123'])
    })

    it('a throwing capture does not stop the rest of the queue', () => {
        capturePostHog('boom', {})
        capturePostHog('still_sent', {})
        const calls: string[] = []
        const instance = {
            capture: (name: string) => {
                if (name === 'boom') throw new Error('network')
                calls.push(name)
            },
        } as unknown as PostHog
        setPostHogClient(instance)
        expect(calls).toEqual(['still_sent'])
    })
})

describe('captureClientEvent — dataset gate in front of the queue', () => {
    const KEYS = ['NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_DATASET']
    const saved: Record<string, string | undefined> = {}
    beforeEach(() => {
        for (const k of KEYS) saved[k] = process.env[k]
        vi.resetModules()
    })
    afterEach(() => {
        for (const k of KEYS) {
            if (saved[k] === undefined) delete process.env[k]
            else process.env[k] = saved[k]
        }
        vi.resetModules()
    })

    it('queues on a production build until PostHog registers, then delivers', async () => {
        process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key'
        delete process.env.NEXT_PUBLIC_POSTHOG_DATASET
        const { captureClientEvent } =
            await import('@/lib/analytics/capture.client')
        const registry = await import('@/lib/analytics/posthog-client')
        captureClientEvent('agent_setup_prompt_copied', { surface: 'docs' })

        const { instance, calls } = fakePostHog()
        registry.setPostHogClient(instance)
        expect(calls.map(c => c[0])).toEqual(['agent_setup_prompt_copied'])
    })

    it('does nothing at all on a disabled dataset — nothing is queued', async () => {
        delete process.env.NEXT_PUBLIC_POSTHOG_KEY
        delete process.env.NEXT_PUBLIC_POSTHOG_DATASET
        const { captureClientEvent } =
            await import('@/lib/analytics/capture.client')
        const registry = await import('@/lib/analytics/posthog-client')
        captureClientEvent('agent_setup_prompt_copied', { surface: 'docs' })

        const { instance, calls } = fakePostHog()
        registry.setPostHogClient(instance)
        expect(calls).toEqual([])
    })
})

describe('which routes defer the PostHog boot', () => {
    it('defers only the home page and the per-framework landing pages', () => {
        for (const path of ['/', '/react/', '/vue', '/preact/'])
            expect(isMarketingLandingPath(path)).toBe(true)
        for (const path of [
            '/docs/',
            '/docs/react/',
            '/support/',
            '/agent-setup/',
            '/privacy/',
            '/mobile-demo/',
            null,
        ])
            expect(isMarketingLandingPath(path)).toBe(false)
    })

    it('lists every framework landing page the app generates', () => {
        // Read as text: importing lib/frameworks.tsx pulls every framework
        // package's styles. FRAMEWORK_LIST names its entries FRAMEWORKS.<id>.
        const source = readFileSync(
            fileURLToPath(
                new URL('../src/lib/frameworks.tsx', import.meta.url),
            ),
            'utf8',
        )
        const list = source.slice(
            source.indexOf('export const FRAMEWORK_LIST'),
            source.indexOf('export const FRAMEWORK_IDS'),
        )
        const ids = [...list.matchAll(/FRAMEWORKS\.(\w+)/g)].map(m => m[1])
        expect(ids.length).toBeGreaterThan(0)
        expect(new Set(LANDING_FRAMEWORK_SLUGS)).toEqual(new Set(ids))
        expect(LANDING_FRAMEWORK_SLUGS).toHaveLength(ids.length)
    })
})

describe('drive sign-in popup routes never boot PostHog', () => {
    const repoFile = (path: string) =>
        fileURLToPath(new URL(`../../../${path}`, import.meta.url))

    it('matches each popup redirect path with or without the trailing slash', () => {
        for (const path of [
            '/od_redirect',
            '/od_redirect/',
            '/dp_redirect/',
            '/box_redirect/',
        ])
            expect(isOAuthRedirectPath(path)).toBe(true)
        for (const path of ['/', '/docs/', '/od_redirect/x/', null])
            expect(isOAuthRedirectPath(path)).toBe(false)
    })

    it('lists exactly the redirect paths the core popup plugins send users to', () => {
        // Read as text: these plugins are core internals, and the landing app
        // only consumes @useupup/core through its built dist.
        const plugins = [
            'one-drive-plugin.ts',
            'dropbox-plugin.ts',
            'box-plugin.ts',
        ].map(name =>
            readFileSync(repoFile(`packages/core/src/drives/${name}`), 'utf8'),
        )
        const paths = plugins.map(
            source => source.match(/redirectPath:\s*'([^']+)'/)?.[1],
        )
        expect(new Set(paths)).toEqual(new Set(OAUTH_REDIRECT_PATHS))
    })

    it('gives every popup redirect path a real page instead of the 404', () => {
        for (const path of OAUTH_REDIRECT_PATHS) {
            const page = readFileSync(
                repoFile(`apps/landing/src/app${path}/page.tsx`),
                'utf8',
            )
            expect(page).toContain('oauthRedirectMetadata(')
        }
    })
})
