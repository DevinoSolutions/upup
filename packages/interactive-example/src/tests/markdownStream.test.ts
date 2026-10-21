import { describe, it, expect } from 'vitest'
import {
    normalizeNewlines,
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
    // A loose list: items separated by blank lines are still one list.
    looseList: [
        '1. Install',
        '',
        '2. Configure **mode**',
        '',
        '',
        '3. Deploy',
        '',
        'Then:',
        '',
        '- a',
        '',
        '  - nested',
        '',
        '1. other kind',
    ].join('\n'),
    // Cells take the same inline markup as paragraphs: code spans, bold, links
    // (whose label may itself be code), an escaped pipe, and a pipe inside a
    // code span.
    tableInline: [
        'Options:',
        '',
        '| Option | Type | Notes |',
        '| --- | --- | --- |',
        '| `maxFileSize` | number | See [`limits`](/docs/limits) and **`accept`** |',
        "| `mode` | `'client' \\| 'server'` | [Read](https://useupup.com/docs/server-mode/) \\| more |",
        '| `a | b` | x | y |',
        '',
        'Done.',
    ].join('\n'),
    // The shape a model actually emits for an options table, plus the
    // double-backtick and spaced forms it sometimes uses.
    tableCode: [
        '| Option | Purpose |',
        '|---|---|',
        '| `maxFileSize` | Maximum file size in bytes |',
        '| `allowedFileTypes` | Restrict to specific MIME types or extensions |',
        '| ``accept`` | Holds a `` `tick` `` too |',
        '| `maxFiles`  |  Count |',
        '',
        'See [Optional Props](/docs/x) for details and examples.',
    ].join('\n'),
    parenUrls:
        'See https://en.wikipedia.org/wiki/Foo_(bar) and [a](https://en.wikipedia.org/wiki/Foo_(bar)) (or https://x.dev/a). Also https://x.dev/b, then https://x.dev/c((d)) ok.',
    // Thematic breaks: all three characters, spaced runs, one straight after a
    // paragraph line and one between list items, plus a rule that ends a table.
    rules: [
        'Intro paragraph.',
        '',
        '---',
        '',
        'Middle **bold** text.',
        '***',
        'After.',
        '___',
        '',
        '- a',
        '- - -',
        '- b',
        '',
        '| A | B |',
        '| --- | --- |',
        '| 1 | 2 |',
        '---',
        'End.',
    ].join('\n'),
    // Lines that look a little like a rule but are not one.
    notRules: [
        'Value is -5 -- roughly',
        '-- not a rule',
        '-',
        '--',
        '---x',
        '**',
        '__init__ stays text',
        '- - a',
        '--- a note',
        'text',
        '___ x',
        '',
        '*** tail',
    ].join('\n'),
    // No setext headings: a rule under a text line is a rule, not an <h2>.
    setext: 'Title\n---\nBody\n===\nMore\n\nLast\n-----\n',
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

    it('holds a URL while a balanced paren group in it is still open', () => {
        const wiki = 'https://en.wikipedia.org/wiki/Foo_(bar'
        expect(stableMarkdownPrefix(`Go to ${wiki}`)).toBe('Go to ')
        expect(stableMarkdownPrefix(`Go to ${wiki}) `)).toBe(`Go to ${wiki}) `)
        expect(stableMarkdownPrefix(`See [a](${wiki})`)).toBe('See ')
        // A closed token inside the URL must not release a link whose open
        // paren group may still close.
        expect(stableMarkdownPrefix('See [w](a`b`(c')).toBe('See ')
        expect(stableMarkdownPrefix(`See [a](${wiki})) `)).toBe(
            `See [a](${wiki})) `,
        )
    })

    it('holds an unmatched ** ` or [ only until the paragraph ends', () => {
        for (const opener of ['**', '`', '[']) {
            const open = `a ${opener}b c`
            expect(stableMarkdownPrefix(open)).toBe('a ')
            // Bold and code may close on a later line of the same paragraph;
            // a link label cannot span lines, so its line end releases it.
            expect(stableMarkdownPrefix(`${open}\nmore words `)).toBe(
                opener === '[' ? `${open}\nmore words ` : 'a ',
            )
            // A blank line ends the paragraph: the opener is literal text.
            expect(stableMarkdownPrefix(`${open}\n\nNext `)).toBe(
                `${open}\n\nNext `,
            )
            // So does a block that cannot continue a paragraph.
            expect(stableMarkdownPrefix(`${open}\n- item\n`)).toBe(
                `${open}\n- item\n`,
            )
        }
    })

    it('holds a possible next item of a loose list', () => {
        expect(stableMarkdownPrefix('1. a\n\n2')).toBe('1. a\n\n')
        expect(stableMarkdownPrefix('1. a\n\n2. b')).toBe('1. a\n\n')
        expect(stableMarkdownPrefix('1. a\n\n2. b\n')).toBe('1. a\n\n2. b\n')
    })
})

const crlf = (s: string) => s.replace(/\n/g, '\r\n')

describe('CRLF input', () => {
    it.each(fixtureEntries)(
        '%s: parses and streams exactly like its LF twin',
        (_name, lf) => {
            const text = crlf(lf)
            const full = parseMarkdown(text)
            expect(full).toEqual(parseMarkdown(lf))
            let previous = ''
            for (let i = 0; i <= text.length; i++) {
                const received = text.slice(0, i)
                const shown = stableMarkdownPrefix(received)
                expect(normalizeNewlines(received).startsWith(shown)).toBe(true)
                expect(shown.startsWith(previous)).toBe(true)
                previous = shown
                if (!structuralPrefix(parseMarkdown(shown), full))
                    throw new Error(
                        `partial unit at split ${i}: ${JSON.stringify(shown)}`,
                    )
            }
        },
    )

    it('reads \\r\\n and a lone \\r as line ends', () => {
        const [heading, para] = parseMarkdown('## Title\r\nBody\rmore')
        expect(heading?.type).toBe('heading')
        if (heading?.type !== 'heading') return
        expect(heading.inline).toEqual([
            { type: 'text', text: 'Title', start: 3 },
        ])
        expect(para?.type).toBe('paragraph')
        expect(stableMarkdownPrefix('## Title\r\n')).toBe('## Title\n')
        expect(normalizeNewlines('a\r\nb\rc\n')).toBe('a\nb\nc\n')
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

    it('keeps blank-line-separated items of one kind in one list', () => {
        const blocks = parseMarkdown('1. a\n\n2. b\n\n\n3. c')
        expect(blocks).toHaveLength(1)
        const [list] = blocks
        if (list?.type !== 'list') throw new Error('expected a list')
        expect(list.ordered).toBe(true)
        expect(list.firstNumber).toBe(1)
        expect(list.items.map(item => item.start)).toEqual([0, 6, 13])
    })

    it('starts a new list on a kind change or an intervening paragraph', () => {
        const blocks = parseMarkdown('- a\n\n1. b\n\ntext\n\n7. c\n8. d')
        expect(blocks.map(b => b.type)).toEqual([
            'list',
            'list',
            'paragraph',
            'list',
        ])
        const last = blocks[3]
        if (last?.type !== 'list') throw new Error('expected a list')
        expect(last.firstNumber).toBe(7)
        expect(last.items).toHaveLength(2)
    })

    it('keeps balanced parens in a URL and drops an unbalanced closer', () => {
        const wiki = 'https://en.wikipedia.org/wiki/Foo_(bar)'
        const links = (s: string) => {
            const [p] = parseMarkdown(s)
            if (p?.type !== 'paragraph') throw new Error('expected a paragraph')
            return p.inline.flatMap(t =>
                t.type === 'link' ? [{ label: t.label, href: t.href }] : [],
            )
        }
        expect(links(`See ${wiki} now`)).toEqual([{ label: wiki, href: wiki }])
        expect(links(`See [a](${wiki}) now`)).toEqual([
            { label: 'a', href: wiki },
        ])
        expect(links(`(see ${wiki})`)).toEqual([{ label: wiki, href: wiki }])
        expect(links('(see https://x.dev/a)')).toEqual([
            { label: 'https://x.dev/a', href: 'https://x.dev/a' },
        ])
        for (const punct of ['.', ',', ';', ':', '!', '?', ').', '.)'])
            expect(links(`At https://x.dev/a${punct}`)).toEqual([
                { label: 'https://x.dev/a', href: 'https://x.dev/a' },
            ])
        expect(links(`At ${wiki}.`)).toEqual([{ label: wiki, href: wiki }])
    })

    it('trims trailing sentence punctuation off a bare URL', () => {
        const [p] = parseMarkdown('See https://useupup.com/docs.')
        if (p?.type !== 'paragraph') throw new Error('expected a paragraph')
        expect(p.inline[1]).toEqual({
            type: 'link',
            label: 'https://useupup.com/docs',
            children: [
                { type: 'text', text: 'https://useupup.com/docs', start: 4 },
            ],
            href: 'https://useupup.com/docs',
            start: 4,
        })
    })
})

describe('inline markup in table cells and link labels', () => {
    const table = (s: string) => {
        const block = parseMarkdown(s).find(b => b.type === 'table')
        if (block?.type !== 'table') throw new Error('expected a table')
        return block
    }
    const types = (cell: Inline[] | undefined) => cell?.map(t => t.type)

    it('parses code, bold and links inside a cell like a paragraph', () => {
        const { rows } = table(FIXTURES.tableInline!)
        const [first] = rows
        expect(types(first?.cells[0])).toEqual(['code'])
        const notes = first?.cells[2]
        expect(types(notes)).toEqual(['text', 'link', 'text', 'bold'])
        const link = notes?.[1]
        if (link?.type !== 'link') throw new Error('expected a link')
        expect(link.href).toBe('/docs/limits')
        expect(types(link.children)).toEqual(['code'])
        const bold = notes?.[3]
        if (bold?.type !== 'bold') throw new Error('expected bold')
        expect(types(bold.children)).toEqual(['code'])
    })

    it('keeps an escaped pipe in a cell and drops the backslash', () => {
        const { rows } = table(FIXTURES.tableInline!)
        const row = rows[1]
        expect(row?.cells).toHaveLength(3)
        const code = row?.cells[1]?.[0]
        expect(code).toMatchObject({
            type: 'code',
            text: "'client' | 'server'",
        })
        expect(
            row?.cells[2]?.map(t => (t.type === 'text' ? t.text : '')),
        ).toEqual(['', ' | more'])
    })

    it('renders the exact model-shaped options table as code cells', () => {
        const { header, rows } = table(FIXTURES.tableCode!)
        expect(header).toHaveLength(2)
        expect(rows.map(r => r.cells.map(c => types(c)))).toEqual([
            [['code'], ['text']],
            [['code'], ['text']],
            [['code'], ['text', 'code', 'text']],
            [['code'], ['text']],
        ])
        expect(rows[2]?.cells[0]?.[0]).toMatchObject({ text: 'accept' })
        expect(rows[2]?.cells[1]?.[1]).toMatchObject({ text: ' `tick` ' })
    })

    it('does not split a cell at a pipe inside a code span', () => {
        const { rows } = table(FIXTURES.tableInline!)
        const row = rows[2]
        expect(row?.cells).toHaveLength(3)
        expect(row?.cells[0]).toEqual([
            expect.objectContaining({ type: 'code', text: 'a | b' }),
        ])
    })

    it('treats a lone backtick as text, so the pipes after it still split', () => {
        const { rows } = table('| a | b |\n| - | - |\n| it`s | y |\n')
        expect(rows[0]?.cells).toHaveLength(2)
    })

    it('parses the label of an inline link', () => {
        const [p] = parseMarkdown('See [`maxFileSize` and **more**](/docs/a).')
        if (p?.type !== 'paragraph') throw new Error('expected a paragraph')
        const link = p.inline[1]
        if (link?.type !== 'link') throw new Error('expected a link')
        expect(link.label).toBe('`maxFileSize` and **more**')
        expect(types(link.children)).toEqual(['code', 'text', 'bold'])
    })

    it('never nests a link inside a link label', () => {
        const [p] = parseMarkdown('[see https://x.dev/a now](https://x.dev/b)')
        if (p?.type !== 'paragraph') throw new Error('expected a paragraph')
        const link = p.inline[0]
        if (link?.type !== 'link') throw new Error('expected a link')
        expect(types(link.children)).toEqual(['text'])
    })

    it('shows a table row only once its line is complete, cells and all', () => {
        const full = FIXTURES.tableInline!
        const row =
            '| `maxFileSize` | number | See [`limits`](/docs/limits) and **`accept`** |\n'
        const at = full.indexOf(row)
        for (let i = 1; i < row.length; i++) {
            const shown = stableMarkdownPrefix(full.slice(0, at + i))
            expect(shown).toBe(full.slice(0, at))
        }
        expect(stableMarkdownPrefix(full.slice(0, at + row.length))).toBe(
            full.slice(0, at + row.length),
        )
    })
})

const kinds = (s: string) => parseMarkdown(s).map(b => b.type)

describe('thematic breaks', () => {
    it.each([
        '---',
        '***',
        '___',
        '-----',
        '- - -',
        '* * *',
        '_ __ _',
        '   ---',
        '---  ',
    ])('reads %j on its own line as a rule', line => {
        expect(parseMarkdown(`before\n\n${line}\n\nafter`)).toEqual([
            expect.objectContaining({ type: 'paragraph' }),
            { type: 'hr', start: 8 },
            expect.objectContaining({ type: 'paragraph' }),
        ])
    })

    it.each([
        '-',
        '--',
        '- -',
        '---x',
        '--- a',
        '-*-',
        '    ---',
        '- - a',
        '**',
        '__',
    ])('does not read %j as a rule', line => {
        expect(kinds(`before\n\n${line}\n\nafter`)).not.toContain('hr')
    })

    it('keeps a table delimiter row a delimiter row', () => {
        for (const table of [
            '| a | b |\n| --- | --- |\n| 1 | 2 |',
            '| a |\n|---|\n| 1 |',
            '| a |\n| :-: |',
        ])
            expect(kinds(table)).toEqual(['table'])
    })

    it('ends a table with a rule that follows its last row', () => {
        expect(kinds('| a |\n| --- |\n| 1 |\n---\nend')).toEqual([
            'table',
            'hr',
            'paragraph',
        ])
    })

    it('is a rule, not a setext heading, under a line of text', () => {
        const blocks = parseMarkdown('Title\n---\nBody')
        expect(blocks.map(b => b.type)).toEqual([
            'paragraph',
            'hr',
            'paragraph',
        ])
        expect(kinds('Title\n===')).toEqual(['paragraph'])
    })

    it('interrupts a paragraph and a list, and starts a new list after', () => {
        expect(kinds('text\n***\nmore')).toEqual([
            'paragraph',
            'hr',
            'paragraph',
        ])
        expect(kinds('- a\n- b\n---\n- c')).toEqual(['list', 'hr', 'list'])
        expect(kinds('1. a\n* * *\n2. b')).toEqual(['list', 'hr', 'list'])
    })

    it('reads a bare ** or __ as literal text', () => {
        const [p] = parseMarkdown('**')
        if (p?.type !== 'paragraph') throw new Error('expected a paragraph')
        expect(p.inline).toEqual([{ type: 'text', text: '**', start: 0 }])
    })

    it('holds a bare - or -- (a list item or a rule) at the end of the buffer', () => {
        expect(stableMarkdownPrefix('-')).toBe('')
        expect(stableMarkdownPrefix('--')).toBe('')
        expect(stableMarkdownPrefix('a\n-')).toBe('a\n')
        expect(stableMarkdownPrefix('a\n--')).toBe('a\n')
        expect(stableMarkdownPrefix('a\n- ')).toBe('a\n')
        expect(stableMarkdownPrefix('a\n--- ')).toBe('a\n')
        expect(stableMarkdownPrefix('a\n- -')).toBe('a\n')
    })

    it('holds a possible * or _ rule, then releases the text if it is not one', () => {
        for (const mark of ['*', '**', '***', '_', '__', '___']) {
            expect(stableMarkdownPrefix(`a\n${mark}`)).toBe('a\n')
            // Once the line has ended it is a rule (3+) or plain text; only
            // a lone ** is an unclosed bold opener and stays held.
            expect(stableMarkdownPrefix(`a\n${mark}\n`)).toBe(
                mark === '**' ? 'a\n' : `a\n${mark}\n`,
            )
        }
        expect(stableMarkdownPrefix('a\n__init__ ')).toBe('a\n__init__ ')
        expect(stableMarkdownPrefix('a\n-- b ')).toBe('a\n-- b ')
    })

    it('never shows the start of a text line as a rule', () => {
        // Cut after its space, `___ x` would be `___ `: a rule on its own.
        for (const line of ['___ x', '--- a', '* * * b', '- - - c']) {
            expect(stableMarkdownPrefix(line)).toBe('')
            expect(stableMarkdownPrefix(`a\n\n${line}`)).toBe('a\n\n')
            for (let i = 0; i <= line.length; i++) {
                const shown = stableMarkdownPrefix(`a\n${line.slice(0, i)}`)
                expect(parseMarkdown(shown).some(b => b.type === 'hr')).toBe(
                    false,
                )
            }
            expect(stableMarkdownPrefix(`${line}\n`)).toBe(`${line}\n`)
        }
    })

    it('never shows a rule-like line start held by an open inline unit', () => {
        // The line has ended, but its opener keeps the paragraph open.
        for (const [text, shown] of [
            ['___ **bold\n', ''],
            ['--- `code\n', ''],
            ['text\n--- **b\n', 'text\n'],
        ] as const) {
            expect(stableMarkdownPrefix(text)).toBe(shown)
            expect(
                parseMarkdown(stableMarkdownPrefix(text)).some(
                    b => b.type === 'hr',
                ),
            ).toBe(false)
        }
    })

    it('shows a rule only once its line has ended', () => {
        expect(stableMarkdownPrefix('before\n\n---')).toBe('before\n\n')
        expect(stableMarkdownPrefix('before\n\n---\n')).toBe('before\n\n---\n')
        expect(stableMarkdownPrefix('before\n\n----')).toBe('before\n\n')
        expect(stableMarkdownPrefix('before\n\n---\nafter ')).toBe(
            'before\n\n---\nafter ',
        )
    })

    it('shows the paragraph above a rule whole, even with an opener left open', () => {
        expect(stableMarkdownPrefix('a **b\n---\n')).toBe('a **b\n---\n')
        // The rule is not settled until its line ends, so the opener holds.
        expect(stableMarkdownPrefix('a **b\n---')).toBe('a ')
    })

    it('never takes back a rule while its line is typed out', () => {
        const text = 'Intro.\n\n- - -\n\nOutro.\n'
        let previous = ''
        for (let i = 0; i <= text.length; i++) {
            const shown = stableMarkdownPrefix(text.slice(0, i))
            expect(shown.startsWith(previous)).toBe(true)
            const rules = parseMarkdown(shown).filter(b => b.type === 'hr')
            expect(rules.length).toBeLessThanOrEqual(1)
            // A rule only appears with its whole line, newline included.
            if (rules.length) expect(shown).toContain('- - -\n')
            previous = shown
        }
    })
})
