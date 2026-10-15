import { afterEach, describe, expect, it, vi } from 'vitest'

// gtag.js is only loaded when NEXT_PUBLIC_GOOGLE_ANALYTICS_ID is set, and even
// then lazily, so window.gtag is often missing. The homepage "Notify me" modal
// calls event() before it opens; a throw there left the modal unopenable on
// production, which ships without a GA ID.

async function loadGtag() {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')
    return import('@/lib/gtag')
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
})

describe('gtag helpers without gtag.js loaded', () => {
    it('event() is a no-op instead of throwing', async () => {
        vi.stubGlobal('window', {})
        const gtag = await loadGtag()
        expect(() =>
            gtag.event({ action: 'provider_interest', event_label: 'Zoom' }),
        ).not.toThrow()
    })

    it('pageView() is a no-op instead of throwing', async () => {
        vi.stubGlobal('window', {})
        const gtag = await loadGtag()
        expect(() => gtag.pageView('/docs/')).not.toThrow()
    })
})

describe('gtag helpers with gtag.js loaded', () => {
    it('event() forwards the action and its parameters to window.gtag', async () => {
        const spy = vi.fn()
        vi.stubGlobal('window', { gtag: spy })
        const gtag = await loadGtag()
        gtag.event({
            action: 'provider_interest',
            event_category: 'providers',
            event_label: 'Zoom (planned)',
        })
        expect(spy).toHaveBeenCalledWith('event', 'provider_interest', {
            event_category: 'providers',
            event_label: 'Zoom (planned)',
            value: undefined,
        })
    })
})
