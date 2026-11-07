import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The provider's effect is what turns a pathname into "skip", "after load" or
// "at mount". This drives that effect itself (React's useEffect and Next's
// usePathname are replaced so the component can run in the node environment)
// across the route switches a visitor makes client-side.

const posthog = vi.hoisted(() => ({
    init: vi.fn(),
    register: vi.fn(),
    capture: vi.fn(),
}))
vi.mock('posthog-js', () => ({ default: posthog }))

const router = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => router.pathname }))

const effects = vi.hoisted(() => [] as Array<() => void | (() => void)>)
vi.mock('react', async importOriginal => ({
    ...(await importOriginal<typeof import('react')>()),
    useEffect: (fn: () => void | (() => void)) => {
        effects.push(fn)
    },
}))

type Listener = (...args: unknown[]) => void
let listeners: Map<string, Listener[]>

function stubBrowser(readyState: 'loading' | 'complete') {
    listeners = new Map()
    vi.stubGlobal('document', { readyState })
    vi.stubGlobal('window', {
        location: { href: 'https://useupup.com/', pathname: '/' },
        addEventListener: (type: string, fn: Listener) =>
            listeners.set(type, [...(listeners.get(type) ?? []), fn]),
        removeEventListener: (type: string, fn: Listener) =>
            listeners.set(
                type,
                (listeners.get(type) ?? []).filter(l => l !== fn),
            ),
    })
}

/** Render the provider at `pathname` and run the effect it registered. */
async function visit(
    Provider: (props: { children: null }) => unknown,
    pathname: string,
): Promise<void | (() => void)> {
    router.pathname = pathname
    effects.length = 0
    Provider({ children: null })
    return effects[0]!()
}

describe('PostHogProvider effect wiring', () => {
    let Provider: (props: { children: null }) => unknown

    beforeEach(async () => {
        vi.resetModules()
        vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
        stubBrowser('loading')
        posthog.init.mockClear()
        Provider = (await import('@/components/posthog-provider'))
            .PostHogProvider as typeof Provider
    })
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
    })

    it('does nothing on the OAuth popup pages: no boot, no listeners', async () => {
        await visit(Provider, '/od_redirect/')
        await vi.dynamicImportSettled()
        expect(posthog.init).not.toHaveBeenCalled()
        expect(listeners.size).toBe(0)
    })

    it('waits for load on /docs and boots on the first input', async () => {
        await visit(Provider, '/docs/getting-started/')
        await vi.dynamicImportSettled()
        expect(posthog.init).not.toHaveBeenCalled()
        expect(listeners.get('load')?.length).toBe(1)

        listeners.get('pointerdown')![0]!()
        await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1))
    })

    it('boots /support at mount without waiting for anything', async () => {
        await visit(Provider, '/support/')
        await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1))
        expect(listeners.size).toBe(0)
    })

    it('follows a client-side switch from / to /docs to /support', async () => {
        const cleanupHome = (await visit(Provider, '/')) as () => void
        expect(listeners.get('load')?.length).toBe(1)

        // Leaving / tears the first wait down; /docs installs its own.
        cleanupHome()
        expect(listeners.get('load')?.length).toBe(0)
        const cleanupDocs = (await visit(Provider, '/docs/')) as () => void
        expect(listeners.get('load')?.length).toBe(1)
        await vi.dynamicImportSettled()
        expect(posthog.init).not.toHaveBeenCalled()

        // /support is an at-mount route: it boots at once, exactly one init.
        cleanupDocs()
        await visit(Provider, '/support/')
        await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1))
    })
})
