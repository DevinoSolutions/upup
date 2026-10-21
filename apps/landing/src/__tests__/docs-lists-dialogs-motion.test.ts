// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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

import { DocsAskAi, MessageBody } from '@/components/docs/DocsAskAi'
import { DocsSearchDialog } from '@/components/docs/DocsSearch'
import type { DocsChatMessage } from '@/lib/docs/use-docs-chat'

// jsdom has no layout/animation engine, so these pin the MECHANISMS the motion
// spec relies on (class contract + element identity), not pixels. The pixels
// are covered by the before/after capture recorded in the PR.

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const docsDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../components/docs',
)

let container: HTMLDivElement
let root: Root

beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
})

function chatWith(messages: DocsChatMessage[], pending = false) {
    return {
        messages,
        pending,
        send: vi.fn(async () => {}),
        clear: vi.fn(),
    } as unknown as Parameters<typeof DocsAskAi>[0]['chat']
}

function renderAskAi(open: boolean, messages: DocsChatMessage[] = []) {
    act(() => {
        root.render(
            createElement(DocsAskAi, {
                open,
                onClose: () => {},
                chat: chatWith(messages),
            }),
        )
    })
    return container.querySelector<HTMLElement>(
        '[data-testid="docs-ask-ai-drawer"]',
    )!
}

describe('Ask AI drawer open/close', () => {
    it('is inert and hidden when closed, with only a 16px nudge of travel', () => {
        const drawer = renderAskAi(false)
        expect(drawer.hasAttribute('inert')).toBe(true)
        expect(drawer.hasAttribute('aria-hidden')).toBe(false)
        const cls = drawer.className
        expect(cls).toContain('invisible')
        expect(cls).toContain('opacity-0')
        // 16px (translate-x-4), never the old full-width slide.
        expect(cls).toContain('translate-x-4')
        expect(cls).not.toContain('translate-x-full')
    })

    it('is interactive and visible when open', () => {
        const drawer = renderAskAi(true)
        expect(drawer.hasAttribute('inert')).toBe(false)
        const cls = drawer.className
        expect(cls).toContain('visible')
        expect(cls).not.toContain('invisible')
        expect(cls).toContain('opacity-100')
        expect(cls).toContain('translate-x-0')
    })

    it('transitions visibility on close only so the exit is seen and the open can focus', () => {
        // Snapshot each state's classes: renderAskAi re-renders the same node.
        const closed = renderAskAi(false).className
        // Closing: `visibility` must be in the transition list or it flips
        // instantly and the exit is never painted (the original defect).
        expect(closed).toContain(
            'motion-safe:transition-[transform,opacity,visibility]',
        )
        // Opening: the browser uses the open state's transition list, and a
        // transitioned hidden -> visible stays `hidden` for the first frame,
        // which makes the composer focus() in the open effect fail.
        const open = renderAskAi(true).className
        expect(open).toContain('motion-safe:transition-[transform,opacity]')
        expect(open).not.toMatch(/transition-\[[^\]]*visibility/)
        // Exit is faster than enter and both come from the motion tokens.
        expect(closed).toContain('motion-safe:duration-fast')
        expect(open).toContain('motion-safe:duration-base')
    })

    it('no longer animates layout properties on the docs content column', () => {
        const chrome = readFileSync(resolve(docsDir, 'DocsChrome.tsx'), 'utf8')
        expect(chrome).not.toMatch(/transition-\[[^\]]*(padding|max-width)/)
    })
})

describe('copy confirmation', () => {
    const fence = '```ts\nconst x = 1\n```'

    it('announces Copied through a persistent role=status region', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        })
        act(() => {
            root.render(createElement(MessageBody, { content: fence }))
        })
        const status = container.querySelector('[role="status"]')!
        // Mounted BEFORE the copy, empty, so the text change is announced.
        expect(status).not.toBeNull()
        expect(status.className).toContain('sr-only')
        expect(status.textContent).toBe('')

        const button = container.querySelector('button')!
        await act(async () => {
            button.click()
        })
        expect(writeText).toHaveBeenCalledWith('const x = 1')
        expect(container.querySelector('[role="status"]')).toBe(status)
        expect(status.textContent).toBe('Copied')
    })

    it('cross-fades two stacked icons on opacity only (no scale/rotate)', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
            configurable: true,
        })
        act(() => {
            root.render(createElement(MessageBody, { content: fence }))
        })
        const button = container.querySelector('button')!
        const icons = () => Array.from(button.querySelectorAll('svg'))
        expect(icons()).toHaveLength(2)
        expect(icons().map(i => i.classList.contains('opacity-100'))).toEqual([
            true,
            false,
        ])
        await act(async () => {
            button.click()
        })
        expect(icons()).toHaveLength(2)
        expect(icons().map(i => i.classList.contains('opacity-100'))).toEqual([
            false,
            true,
        ])
        for (const icon of icons()) {
            expect(icon.getAttribute('class')).not.toMatch(/scale|rotate/)
        }
    })
})

describe('Ask AI transcript arrival', () => {
    const u1: DocsChatMessage = { id: 'u1', role: 'user', content: 'How?' }
    const a1: DocsChatMessage = {
        id: 'a1',
        role: 'assistant',
        content: 'Use the ',
        streaming: true,
    }

    function transcriptItems() {
        return Array.from(
            container.querySelectorAll<HTMLElement>('ul[data-ph-mask] > li'),
        )
    }

    it('gives each new message li the arrival animation', () => {
        renderAskAi(true, [u1, a1])
        const items = transcriptItems()
        expect(items).toHaveLength(2)
        for (const li of items) {
            expect(li.className).toContain('motion-safe:animate-motion-enter')
            // Reduced motion: opacity only.
            expect(li.className).toContain('motion-reduce:animate-motion-fade')
        }
    })

    it('mounts each li once per stable id: no replay on stream growth, a new message, or drawer reopen', () => {
        renderAskAi(true, [u1, a1])
        const [userLi, assistantLi] = transcriptItems()
        const firstWord = assistantLi.querySelector('p span')

        // Streaming growth: same id, longer text.
        renderAskAi(true, [
            u1,
            { ...a1, content: 'Use the tus strategy. Then' },
        ])
        let items = transcriptItems()
        expect(items[0]).toBe(userLi)
        expect(items[1]).toBe(assistantLi)
        expect(items[1].textContent).toContain('Use the tus strategy.')
        // Growth never replays: only the new words are fresh nodes, the word
        // that was already shown keeps its element.
        expect(items[1].querySelector('p span')).toBe(firstWord)
        expect(
            items[1].querySelectorAll('.motion-safe\\:animate-motion-enter'),
        ).toHaveLength(0)

        // A new message arrives: only it is a fresh node.
        const u2: DocsChatMessage = { id: 'u2', role: 'user', content: 'More?' }
        renderAskAi(true, [
            u1,
            { ...a1, content: 'Use the tus strategy.', streaming: false },
            u2,
        ])
        items = transcriptItems()
        expect(items).toHaveLength(3)
        expect(items[0]).toBe(userLi)
        expect(items[1]).toBe(assistantLi)
        expect(items[2]).not.toBe(userLi)

        // Close and reopen the drawer: the transcript is not re-mounted.
        renderAskAi(false, [
            u1,
            { ...a1, content: 'Use the tus strategy.', streaming: false },
            u2,
        ])
        renderAskAi(true, [
            u1,
            { ...a1, content: 'Use the tus strategy.', streaming: false },
            u2,
        ])
        items = transcriptItems()
        expect(items[0]).toBe(userLi)
        expect(items[1]).toBe(assistantLi)
    })
})

describe('docs search dialog enter', () => {
    function renderSearch(open: boolean) {
        act(() => {
            root.render(
                createElement(DocsSearchDialog, {
                    open,
                    onOpenChange: () => {},
                }),
            )
        })
    }

    it('fades the overlay in and rises/scales the panel in', () => {
        renderSearch(true)
        const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!
        const overlay = dialog.parentElement!
        expect(overlay.className).toContain('motion-safe:animate-motion-fade')
        expect(dialog.className).toContain('motion-safe:animate-motion-panel')
        // Reduced motion: opacity only, no scale/translate.
        expect(dialog.className).toContain('motion-reduce:animate-motion-fade')
    })

    it('exits instantly: closing unmounts with no presence layer', () => {
        renderSearch(true)
        expect(container.querySelector('[role="dialog"]')).not.toBeNull()
        renderSearch(false)
        expect(container.querySelector('[role="dialog"]')).toBeNull()
    })
})
