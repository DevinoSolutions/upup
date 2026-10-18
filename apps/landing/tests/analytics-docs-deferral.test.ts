import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { analyticsBootMode, isDocsPath } from '@/lib/analytics/landing-routes'

// T-2848: on /docs the analytics SDKs (posthog-js ~100 KB, @sentry/browser
// ~135 KB, both compressed) used to start at hydration, so they downloaded
// before first paint settled and PageSpeed's simulation charged them to LCP.
// They now start after the load event, like the marketing landing pages.

const SRC = fileURLToPath(new URL('../src/', import.meta.url))

describe('analytics boot mode per route', () => {
    it('defers the docs, the home page and the framework pages until after load', () => {
        for (const path of [
            '/docs',
            '/docs/',
            '/docs/getting-started/',
            '/docs/api-reference/upupuploader/required-props',
            '/',
            '/react/',
            '/vue',
        ])
            expect(analyticsBootMode(path), path).toBe('after-load')
    })

    it('keeps every other route at mount and skips the OAuth popup pages', () => {
        for (const path of [
            '/support/',
            '/agent-setup/',
            '/agent-setup/claude-code',
            '/privacy/',
            '/mobile-demo/',
            '/docs-md/ai-assistants',
            '/documentation',
            null,
        ])
            expect(analyticsBootMode(path), String(path)).toBe('at-mount')
        for (const path of ['/od_redirect/', '/dp_redirect', '/box_redirect'])
            expect(analyticsBootMode(path), path).toBe('skip')
    })

    it('recognises the docs section without catching /docs-md', () => {
        expect(isDocsPath('/docs')).toBe(true)
        expect(isDocsPath('/docs/quickstarts/react/')).toBe(true)
        expect(isDocsPath('/docs-md/ai-assistants')).toBe(false)
        expect(isDocsPath(null)).toBe(false)
    })
})

// ── (a) structural: no static route to an analytics SDK from the docs ──────

const SDKS = ['posthog-js', '@sentry/browser']
const STATIC_IMPORT =
    /^\s*(?:import|export)\s+(?!type\b)[^;'"]*?from\s+['"]([^'"]+)['"]/gm
const SIDE_EFFECT_IMPORT = /^\s*import\s+['"]([^'"]+)['"]/gm

function resolveSource(spec: string, from: string): string | null {
    let base: string
    if (spec.startsWith('@/')) base = join(SRC, spec.slice(2))
    else if (spec.startsWith('.')) base = join(dirname(from), spec)
    else return null
    for (const candidate of [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        join(base, 'index.ts'),
        join(base, 'index.tsx'),
    ])
        if (/\.(tsx?)$/.test(candidate) && existsSync(candidate))
            return candidate
    return null
}

/** Every file reachable from `entries` through static (non-type) imports. */
function staticGraph(entries: string[]): {
    files: Set<string>
    sdkImporters: string[]
    jsonImporters: string[]
} {
    const files = new Set<string>()
    const sdkImporters: string[] = []
    const jsonImporters: string[] = []
    const queue = entries.map(rel => join(SRC, rel))
    while (queue.length > 0) {
        const file = queue.pop()!
        if (files.has(file)) continue
        files.add(file)
        const source = readFileSync(file, 'utf8')
        const specs = [
            ...source.matchAll(STATIC_IMPORT),
            ...source.matchAll(SIDE_EFFECT_IMPORT),
        ].map(m => m[1]!)
        for (const spec of specs) {
            if (SDKS.includes(spec)) sdkImporters.push(`${file}: ${spec}`)
            if (spec.endsWith('.json')) jsonImporters.push(`${file}: ${spec}`)
            const next = resolveSource(spec, file)
            if (next) queue.push(next)
        }
    }
    return { files, sdkImporters, jsonImporters }
}

describe('docs first load never statically imports an analytics SDK', () => {
    const { files, sdkImporters, jsonImporters } = staticGraph([
        'app/layout.tsx',
        'app/docs/layout.tsx',
        'app/docs/[[...slug]]/page.tsx',
    ])

    it('walks the provider that starts the SDKs (the graph is not vacuous)', () => {
        const names = [...files].map(f => f.replaceAll('\\', '/'))
        expect(
            names.some(f => f.endsWith('components/posthog-provider.tsx')),
        ).toBe(true)
        expect(names.some(f => f.endsWith('lib/analytics/sentry.ts'))).toBe(
            true,
        )
    })

    it('reaches posthog-js and @sentry/browser only through dynamic import()', () => {
        expect(sdkImporters).toEqual([])
        const provider = readFileSync(
            join(SRC, 'components/posthog-provider.tsx'),
            'utf8',
        )
        const sentry = readFileSync(
            join(SRC, 'lib/analytics/sentry.ts'),
            'utf8',
        )
        expect(provider).toMatch(/import\(\s*['"]posthog-js['"]\s*\)/)
        expect(sentry).toMatch(/import\(\s*['"]@sentry\/browser['"]\s*\)/)
    })

    it('never bundles a whole JSON manifest (package.json shipped ~13 KB gzip to every page)', () => {
        expect(jsonImporters).toEqual([])
    })

    it('starts the SDKs from the provider by boot mode, never by a bare mount call on docs', () => {
        const provider = readFileSync(
            join(SRC, 'components/posthog-provider.tsx'),
            'utf8',
        )
        expect(provider).toMatch(/analyticsBootMode\(/)
        expect(provider).not.toMatch(/isMarketingLandingPath/)
    })
})

// ── (b) the deferred boot still records the first pageview with its UTMs ───

const posthog = vi.hoisted(() => ({
    init: vi.fn(),
    register: vi.fn(),
    capture: vi.fn(),
}))
vi.mock('posthog-js', () => ({ default: posthog }))

describe('deferred PostHog boot keeps first-pageview attribution', () => {
    const DOCS_URL =
        'https://useupup.com/docs/getting-started/?utm_source=newsletter&utm_medium=email&utm_campaign=launch'

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
        posthog.init.mockClear()
        posthog.capture.mockClear()
    })
    afterAll(() => vi.resetModules())

    async function bootAt(href: string) {
        vi.resetModules()
        vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
        let currentHref = href
        vi.stubGlobal('window', {
            location: {
                get href() {
                    return currentHref
                },
                get pathname() {
                    return new URL(currentHref).pathname
                },
            },
        })
        const provider = await import('@/components/posthog-provider')
        return {
            remember: provider.rememberDeferredEntry,
            boot: provider.bootPostHog,
            navigate: (to: string) => {
                currentHref = to
            },
        }
    }

    it('lets init() own the initial $pageview: history_change, same URL and referrer, no duplicate', async () => {
        const { boot } = await bootAt(DOCS_URL)
        boot()
        await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1))
        const [, options] = posthog.init.mock.calls[0]!
        // posthog-js captures the current $pageview inside init() from the live
        // location (UTM params) and document.referrer; 'history_change' keeps
        // SPA navigations flowing after it. Nothing may replace or suppress it.
        expect(options.capture_pageview).toBe('history_change')
        expect(options.person_profiles).toBe('identified_only')
        // The visitor has not left the entry page: no synthetic extra view.
        expect(posthog.capture).not.toHaveBeenCalled()
    })

    it('adds no second $pageview when the visitor is still on the entry page at boot', async () => {
        const { remember, boot } = await bootAt(DOCS_URL)
        remember()
        boot()
        await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1))
        // Let the post-init() continuation run before asserting the absence.
        await vi.dynamicImportSettled()
        expect(posthog.capture).not.toHaveBeenCalled()
    })

    it('records the entry page view with its UTMs and original time when the visitor left before boot', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-10-17T12:00:00.000Z'))
        const { remember, boot, navigate } = await bootAt(DOCS_URL)
        remember()
        vi.useRealTimers()
        navigate('https://useupup.com/docs/quickstarts/react/')
        boot()
        await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledTimes(1))
        const [name, props, opts] = posthog.capture.mock.calls[0]!
        expect(name).toBe('$pageview')
        expect(props.$current_url).toBe(DOCS_URL)
        expect(new URL(props.$current_url).searchParams.get('utm_source')).toBe(
            'newsletter',
        )
        expect(opts.timestamp).toEqual(new Date('2026-10-17T12:00:00.000Z'))
    })
})
