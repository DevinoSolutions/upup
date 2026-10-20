import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MarkdownMessage } from '../ai/MarkdownMessage'

const ANSWER = [
    'Switched to **server mode**. Read [the guide](https://useupup.com/docs/server-mode/) next.',
    '',
    '```ts',
    "createUpupHandler({ storage: { type: 'aws' } })",
    '```',
    '',
    '| Option | Value |',
    '| --- | --- |',
    "| `mode` | `'server'` |",
    '',
    '- Sources',
    '  - Local',
    '- Limits',
].join('\n')

/** Seeded PRNG so the random chunkings are reproducible. */
function chunkings(text: string, runs: number): string[][] {
    let seed = 42
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
    const out: string[][] = []
    for (let r = 0; r < runs; r++) {
        const chunks: string[] = []
        let i = 0
        while (i < text.length) {
            const n = 1 + Math.floor(rand() * 12)
            chunks.push(text.slice(i, i + n))
            i += n
        }
        out.push(chunks)
    }
    return out
}

function unchunkedHtml(text: string): string {
    const { container, unmount } = render(
        <MarkdownMessage text={text} streaming={false} />,
    )
    const html = container.innerHTML
    unmount()
    return html
}

describe('MarkdownMessage', () => {
    it('ends byte-identical to the unchunked render however the stream was chunked', () => {
        const expected = unchunkedHtml(ANSWER)
        for (const chunks of chunkings(ANSWER, 25)) {
            let received = ''
            const { container, rerender, unmount } = render(
                <MarkdownMessage text="" streaming />,
            )
            for (const chunk of chunks) {
                received += chunk
                rerender(<MarkdownMessage text={received} streaming />)
            }
            rerender(<MarkdownMessage text={received} streaming={false} />)
            expect(container.innerHTML).toBe(expected)
            unmount()
        }
    })

    it('never shows raw markdown syntax mid-stream', () => {
        let received = ''
        const { container, rerender } = render(
            <MarkdownMessage text="" streaming />,
        )
        for (const ch of ANSWER) {
            received += ch
            rerender(<MarkdownMessage text={received} streaming />)
            const shown = container.textContent ?? ''
            expect(shown).not.toMatch(/```|\*\*|\]\(|\| ---/)
            expect(shown).not.toMatch(/\[the guide/)
        }
    })

    it('keeps every shown unit as the same DOM node while more text streams in', () => {
        const LOOSE = '1. Install\n\n2. Configure\n\n3. Deploy\n\nDone.'
        for (const text of [ANSWER, LOOSE]) {
            const { container, rerender, unmount } = render(
                <MarkdownMessage text="" streaming />,
            )
            // Each tracked unit: the first node seen is the node for good.
            const selectors = [
                'p span.upup-ie-ai-ease',
                'p strong',
                'p a',
                'pre',
                'tbody tr',
                'ul > li',
                'ol',
                'ol > li',
                'ol > li:nth-child(2)',
                'li li',
            ]
            const held = new Map<string, Element>()
            const check = () => {
                for (const sel of selectors) {
                    const node = container.querySelector(sel)
                    const first = held.get(sel)
                    if (first) expect(node).toBe(first)
                    else if (node) held.set(sel, node)
                }
            }
            for (let i = 1; i <= text.length; i++) {
                rerender(<MarkdownMessage text={text.slice(0, i)} streaming />)
                check()
            }
            rerender(<MarkdownMessage text={text} streaming={false} />)
            check()
            const expected =
                text === ANSWER
                    ? [
                          'p span.upup-ie-ai-ease',
                          'p strong',
                          'p a',
                          'pre',
                          'tbody tr',
                          'ul > li',
                          'li li',
                      ]
                    : [
                          'p span.upup-ie-ai-ease',
                          'ol',
                          'ol > li',
                          'ol > li:nth-child(2)',
                      ]
            expect([...held.keys()].sort()).toEqual(expected.sort())
            unmount()
        }
    })

    it('renders a loose ordered list as one <ol> numbered from its source', () => {
        const { container } = render(
            <MarkdownMessage
                text={'1. a\n\n2. b\n\n3. c\n\ntext\n\n4. d\n5. e'}
                streaming={false}
            />,
        )
        const lists = container.querySelectorAll('ol')
        expect(lists).toHaveLength(2)
        expect(lists[0]?.querySelectorAll('li')).toHaveLength(3)
        expect(lists[0]?.getAttribute('start')).toBe('1')
        expect(lists[1]?.querySelectorAll('li')).toHaveLength(2)
        expect(lists[1]?.getAttribute('start')).toBe('4')
    })

    it('releases held openers and an unclosed fence once streaming ends', () => {
        const { container, rerender } = render(
            <MarkdownMessage text="a **b c" streaming />,
        )
        expect(container.textContent).toBe('a ')
        rerender(<MarkdownMessage text="a **b c" streaming={false} />)
        expect(container.textContent).toBe('a **b c')

        const fence = 'Code:\n\n```js\nconst a = 1\n'
        rerender(<MarkdownMessage text={fence} streaming />)
        expect(container.querySelector('pre')).toBe(null)
        expect(container.textContent).toBe('Code:')
        rerender(<MarkdownMessage text={fence} streaming={false} />)
        expect(container.querySelector('pre code')?.textContent).toBe(
            'const a = 1',
        )
    })

    it('renders a thematic break as an <hr> between its neighbours', () => {
        const { container } = render(
            <MarkdownMessage
                text={'Above.\n\n---\n\nMiddle.\n***\nBelow.\n___\n'}
                streaming={false}
            />,
        )
        expect(
            [...container.querySelector('.upup-ie-ai-md')!.children].map(
                el => el.tagName,
            ),
        ).toEqual(['P', 'HR', 'P', 'HR', 'P', 'HR'])
        expect(container.textContent).not.toMatch(/-{3}|\*{3}|_{3}/)
        // Decorative: nothing for a screen reader to announce but the separator.
        expect(container.querySelector('hr')?.textContent).toBe('')
    })

    it('keeps a rule and its neighbours as the same DOM nodes while more text streams in', () => {
        const RULES =
            'Intro **one**.\n\n---\n\nMiddle text.\n***\nOutro [x](https://x.dev) end.\n\n- - -\n\nLast.'
        const { container, rerender } = render(
            <MarkdownMessage text="" streaming />,
        )
        const selectors = [
            'hr',
            'hr:nth-of-type(2)',
            'hr:nth-of-type(3)',
            'p strong',
            'p a',
            'p span.upup-ie-ai-ease',
            'p:nth-of-type(2)',
        ]
        const held = new Map<string, Element>()
        const check = () => {
            for (const sel of selectors) {
                const node = container.querySelector(sel)
                const first = held.get(sel)
                if (first) expect(node).toBe(first)
                else if (node) held.set(sel, node)
            }
        }
        for (let i = 1; i <= RULES.length; i++) {
            rerender(<MarkdownMessage text={RULES.slice(0, i)} streaming />)
            check()
            // A rule never shows up half-typed: never a stray dash or star.
            expect(container.textContent).not.toMatch(/(^|\s)[-*_]{1,3}(\s|$)/)
        }
        rerender(<MarkdownMessage text={RULES} streaming={false} />)
        check()
        expect([...held.keys()].sort()).toEqual([...selectors].sort())
        expect(container.querySelectorAll('hr')).toHaveLength(3)
    })

    it('ends byte-identical to the unchunked render with rules in the answer', () => {
        const text =
            'One.\n\n---\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n---\n- a\n- - -\n- b\n'
        const expected = unchunkedHtml(text)
        expect(expected).toContain('<hr')
        for (const chunks of chunkings(text, 25)) {
            let received = ''
            const { container, rerender, unmount } = render(
                <MarkdownMessage text="" streaming />,
            )
            for (const chunk of chunks) {
                received += chunk
                rerender(<MarkdownMessage text={received} streaming />)
            }
            rerender(<MarkdownMessage text={received} streaming={false} />)
            expect(container.innerHTML).toBe(expected)
            unmount()
        }
    })

    it('renders CRLF text the same as LF text', () => {
        const lf = '## Title\nBody **bold**\n\n- a\n- b\n'
        const crlfText = lf.replace(/\n/g, '\r\n')
        expect(unchunkedHtml(crlfText)).toBe(unchunkedHtml(lf))
        const { container } = render(
            <MarkdownMessage text={crlfText} streaming />,
        )
        expect(container.querySelector('h4')?.textContent).toBe('Title')
    })

    it('renders an unsafe link scheme as inert text', () => {
        const { container } = render(
            <MarkdownMessage
                text="[click](javascript:alert(1)) and [ok](https://useupup.com)"
                streaming={false}
            />,
        )
        const anchors = container.querySelectorAll('a')
        expect(anchors).toHaveLength(1)
        expect(anchors[0]?.getAttribute('href')).toBe('https://useupup.com')
        expect(anchors[0]?.getAttribute('rel')).toBe('noreferrer noopener')
        expect(container.textContent).toContain('click')
    })

    it('marks each newly shown unit for the ease-in', () => {
        const { container } = render(
            <MarkdownMessage text={ANSWER} streaming={false} />,
        )
        expect(
            container.querySelectorAll('p .upup-ie-ai-ease').length,
        ).toBeGreaterThan(3)
        expect(container.querySelector('pre.upup-ie-ai-ease-block')).not.toBe(
            null,
        )
        expect(
            container.querySelectorAll('tbody tr.upup-ie-ai-ease-block'),
        ).toHaveLength(1)
        expect(
            container.querySelectorAll('li.upup-ie-ai-ease-block'),
        ).toHaveLength(3)
    })

    it('makes wide code and tables keyboard-scrollable', () => {
        const { container } = render(
            <MarkdownMessage text={ANSWER} streaming={false} />,
        )
        for (const el of container.querySelectorAll('.upup-ie-ai-md-scroll')) {
            expect(el.getAttribute('tabindex')).toBe('0')
            // aria-label is only valid on an element with a role.
            expect(el.getAttribute('role')).toBe('region')
            expect(el.getAttribute('aria-label')).toBeTruthy()
        }
        expect(
            container.querySelectorAll('.upup-ie-ai-md-scroll'),
        ).toHaveLength(2)
    })
})
