/**
 * Streaming-safe markdown for the assistant transcript.
 *
 * The answer arrives a few characters at a time. Rendering every intermediate
 * string would show half-built units: "[link te", a fence whose closing ```
 * has not arrived yet rendering as raw text, a table header with no delimiter
 * row. `stableMarkdownPrefix` returns the longest prefix of the text so far
 * that holds only whole units under `parseMarkdown`'s grammar; the panel
 * renders that and holds the rest back until it completes.
 *
 * The grammar is deliberately small, covering what the agents emit:
 *   blocks: fenced code (``` or ~~~), tables (a `|` header row plus a
 *           delimiter row), list items (- * + 1. 1)) nested by indent,
 *           # headings, paragraphs
 *   inline: `code`, **bold**, [label](url), bare http(s) URLs
 * Everything else is plain text. Both functions share one inline scanner, so
 * the buffer can never disagree with the renderer about where a unit ends.
 */

export type Inline =
    | { type: 'text'; text: string; start: number }
    | { type: 'code'; text: string; start: number }
    | { type: 'bold'; children: Inline[]; start: number }
    | { type: 'link'; label: string; href: string; start: number }

export type ListItem = { inline: Inline[]; children: Block[]; start: number }

export type TableRow = { cells: Inline[][]; start: number }

export type Block =
    | { type: 'paragraph'; inline: Inline[]; start: number }
    | { type: 'heading'; level: number; inline: Inline[]; start: number }
    | { type: 'code'; lang: string; code: string; start: number }
    | { type: 'list'; ordered: boolean; items: ListItem[]; start: number }
    | { type: 'table'; header: Inline[][]; rows: TableRow[]; start: number }

type Line = { text: string; start: number; complete: boolean }

const FENCE = /^\s*(`{3,}|~{3,})(.*)$/
const HEADING = /^(#{1,6})\s+(.*)$/
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const LINK = /^\[([^\]\n]+)\]\(([^)\s]+)\)/
// A link that could still complete: label in progress, `]` waiting for `(`,
// or URL in progress.
const LINK_PENDING = /^\[(?:[^\]\n]*|[^\]\n]+\]|[^\]\n]+\]\([^)\s]*)$/
const URL = /^https?:\/\/[^\s<>()[\]`*]+/
const URL_TRAILING_PUNCT = /[.,;:!?'"]+$/

function splitLines(text: string): Line[] {
    const lines: Line[] = []
    let start = 0
    while (start < text.length) {
        const nl = text.indexOf('\n', start)
        if (nl === -1) {
            lines.push({ text: text.slice(start), start, complete: false })
            break
        }
        lines.push({ text: text.slice(start, nl), start, complete: true })
        start = nl + 1
    }
    return lines
}

const isBlank = (s: string) => s.trim() === ''
const isTableRow = (s: string) => s.trimStart().startsWith('|')

function isDelimiterRow(s: string): boolean {
    if (!isTableRow(s)) return false
    const cells = s.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
    return cells.every(c => /^\s*:?-+:?\s*$/.test(c))
}

function closesFence(line: string, marker: string): boolean {
    const m = /^\s*(`{3,}|~{3,})\s*$/.exec(line)
    return !!m && m[1]![0] === marker[0] && m[1]!.length >= marker.length
}

/**
 * Scan `s` left to right. With `stream` false every opener without a closer
 * is literal text and the result is the token list. With `stream` true the
 * result is how much of `s` is safe to show: the scan stops at the first
 * opener whose closer has not arrived yet, and the cut only ever lands right
 * after whitespace in plain text or right after a closed token, so neither a
 * half word nor half a unit is released.
 */
function scanInline(s: string, base: number, stream: true): number
function scanInline(s: string, base: number, stream: false): Inline[]
function scanInline(
    s: string,
    base: number,
    stream: boolean,
): Inline[] | number {
    const tokens: Inline[] = []
    let text = ''
    let textStart = 0
    const flush = (at: number) => {
        if (text) tokens.push({ type: 'text', text, start: base + textStart })
        text = ''
        textStart = at
    }
    let safe = 0
    let i = 0
    while (i < s.length) {
        const c = s[i]
        if (c === '`') {
            const j = s.indexOf('`', i + 1)
            if (j === -1 && stream) return safe
            if (j > i + 1) {
                flush(i)
                tokens.push({
                    type: 'code',
                    text: s.slice(i + 1, j),
                    start: base + i,
                })
                i = safe = textStart = j + 1
                continue
            }
            // `` with nothing between, or no closer at all: literal.
            const run = j === i + 1 ? 2 : 1
            text += s.slice(i, i + run)
            i += run
            continue
        }
        if (c === '*' && (s[i + 1] === '*' || (stream && i + 1 === s.length))) {
            const j = s.indexOf('**', i + 2)
            if (j === -1 && stream) return safe
            if (j > i + 2) {
                flush(i)
                tokens.push({
                    type: 'bold',
                    children: scanInline(
                        s.slice(i + 2, j),
                        base + i + 2,
                        false,
                    ),
                    start: base + i,
                })
                i = safe = textStart = j + 2
                continue
            }
            text += s.slice(i, i + 2)
            i += 2
            continue
        }
        if (c === '[') {
            const m = LINK.exec(s.slice(i))
            if (m) {
                flush(i)
                tokens.push({
                    type: 'link',
                    label: m[1]!,
                    href: m[2]!,
                    start: base + i,
                })
                i = safe = textStart = i + m[0].length
                continue
            }
            if (stream && LINK_PENDING.test(s.slice(i))) return safe
        }
        if (c === 'h' && (i === 0 || /[\s(]/.test(s[i - 1]!))) {
            const m = URL.exec(s.slice(i))
            if (m) {
                if (stream && i + m[0].length === s.length) return safe
                const url = m[0].replace(URL_TRAILING_PUNCT, '')
                flush(i)
                tokens.push({
                    type: 'link',
                    label: url,
                    href: url,
                    start: base + i,
                })
                i = safe = textStart = i + url.length
                continue
            }
        }
        text += c
        i++
        if (/\s/.test(c!)) safe = i
    }
    if (stream) return safe
    flush(i)
    return tokens
}

const parseInline = (s: string, base: number) => scanInline(s, base, false)

function tableCells(line: Line): Inline[][] {
    const cells: Inline[][] = []
    const s = line.text
    let i = s.indexOf('|') + 1
    while (i < s.length) {
        let j = s.indexOf('|', i)
        if (j === -1) j = s.length
        const raw = s.slice(i, j)
        const lead = raw.length - raw.trimStart().length
        if (j < s.length || raw.trim())
            cells.push(parseInline(raw.trim(), line.start + i + lead))
        i = j + 1
    }
    return cells
}

type ListEntry = {
    indent: number
    ordered: boolean
    content: string
    contentStart: number
    start: number
}

function buildList(
    entries: ListEntry[],
    from: number,
): { list: Block; next: number } {
    const first = entries[from]!
    const items: ListItem[] = []
    let i = from
    while (i < entries.length) {
        const e = entries[i]!
        if (e.indent < first.indent) break
        const last = items[items.length - 1]
        if (e.indent > first.indent && last) {
            const nested = buildList(entries, i)
            last.children.push(nested.list)
            i = nested.next
            continue
        }
        if (e.ordered !== first.ordered) break
        items.push({
            inline: parseInline(e.content, e.contentStart),
            children: [],
            start: e.start,
        })
        i++
    }
    return {
        list: {
            type: 'list',
            ordered: first.ordered,
            items,
            start: first.start,
        },
        next: i,
    }
}

function listEntry(line: Line): ListEntry | null {
    const m = LIST_ITEM.exec(line.text)
    if (!m) return null
    const content = m[3]!
    return {
        indent: m[1]!.length,
        ordered: /\d/.test(m[2]!),
        content,
        contentStart: line.start + line.text.length - content.length,
        start: line.start,
    }
}

/** Parse a finished (or already-stable) markdown string into blocks. */
export function parseMarkdown(text: string): Block[] {
    const lines = splitLines(text)
    const blocks: Block[] = []
    let para: Line[] = []
    const flushPara = () => {
        const first = para[0]
        const last = para[para.length - 1]
        if (first && last) {
            const raw = text.slice(first.start, last.start + last.text.length)
            blocks.push({
                type: 'paragraph',
                inline: parseInline(raw, first.start),
                start: first.start,
            })
        }
        para = []
    }
    let i = 0
    while (i < lines.length) {
        const line = lines[i]!
        if (isBlank(line.text)) {
            flushPara()
            i++
            continue
        }
        const fence = FENCE.exec(line.text)
        if (fence) {
            flushPara()
            const marker = fence[1]!
            let j = i + 1
            while (j < lines.length && !closesFence(lines[j]!.text, marker)) j++
            blocks.push({
                type: 'code',
                lang: fence[2]!.trim(),
                code: lines
                    .slice(i + 1, j)
                    .map(l => l.text)
                    .join('\n'),
                start: line.start,
            })
            i = j + 1
            continue
        }
        const heading = HEADING.exec(line.text)
        if (heading) {
            flushPara()
            const body = heading[2]!
            blocks.push({
                type: 'heading',
                level: heading[1]!.length,
                inline: parseInline(
                    body,
                    line.start + line.text.length - body.length,
                ),
                start: line.start,
            })
            i++
            continue
        }
        const next = lines[i + 1]
        if (isTableRow(line.text) && next && isDelimiterRow(next.text)) {
            flushPara()
            const rows: TableRow[] = []
            let k = i + 2
            while (k < lines.length && isTableRow(lines[k]!.text)) {
                rows.push({
                    cells: tableCells(lines[k]!),
                    start: lines[k]!.start,
                })
                k++
            }
            blocks.push({
                type: 'table',
                header: tableCells(line),
                rows,
                start: line.start,
            })
            i = k
            continue
        }
        if (listEntry(line)) {
            flushPara()
            const entries: ListEntry[] = []
            while (i < lines.length) {
                const e = listEntry(lines[i]!)
                if (!e) break
                entries.push(e)
                i++
            }
            let k = 0
            while (k < entries.length) {
                const built = buildList(entries, k)
                blocks.push(built.list)
                k = built.next
            }
            continue
        }
        para.push(line)
        i++
    }
    flushPara()
    return blocks
}

// A partial last line that more text could still turn into a blank line, a
// fence, a heading, a list item or a table row. Releasing it as paragraph
// text could be taken back, so it is held.
const BLOCK_PENDING = /^\s*(?:`{1,2}|~{1,2}|[-*+]|\d+[.)]?)$|^#{1,6}$/
// A partial line that could still complete as a table delimiter row.
const DELIMITER_PENDING = /^\s*(?:\|[\s:|-]*)?$/

const opensBlock = (s: string) =>
    FENCE.test(s) || HEADING.test(s) || LIST_ITEM.test(s)
const couldOpenBlock = (s: string) =>
    isBlank(s) || isTableRow(s) || BLOCK_PENDING.test(s)
/** Offset just past a complete line's newline. */
const endOf = (l: Line) => l.start + l.text.length + 1

/**
 * The longest prefix of a still-streaming answer that renders as whole units
 * only. Feed it everything received so far; once the stream has finished,
 * render the full text instead (unclosed openers then become literal text).
 *
 * It walks the same line grammar as `parseMarkdown`. Everything before `cut`
 * is whole blocks. Lines from `cut` on, while `inPara`, are a paragraph whose
 * end is not known yet; that is released through the streaming inline scan.
 */
export function stableMarkdownPrefix(text: string): string {
    const lines = splitLines(text)
    let cut = 0
    let inPara = false
    // Show whole blocks, plus the whole-unit part of the open paragraph up
    // to `end`.
    const hold = (end: number) =>
        text.slice(
            0,
            inPara ? cut + scanInline(text.slice(cut, end), cut, true) : cut,
        )
    let i = 0
    while (i < lines.length) {
        const line = lines[i]!
        if (!line.complete) {
            // Block units are only ever shown once their line has ended.
            if (opensBlock(line.text)) return text.slice(0, line.start)
            if (couldOpenBlock(line.text)) return hold(line.start)
            inPara = true
            return hold(text.length)
        }
        if (isBlank(line.text)) {
            inPara = false
            cut = endOf(line)
            i++
            continue
        }
        const fence = FENCE.exec(line.text)
        if (fence) {
            let j = i + 1
            while (j < lines.length && !closesFence(lines[j]!.text, fence[1]!))
                j++
            if (!lines[j]?.complete) return text.slice(0, line.start)
            inPara = false
            cut = endOf(lines[j]!)
            i = j + 1
            continue
        }
        if (HEADING.test(line.text) || listEntry(line)) {
            inPara = false
            cut = endOf(line)
            i++
            continue
        }
        if (isTableRow(line.text)) {
            // A table header or a paragraph line; the next line decides.
            const next = lines[i + 1]
            if (!next || (!next.complete && DELIMITER_PENDING.test(next.text)))
                return hold(line.start)
            if (next.complete && isDelimiterRow(next.text)) {
                inPara = false
                cut = endOf(next)
                let k = i + 2
                while (k < lines.length && isTableRow(lines[k]!.text)) {
                    if (!lines[k]!.complete) return text.slice(0, cut)
                    cut = endOf(lines[k]!)
                    k++
                }
                i = k
                continue
            }
        }
        inPara = true
        i++
    }
    return hold(text.length)
}
