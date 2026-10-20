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
