// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/client/env', () => ({
    clientEnv: { NEXT_PUBLIC_MASTRA_BASE_URL: 'http://mastra.test' },
}))
vi.mock('@/lib/analytics/capture.client', () => ({
    captureClientEvent: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('fumadocs-core/search/client', () => ({
    useDocsSearch: () => ({
        search: '',
        setSearch: vi.fn(),
        query: { data: 'empty' },
    }),
}))
vi.mock('@/components/docs/DocsSidebar', () => ({ DocsSidebar: () => null }))
vi.mock('@/components/AgentSetupPill', () => ({ AgentSetupPill: () => null }))

import { DocsChrome } from '@/components/docs/DocsChrome'

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

function stubReducedMotion(reduce: boolean) {
    vi.stubGlobal(
        'matchMedia',
        (query: string) =>
            ({
                matches: reduce && query.includes('prefers-reduced-motion'),
                media: query,
                addEventListener: () => {},
                removeEventListener: () => {},
                addListener: () => {},
                removeListener: () => {},
            }) as unknown as MediaQueryList,
    )
}

beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
})

// Every trigger opens the same drawer, and opening moves focus into the
// composer whichever one was used and whether or not motion is reduced.
// Opening never transitions `visibility`, so the composer is focusable on the
// very frame the effect runs.
describe.each([
    ['mobile pill', 'docs-ask-ai-trigger-mobile'],
    ['desktop sidebar', 'docs-ask-ai-trigger-desktop'],
    ['mobile menu', 'docs-ask-ai-trigger-menu'],
])('Ask AI %s trigger', (_name, testId) => {
    it.each([
        ['motion on', false],
        ['reduced motion', true],
    ])('moves focus to the composer, %s', (_label, reduce) => {
        stubReducedMotion(reduce)
        act(() => {
            root.render(createElement(DocsChrome, { tree: [], children: null }))
        })
        const trigger = container.querySelector<HTMLElement>(
            `[data-testid="${testId}"]`,
        )!
        const drawer = container.querySelector<HTMLElement>(
            '[data-testid="docs-ask-ai-drawer"]',
        )!
        expect(drawer.hasAttribute('inert')).toBe(true)

        act(() => trigger.focus())
        act(() => trigger.click())

        expect(drawer.hasAttribute('inert')).toBe(false)
        const composer = container.querySelector<HTMLTextAreaElement>(
            '[data-testid="docs-ask-ai-input"]',
        )
        expect(composer).not.toBeNull()
        expect(document.activeElement).toBe(composer)
        expect(drawer.contains(document.activeElement)).toBe(true)
    })
})
