import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MessageBody, parseBlocks } from '@/components/docs/DocsAskAi'

// The Ask-AI answer renderer is a hand-rolled SAFE markdown-ish pipeline: every
// token becomes a React text node (NO innerHTML anywhere), so these tests render
// MessageBody to static markup and assert on the produced HTML. renderToStaticMarkup
// runs in the node test env without a DOM.
function render(content: string): string {
    return renderToStaticMarkup(MessageBody({ content }))
}

describe('MessageBody inline rendering', () => {
    it('renders **bold** as <strong> with no literal asterisks left', () => {
        const html = render('This is **bold** text.')
        expect(html).toContain('<strong')
        expect(html).toContain('bold')
        expect(html).not.toContain('**')
    })

    it('renders bold that wraps inline code as <strong><code>', () => {
        const html = render('Install with **`npm i @upupjs/core`** first.')
        expect(html).toContain('<strong')
        expect(html).toContain('<code')
        expect(html).toContain('npm i @upupjs/core')
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
        expect(html).toContain('Just a normal sentence about uploads.')
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
        expect(html).toContain('Install the package')
        expect(html).toContain('Render it')
        // The intro line stays a paragraph, not swallowed into the list.
        expect(html).toContain('Steps:')
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

describe('parseBlocks', () => {
    it('groups ordered, unordered, and paragraph runs', () => {
        const blocks = parseBlocks(
            'Intro line\n1. one\n2. two\n\n- a\n- b\nOutro',
        )
        expect(blocks.map(b => b.type)).toEqual(['p', 'ol', 'ul', 'p'])
        const ol = blocks[1]
        const ul = blocks[2]
        expect(ol.type === 'ol' && ol.items).toEqual(['one', 'two'])
        expect(ul.type === 'ul' && ul.items).toEqual(['a', 'b'])
    })

    it('treats `1)` and `*` markers as list items', () => {
        const blocks = parseBlocks('1) first\n* bullet')
        expect(blocks.map(b => b.type)).toEqual(['ol', 'ul'])
    })

    it('returns an empty array for blank input', () => {
        expect(parseBlocks('')).toEqual([])
        expect(parseBlocks('\n\n')).toEqual([])
    })
})
