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

import { DocsAskAi } from '@/components/docs/DocsAskAi'
import type { useDocsChat } from '@/lib/docs/use-docs-chat'

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

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
})

function chatState(pending: boolean, send = vi.fn()) {
    return {
        messages: [],
        pending,
        send,
        clear: vi.fn(),
    } as unknown as ReturnType<typeof useDocsChat>
}

function renderDrawer(pending: boolean, onClose: () => void, send = vi.fn()) {
    act(() =>
        root.render(
            createElement(DocsAskAi, {
                open: true,
                onClose,
                chat: chatState(pending, send),
            }),
        ),
    )
}

function q<T extends HTMLElement>(testId: string): T {
    const el = container.querySelector<T>(`[data-testid="${testId}"]`)
    if (!el) throw new Error(`missing ${testId}`)
    return el
}

// A keyboard user Tabs to Send and presses Enter/Space. Submitting clears the
// input and flips `pending`, which disables Send. Chrome then drops focus from
// the disabled button to <body>, and the drawer's Escape handler (on the
// <aside>) never sees the key, so the user is stranded. jsdom has no such focus
// fixup, so the assertion is positive: focus must have been MOVED to the
// composer, not merely "not on the button".
describe('Ask AI Send button keeps focus in the composer', () => {
    it('moves focus to the textarea when Send submits, so Escape still closes', () => {
        const onClose = vi.fn()
        const send = vi.fn()
        renderDrawer(false, onClose, send)

        const textarea = q<HTMLTextAreaElement>('docs-ask-ai-input')
        const sendButton = q<HTMLButtonElement>('docs-ask-ai-send')

        const setValue = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            'value',
        )!.set!
        act(() => {
            setValue.call(textarea, 'How do I resume uploads?')
            textarea.dispatchEvent(new Event('input', { bubbles: true }))
        })

        act(() => sendButton.focus())
        expect(document.activeElement).toBe(sendButton)

        // Enter/Space on a focused button dispatches click.
        act(() => sendButton.click())
        expect(send).toHaveBeenCalledWith('How do I resume uploads?')

        // The chat is now pending: Send becomes disabled.
        renderDrawer(true, onClose, send)
        expect(q<HTMLButtonElement>('docs-ask-ai-send').disabled).toBe(true)

        expect(document.activeElement).toBe(q('docs-ask-ai-input'))

        act(() => {
            document.activeElement!.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Escape',
                    bubbles: true,
                }),
            )
        })
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('leaves focus in the textarea when Enter submits from it', () => {
        const onClose = vi.fn()
        const send = vi.fn()
        renderDrawer(false, onClose, send)

        const textarea = q<HTMLTextAreaElement>('docs-ask-ai-input')
        const setValue = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            'value',
        )!.set!
        act(() => {
            setValue.call(textarea, 'hello')
            textarea.dispatchEvent(new Event('input', { bubbles: true }))
            textarea.focus()
        })
        act(() => {
            textarea.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Enter',
                    bubbles: true,
                    cancelable: true,
                }),
            )
        })
        expect(send).toHaveBeenCalledWith('hello')

        renderDrawer(true, onClose, send)
        expect(document.activeElement).toBe(q('docs-ask-ai-input'))
    })
})
