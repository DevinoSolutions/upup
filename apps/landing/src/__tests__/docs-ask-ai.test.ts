import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageBody } from '@/components/docs/DocsAskAi'
import type { DocsChatMessage } from '@/lib/docs/use-docs-chat'

// The Ask-AI answer renderer is a hand-rolled SAFE markdown-ish pipeline: every
// token becomes a React text node (NO innerHTML anywhere), so these tests render
// MessageBody to static markup and assert on the produced HTML. renderToStaticMarkup
// runs in the node test env without a DOM. Plain text is split into one span per
// word (the ease-in unit), so sentence-level assertions go through textOf().
function render(content: string): string {
    return renderToStaticMarkup(createElement(MessageBody, { content }))
}

const textOf = (html: string) => html.replace(/<[^>]*>/g, '')

describe('MessageBody inline rendering', () => {
    it('renders **bold** as <strong> with no literal asterisks left', () => {
        const html = render('This is **bold** text.')
        expect(html).toContain('<strong')
        expect(html).toContain('bold')
        expect(html).not.toContain('**')
    })

    it('renders bold that wraps inline code as <strong><code>', () => {
        const html = render('Install with **`npm i @useupup/core`** first.')
        expect(html).toContain('<strong')
        expect(html).toContain('<code')
        expect(html).toContain('npm i @useupup/core')
        // Both markers are consumed — no raw ** or backticks bleed through.
        expect(html).not.toContain('**')
        expect(html).not.toContain('`')
    })

    it('keeps inline-code chips working outside bold', () => {
        const html = render('Pass the `resumable` prop.')
        expect(html).toContain('<code')
        expect(html).toContain('resumable')
        expect(html).not.toContain('`resumable`')
    })

    it('renders a plain paragraph untouched (no list/bold markup)', () => {
        const html = render('Just a normal sentence about uploads.')
        expect(textOf(html)).toContain('Just a normal sentence about uploads.')
        expect(html).toContain('<p')
        expect(html).not.toContain('<strong')
        expect(html).not.toContain('<ol')
        expect(html).not.toContain('<li')
    })
})

describe('MessageBody block rendering', () => {
    it('renders a numbered run as <ol> with <li> items', () => {
        const html = render(
            'Steps:\n1. Install the package\n2. Import it\n3. Render it',
        )
        expect(html).toContain('<ol')
        const liCount = (html.match(/<li/g) ?? []).length
        expect(liCount).toBe(3)
        expect(textOf(html)).toContain('Install the package')
        expect(textOf(html)).toContain('Render it')
        // The intro line stays a paragraph, not swallowed into the list.
        expect(textOf(html)).toContain('Steps:')
        // Numbers are structural (<ol>), not literal text.
        expect(html).not.toContain('1. Install')
    })

    it('renders a dashed run as <ul> with <li> items', () => {
        const html = render('- react\n- vue\n- svelte')
        expect(html).toContain('<ul')
        const liCount = (html.match(/<li/g) ?? []).length
        expect(liCount).toBe(3)
        expect(html).not.toContain('<ol')
    })
})

describe('MessageBody link safety (regression pin)', () => {
    it('renders a javascript: markdown link as inert text, never an anchor', () => {
        const html = render('[click me](javascript:alert(1))')
        expect(html).toContain('click me')
        expect(html).not.toContain('<a')
        expect(html).not.toContain('javascript:')
    })

    it('still renders an https markdown link as a real anchor', () => {
        const html = render('[example](https://example.com/page)')
        expect(html).toContain('<a')
        expect(html).toContain('href="https://example.com/page"')
        expect(html).toContain('example')
    })
})

describe('MessageBody fenced code blocks', () => {
    it('renders a fence as <pre><code> with a copy control and contained scroll', () => {
        const html = render('```ts\nconst x = 1\n```')
        expect(html).toContain('<pre')
        expect(html).toContain('<code')
        expect(html).toContain('const x = 1')
        // Language tag line is dropped.
        expect(html).not.toContain('>ts')
        // Horizontal scroll is contained inside the block, not the drawer.
        expect(html).toContain('overflow-x-auto')
        // Copy button is present.
        expect(html).toContain('aria-label="Copy code"')
    })
})

describe('MessageBody block grouping', () => {
    // Re-pinned from the retired parseBlocks unit tests: the same grouping
    // intent, asserted through the shared parser's rendered structure.
    const tags = (html: string) =>
        Array.from(html.matchAll(/<(p|ol|ul)[ >]/g), m => m[1])

    it('groups ordered, unordered, and paragraph runs', () => {
        const html = render('Intro line\n1. one\n2. two\n\n- a\n- b\nOutro')
        expect(tags(html)).toEqual(['p', 'ol', 'ul', 'p'])
        expect((html.match(/<li/g) ?? []).length).toBe(4)
    })

    it('treats `1)` and `*` markers as list items', () => {
        const html = render('1) first\n* bullet')
        expect(tags(html)).toEqual(['ol', 'ul'])
    })

    it('renders nothing for blank input', () => {
        expect(render('')).toBe('')
        expect(render('\n\n')).toBe('')
    })

    it('renders a pipe table as a focusable, scrollable region', () => {
        const html = render('| a | b |\n| - | - |\n| 1 | 2 |')
        expect(html).toContain('<table')
        expect(html).toContain('overflow-x-auto')
        expect(html).toContain('tabindex="0"')
        expect(html).toContain('aria-label="Table"')
    })
})

describe('DocsAskAi transcript in session replays', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    // clientEnv is read once at module load, so the drawer is imported after
    // the Ask-AI base URL is stubbed (an unconfigured drawer has no transcript).
    // The drawer uses hooks, so it is rendered through createElement rather
    // than called directly like MessageBody above.
    async function renderDrawer(messages: DocsChatMessage[]): Promise<string> {
        vi.resetModules()
        vi.stubEnv('NEXT_PUBLIC_MASTRA_BASE_URL', 'https://mastra.test')
        const [{ createElement }, server, { DocsAskAi }] = await Promise.all([
            import('react'),
            import('react-dom/server'),
            import('@/components/docs/DocsAskAi'),
        ])
        return server.renderToStaticMarkup(
            createElement(DocsAskAi, {
                open: true,
                onClose: () => {},
                chat: {
                    messages,
                    pending: false,
                    send: async () => {},
                    clear: () => {},
                },
            }),
        )
    }

    it("renders the visitor's question, the answer and a failed turn inside a data-ph-mask element", async () => {
        const html = await renderDrawer([
            { id: 'q', role: 'user', content: 'my private question' },
            { id: 'a', role: 'assistant', content: 'an answer quoting it' },
            { id: 'q2', role: 'user', content: 'a second question' },
            {
                id: 'e',
                role: 'assistant',
                content: 'an error quoting it',
                error: true,
            },
        ])
        const transcript = /<ul[^>]*data-ph-mask[^>]*>([\s\S]*)<\/ul>/.exec(
            html,
        )
        expect(transcript).not.toBeNull()
        expect(transcript![1]).toContain('my private question')
        expect(textOf(transcript![1])).toContain('an answer quoting it')
        expect(transcript![1]).toContain('an error quoting it')
        expect(transcript![1]).toContain('Retry')
    })
})
