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
vi.mock('@/lib/analytics/capture.client', () => ({
    captureClientEvent: vi.fn(),
}))
vi.mock('next/image', () => ({
    default: (props: { alt: string }) =>
        createElement('img', { alt: props.alt }),
}))
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/',
}))
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

import Navbar from '@/components/Navbar'
import HomepageHero from '@/components/HomepageHero'
import HomepageFeatures from '@/components/HomepageFeatures'
import StackBlitzDemoSection from '@/components/StackBlitzDemoSection'
import { DocsSearchDialog } from '@/components/docs/DocsSearch'

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

// The real Navbar's mobile menu closes on a document-level Escape unless the
// key was already consumed (`defaultPrevented`). Each surface below is an
// overlay that sits ABOVE that menu, so one Escape must close the overlay and
// leave the menu open. The menu is opened BEFORE the overlay, the real order
// when a visitor opens the menu first, so the navbar's listener is registered
// first and runs first in the bubble phase unless the overlay handles the key
// earlier.
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
let menuHost: HTMLDivElement
let menuRoot: Root

const toggle = () =>
    menuHost.querySelector<HTMLButtonElement>(
        'button[aria-controls="navbar-mobile-menu"]',
    )!
const menuOpen = () => toggle().getAttribute('aria-expanded') === 'true'

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
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    menuHost = document.createElement('div')
    document.body.append(menuHost)
    menuRoot = createRoot(menuHost)
    act(() => menuRoot.render(createElement(Navbar)))
})

afterEach(() => {
    vi.unstubAllGlobals()
    act(() => root.unmount())
    container.remove()
    act(() => menuRoot.unmount())
    menuHost.remove()
})

describe('docs search dialog Escape', () => {
    function render(open: boolean, onOpenChange: (o: boolean) => void) {
        act(() => {
            root.render(createElement(DocsSearchDialog, { open, onOpenChange }))
        })
    }

    it('closes the dialog and consumes the key so the menu below stays open', () => {
        const onOpenChange = vi.fn()
        act(() => toggle().click())
        render(true, onOpenChange)
        const event = pressEscape()
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(event.defaultPrevented).toBe(true)
        expect(menuOpen()).toBe(true)
    })

    it('leaves Escape alone while the dialog is closed, so the menu can close', () => {
        act(() => toggle().click())
        render(false, vi.fn())
        const event = pressEscape()
        expect(event.defaultPrevented).toBe(false)
        expect(menuOpen()).toBe(false)
    })
})

describe('notify modal Escape', () => {
    it('closes the modal and consumes the key so the menu below stays open', () => {
        act(() => toggle().click())
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
        expect(menuOpen()).toBe(true)
    })
})

describe('StackBlitz fullscreen warning Escape', () => {
    it('dismisses the warning and consumes the key so the menu below stays open', async () => {
        act(() => toggle().click())
        act(() => {
            root.render(createElement(StackBlitzDemoSection))
        })
        const fullscreen = [...container.querySelectorAll('button')].find(b =>
            /Full.screen/.test(b.textContent ?? ''),
        )!
        act(() => fullscreen.click())
        const warning = () => document.querySelector('[role="dialog"]')
        expect(warning()).not.toBeNull()

        const event = pressEscape()
        expect(event.defaultPrevented).toBe(true)
        expect(menuOpen()).toBe(true)
        // AnimatePresence keeps the dialog mounted through its exit animation.
        await vi.waitFor(() => expect(warning()).toBeNull())
    })
})

describe('hero package-manager dropdown Escape', () => {
    it('closes the dropdown and consumes the key so the menu below stays open', () => {
        act(() => toggle().click())
        act(() => {
            root.render(createElement(HomepageHero))
        })
        const trigger = container.querySelector<HTMLButtonElement>(
            'button[aria-label="Package manager"]',
        )!
        act(() => trigger.click())
        expect(trigger.getAttribute('aria-expanded')).toBe('true')

        const event = pressEscape()
        expect(trigger.getAttribute('aria-expanded')).toBe('false')
        expect(menuOpen()).toBe(true)
        expect(event.defaultPrevented).toBe(true)
    })
})
