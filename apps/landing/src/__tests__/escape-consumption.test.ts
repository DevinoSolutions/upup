// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/gtag', () => ({ event: vi.fn() }))
vi.mock('@/lib/client/env', () => ({
    clientEnv: { NEXT_PUBLIC_MASTRA_BASE_URL: 'http://mastra.test' },
}))
vi.mock('@/components/HomepageFeatures/notify-signup', () => ({
    submitAndRecordProviderInterest: vi.fn(async () => true),
}))
vi.mock('@/components/FeatureShowcase', () => ({ default: () => null }))
vi.mock('next/link', () => ({
    default: ({ children }: { children: unknown }) => children,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('fumadocs-core/search/client', () => ({
    useDocsSearch: () => ({
        search: '',
        setSearch: vi.fn(),
        query: { data: 'empty' },
    }),
}))
vi.mock('@useupup/react', () => ({ UpupUploader: () => null }))
vi.mock('@useupup/react/styles', () => ({}))
vi.mock('@stackblitz/sdk', () => ({
    default: { embedProject: vi.fn(() => new Promise(() => {})) },
}))

import HomepageFeatures from '@/components/HomepageFeatures'
import StackBlitzDemoSection from '@/components/StackBlitzDemoSection'
import { DocsSearchDialog } from '@/components/docs/DocsSearch'

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

// The navbar's mobile menu closes on a document-level Escape unless the key
// was already consumed (`defaultPrevented`). Each surface below is an overlay
// that sits ABOVE that menu, so one Escape must close the overlay and leave the
// menu open. The stand-in is registered BEFORE the overlay opens — the real
// ordering when a visitor opens the menu first — so it runs first in the bubble
// phase unless the overlay handles the key earlier.
function mountMenuStandIn() {
    const state = { closed: false }
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return
        state.closed = true
    }
    document.addEventListener('keydown', onKeyDown)
    return {
        state,
        dispose: () => document.removeEventListener('keydown', onKeyDown),
    }
}

function pressEscape(): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
    })
    act(() => {
        ;(document.activeElement ?? document.body).dispatchEvent(event)
    })
    return event
}

let container: HTMLDivElement
let root: Root
let menu: ReturnType<typeof mountMenuStandIn>

beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    menu = mountMenuStandIn()
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
    menu.dispose()
})

describe('docs search dialog Escape', () => {
    function render(open: boolean, onOpenChange: (o: boolean) => void) {
        act(() => {
            root.render(createElement(DocsSearchDialog, { open, onOpenChange }))
        })
    }

    it('closes the dialog and consumes the key so the menu below stays open', () => {
        const onOpenChange = vi.fn()
        render(true, onOpenChange)
        const event = pressEscape()
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(event.defaultPrevented).toBe(true)
        expect(menu.state.closed).toBe(false)
    })

    it('leaves Escape alone while the dialog is closed, so the menu can close', () => {
        render(false, vi.fn())
        const event = pressEscape()
        expect(event.defaultPrevented).toBe(false)
        expect(menu.state.closed).toBe(true)
    })
})

describe('notify modal Escape', () => {
    it('closes the modal and consumes the key so the menu below stays open', () => {
        act(() => {
            root.render(createElement(HomepageFeatures))
        })
        const tile = [...container.querySelectorAll('button')].find(
            b => b.textContent?.trim() === 'Instagram',
        )!
        act(() => tile.click())
        expect(document.querySelector('input[type="email"]')).not.toBeNull()

        const event = pressEscape()
        expect(document.querySelector('input[type="email"]')).toBeNull()
        expect(event.defaultPrevented).toBe(true)
        expect(menu.state.closed).toBe(false)
    })
})

describe('StackBlitz fullscreen warning Escape', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                observe() {}
                unobserve() {}
                disconnect() {}
                takeRecords() {
                    return []
                }
            },
        )
    })
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('dismisses the warning and consumes the key so the menu below stays open', async () => {
        act(() => {
            root.render(createElement(StackBlitzDemoSection))
        })
        const toggle = [...container.querySelectorAll('button')].find(b =>
            /Full.screen/.test(b.textContent ?? ''),
        )!
        act(() => toggle.click())
        const warning = () => document.querySelector('[role="dialog"]')
        expect(warning()).not.toBeNull()

        const event = pressEscape()
        expect(event.defaultPrevented).toBe(true)
        expect(menu.state.closed).toBe(false)
        // AnimatePresence keeps the dialog mounted through its exit animation.
        await vi.waitFor(() => expect(warning()).toBeNull())
    })
})
