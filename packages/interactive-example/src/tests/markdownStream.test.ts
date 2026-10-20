import { describe, it, expect } from 'vitest'
import {
    parseMarkdown,
    stableMarkdownPrefix,
    type Block,
    type Inline,
} from '../ai/markdownStream'

// Each fixture packs the units the brief calls out: a fence split across
// chunks, a link whose URL arrives after its label, a table that is only a
// table once its delimiter row lands, nested list items, plus bold, inline
// code and bare URLs inside running prose.
const FIXTURES: Record<string, string> = {
    fence: [
        'Set the mode first:',
        '',
        '```ts',
        "const uploader = createUploader({ mode: 'server' })",
        '```',
        '',
        'Then call `uploader.start()`.',
    ].join('\n'),
    link: 'Read [server mode](https://useupup.com/docs/server-mode/) before you deploy, or see https://useupup.com/docs/ for the rest.',
    table: [
        'Limits that apply:',
        '',
        '| Option | Default |',
        '| --- | --- |',
        '| `maxFiles` | **10** |',
        '| `maxFileSize` | 5 MB |',
        '',
        'Done.',
    ].join('\n'),
    nestedList: [
        'Steps:',
        '- Pick a **source**',
        '  - Local files',
        '  - [Google Drive](https://drive.google.com)',
        '- Set `maxFiles`',
        '1. Save',
        '2. Upload',
    ].join('\n'),
    inline: 'This is **bold text with `code` inside** and a [link](https://x.dev/a) then `a b c` ends.\nSecond line of the same paragraph.',
    heading: '## Server mode\nUse **presigned** URLs.\n\n### Notes\n- one',
    notATable:
        '| this has pipes |\nbut no delimiter row, so it stays a paragraph.',
    unclosed:
        'An opener that never closes: **bold and [label and `tick and https://x.dev',
    unterminatedFence: 'Code:\n\n```js\nconst a = 1\n',
    literalBrackets:
        'Array [0] and [x] (y) and a ] stray, then **** and `` done.',
    // Lines whose block type is only settled by what comes next.
    lookahead: [
        'Use **bold',
        'across** lines.',
        '-5 degrees is a paragraph line',
        '| a pipe line before a list',
        '- item',
        '',
        '**never closed',
        '',
        'After.',
    ].join('\n'),
}

const fixtureEntries = Object.entries(FIXTURES)

function textPrefixOk(a: Inline, b: Inline | undefined): boolean {
    if (!b || a.type !== b.type || a.start !== b.start) return false
    if (a.type === 'text' && b.type === 'text') return b.text.startsWith(a.text)
    return JSON.stringify(a) === JSON.stringify(b)
}

/** `a` is `b` truncated, with only the trailing plain text cut short. */
function inlinePrefixOk(a: Inline[], b: Inline[]): boolean {
    if (a.length > b.length) return false
    return a.every((tok, i) =>
        i === a.length - 1
            ? textPrefixOk(tok, b[i])
            : JSON.stringify(tok) === JSON.stringify(b[i]),
    )
}

/**
 * Every block the prefix renders is a whole unit of the full render: all but
 * the last block are identical, and the last may only be a paragraph with a
 * shorter trailing text run, or a list/table that has fewer whole items/rows.
 */
function blockPrefixOk(a: Block, b: Block | undefined): boolean {
    if (!b || a.type !== b.type || a.start !== b.start) return false
    if (a.type === 'paragraph' && b.type === 'paragraph')
        return inlinePrefixOk(a.inline, b.inline)
    if (a.type === 'list' && b.type === 'list') {
        if (a.ordered !== b.ordered || a.items.length > b.items.length)
            return false
        return a.items.every((item, i) => {
            const other = b.items[i]
            if (!other) return false
            if (i < a.items.length - 1)
                return JSON.stringify(item) === JSON.stringify(other)
            return (
                JSON.stringify(item.inline) === JSON.stringify(other.inline) &&
                structuralPrefix(item.children, other.children)
            )
        })
    }
    if (a.type === 'table' && b.type === 'table') {
        if (JSON.stringify(a.header) !== JSON.stringify(b.header)) return false
        if (a.rows.length > b.rows.length) return false
        return a.rows.every(
            (row, i) => JSON.stringify(row) === JSON.stringify(b.rows[i]),
        )
    }
    return JSON.stringify(a) === JSON.stringify(b)
}

function structuralPrefix(a: Block[], b: Block[]): boolean {
    if (a.length > b.length) return false
    return a.every((block, i) =>
        i === a.length - 1
            ? blockPrefixOk(block, b[i])
            : JSON.stringify(block) === JSON.stringify(b[i]),
    )
}

describe('stableMarkdownPrefix', () => {
    it.each(fixtureEntries)(
        '%s: every split index yields only whole units of the final render',
        (_name, text) => {
            const full = parseMarkdown(text)
            let previous = ''
            for (let i = 0; i <= text.length; i++) {
                const received = text.slice(0, i)
                const shown = stableMarkdownPrefix(received)
                expect(received.startsWith(shown)).toBe(true)
                // Monotonic: text already on screen is never taken back.
                expect(shown.startsWith(previous)).toBe(true)
                previous = shown
                const ok = structuralPrefix(parseMarkdown(shown), full)
                if (!ok)
                    throw new Error(
                        `partial unit at split ${i}: ${JSON.stringify(shown)}`,
                    )
            }
        },
    )

    it.each(fixtureEntries.filter(([name]) => name !== 'unterminatedFence'))(
        '%s: releases everything once the last block has ended',
        (_name, text) => {
            expect(stableMarkdownPrefix(`${text}\n\n`)).toBe(`${text}\n\n`)
        },
    )

    it('holds a link until its URL has arrived', () => {
        expect(stableMarkdownPrefix('See [server mode')).toBe('See ')
        expect(stableMarkdownPrefix('See [server mode](https://x.dev/do')).toBe(
            'See ',
        )
        expect(
            stableMarkdownPrefix('See [server mode](https://x.dev/docs) now'),
        ).toBe('See [server mode](https://x.dev/docs) ')
    })

    it('never shows an open code fence, then shows it whole once closed', () => {
        const open = 'Run:\n\n```bash\npnpm add @useupup/react\n'
        expect(stableMarkdownPrefix(open)).toBe('Run:\n\n')
        const closed = `${open}\`\`\`\n`
        expect(stableMarkdownPrefix(closed)).toBe(closed)
    })

    it('shows a table only once its delimiter row is complete', () => {
        const header = 'x\n\n| A | B |\n'
        expect(stableMarkdownPrefix(header)).toBe('x\n\n')
        expect(stableMarkdownPrefix(`${header}| --- | -`)).toBe('x\n\n')
        expect(stableMarkdownPrefix(`${header}| --- | --- |\n`)).toBe(
            `${header}| --- | --- |\n`,
        )
    })

    it('holds a list item until its line ends', () => {
        expect(stableMarkdownPrefix('Steps:\n- Pick a sou')).toBe('Steps:\n')
        expect(stableMarkdownPrefix('Steps:\n- Pick a source\n')).toBe(
            'Steps:\n- Pick a source\n',
        )
    })

    it('holds a bare URL until whitespace ends it', () => {
        expect(stableMarkdownPrefix('Go to https://useupup.com/do')).toBe(
            'Go to ',
        )
        expect(stableMarkdownPrefix('Go to https://useupup.com/docs ')).toBe(
            'Go to https://useupup.com/docs ',
        )
    })
})

describe('parseMarkdown', () => {
    it('treats an opener that never closes as literal text once the stream ends', () => {
        const blocks = parseMarkdown('a **b and [c and `d')
        expect(blocks).toHaveLength(1)
        const first = blocks[0]
        expect(first?.type).toBe('paragraph')
        if (first?.type !== 'paragraph') return
        expect(first.inline).toEqual([
            { type: 'text', text: 'a **b and [c and `d', start: 0 },
        ])
    })

    it('nests an indented list item under the item above it', () => {
        const [list] = parseMarkdown('- a\n  - b\n- c')
        expect(list?.type).toBe('list')
        if (list?.type !== 'list') return
        expect(list.items).toHaveLength(2)
        expect(list.items[0]?.children[0]?.type).toBe('list')
    })

    it('trims trailing sentence punctuation off a bare URL', () => {
        const [p] = parseMarkdown('See https://useupup.com/docs.')
        if (p?.type !== 'paragraph') throw new Error('expected a paragraph')
        expect(p.inline[1]).toEqual({
            type: 'link',
            label: 'https://useupup.com/docs',
            href: 'https://useupup.com/docs',
            start: 4,
        })
    })
})
