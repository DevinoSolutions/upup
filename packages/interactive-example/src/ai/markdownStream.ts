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
 *           blank lines between items keeping one list, # headings,
 *           thematic breaks (--- *** ___), paragraphs
 *   inline: `code`, **bold**, [label](url) (the label takes the same inline
 *           markup, so [`maxFileSize`](/docs/a) is a code span in a link), bare
 *           http(s) URLs
 * Everything else is plain text. Both functions share one inline scanner, so
 * the buffer can never disagree with the renderer about where a unit ends.
 */

export type Inline =
    | { type: 'text'; text: string; start: number }
    | { type: 'code'; text: string; start: number }
    | { type: 'bold'; children: Inline[]; start: number }
    | {
          type: 'link'
          /** The label as written; `children` is the same label parsed. */
          label: string
          children: Inline[]
          href: string
          start: number
      }

export type ListItem = { inline: Inline[]; children: Block[]; start: number }

export type TableRow = { cells: Inline[][]; start: number }

export type Block =
    | { type: 'paragraph'; inline: Inline[]; start: number }
    | { type: 'heading'; level: number; inline: Inline[]; start: number }
    | { type: 'code'; lang: string; code: string; start: number }
    | {
          type: 'list'
          ordered: boolean
          /** The first item's source number (ordered lists; 1 otherwise). */
          firstNumber: number
          items: ListItem[]
          start: number
      }
    | { type: 'table'; header: Inline[][]; rows: TableRow[]; start: number }
    | { type: 'hr'; start: number }

type Line = { text: string; start: number; complete: boolean }

const FENCE = /^\s*(`{3,}|~{3,})(.*)$/
const HEADING = /^(#{1,6})\s+(.*)$/
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
// A thematic break: three or more of one of - * _ on a line of their own
// (spaces between them allowed, indent under four). It is checked before the
// list rule, so `- - -` and `* * *` are rules, not nested items. A table
// delimiter row always starts with `|`, so the two never overlap.
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
// A partial line that more of the same characters could still turn into one.
const THEMATIC_PENDING = /^ {0,3}([-*_])(?:[ \t]*\1)*[ \t]*$/
// URLs may hold one level of balanced parens (Foo_(bar)); an unbalanced `)`
// ends them.
const LINK = /^\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/
// A link that could still complete: label in progress, `]` waiting for `(`,
// or URL in progress (possibly inside an open paren group).
const LINK_PENDING =
    /^\[(?:[^\]\n]*|[^\]\n]+\]|[^\]\n]+\]\((?:[^()\s]|\([^()\s]*\))*(?:\([^()\s]*)?)$/
const URL_CHAR = '[^\\s<>()[\\]`*]'
const URL = new RegExp(`^https?:\\/\\/(?:${URL_CHAR}|\\(${URL_CHAR}*\\))+`)
// A paren group that more text could still close onto the URL before it.
const URL_GROUP_PENDING = new RegExp(`^\\(${URL_CHAR}*$`)
const URL_TRAILING_PUNCT = /[.,;:!?'"]+$/

/**
 * CRLF and lone CR become LF. Both entry points apply it, so the buffer and
 * the parser always see the same text (and the same offsets). It is
 * prefix-stable: a trailing `\r` maps to the `\n` its `\r\n` would.
 */
export const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, '\n')

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

const backtickRun = (s: string, i: number) => {
    let n = 0
    while (s[i + n] === '`') n++
    return n
}

/**
 * The code span opening at `s[i]`: a run of N backticks closed by the next run
 * of exactly N (CommonMark), so ``a `b` c`` holds a backtick. The content must
 * be non-empty. `open`/`close` bound the content; `end` is just past the closer.
 */
function codeSpan(
    s: string,
    i: number,
): { open: number; close: number; end: number } | null {
    const n = backtickRun(s, i)
    let j = i + n
    while (j < s.length) {
        const k = s.indexOf('`', j)
        if (k === -1) return null
        const m = backtickRun(s, k)
        if (m === n)
            return k > i + n ? { open: i + n, close: k, end: k + n } : null
        j = k + m
    }
    return null
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
            const span = codeSpan(s, i)
            // A closer touching the end of the text may still be the start
            // of a longer run, so the span is not settled yet.
            if (stream && (!span || span.end === s.length)) return safe
            if (span) {
                flush(i)
                tokens.push({
                    type: 'code',
                    text: s.slice(span.open, span.close),
                    start: base + i,
                })
                i = safe = textStart = span.end
                continue
            }
            // No closer of the same length: the whole run is literal.
            const run = backtickRun(s, i)
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
                    children: withoutLinks(
                        scanInline(m[1]!, base + i + 1, false),
                    ),
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
                const end = i + m[0].length
                if (
                    stream &&
                    (end === s.length || URL_GROUP_PENDING.test(s.slice(end)))
                )
                    return safe
                const url = m[0].replace(URL_TRAILING_PUNCT, '')
                flush(i)
                tokens.push({
                    type: 'link',
                    label: url,
                    children: [{ type: 'text', text: url, start: base + i }],
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

/**
 * A link label is plain inline markup; a link cannot nest inside a link. A
 * bare URL in the label stays as its own text, merged into the text around it.
 */
function withoutLinks(tokens: Inline[]): Inline[] {
    const out: Inline[] = []
    for (const tok of tokens) {
        const prev = out[out.length - 1]
        if (tok.type === 'link' || tok.type === 'text') {
            const text = tok.type === 'link' ? tok.label : tok.text
            if (prev?.type === 'text') prev.text += text
            else out.push({ type: 'text', text, start: tok.start })
        } else if (tok.type === 'bold') {
            out.push({ ...tok, children: withoutLinks(tok.children) })
        } else {
            out.push(tok)
        }
    }
    return out
}

/**
 * Positions of the `|` that separate table cells: not escaped as `\|`, and not
 * inside a code span (the same `...` pairing the inline scanner uses, so a
 * cell never splits through a span it would render as code).
 */
function cellPipes(s: string): number[] {
    const pipes: number[] = []
    let i = 0
    while (i < s.length) {
        const c = s[i]
        if (c === '\\' && s[i + 1] === '|') {
            i += 2
        } else if (c === '`') {
            i = codeSpan(s, i)?.end ?? i + backtickRun(s, i)
        } else {
            if (c === '|') pipes.push(i)
            i++
        }
    }
    return pipes
}

/** `\|` is how a cell writes a literal pipe, in text and in code alike. */
function unescapePipes(tokens: Inline[]): Inline[] {
    return tokens.map((tok): Inline => {
        if (tok.type === 'text' || tok.type === 'code')
            return { ...tok, text: tok.text.replace(/\\\|/g, '|') }
        return { ...tok, children: unescapePipes(tok.children) }
    })
}

function tableCells(line: Line): Inline[][] {
    const cells: Inline[][] = []
    const s = line.text
    const pipes = cellPipes(s)
    let i = (pipes[0] ?? -1) + 1
    for (let p = 1; i < s.length; p++) {
        const j = pipes[p] ?? s.length
        const raw = s.slice(i, j)
        const lead = raw.length - raw.trimStart().length
        if (j < s.length || raw.trim())
            cells.push(
                unescapePipes(parseInline(raw.trim(), line.start + i + lead)),
            )
        i = j + 1
    }
    return cells
}

type ListEntry = {
    indent: number
    ordered: boolean
    number: number
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
            firstNumber: first.ordered ? first.number : 1,
            items,
            start: first.start,
        },
        next: i,
    }
}

function listEntry(line: Line): ListEntry | null {
    if (THEMATIC_BREAK.test(line.text)) return null
    const m = LIST_ITEM.exec(line.text)
    if (!m) return null
    const content = m[3]!
    const ordered = /\d/.test(m[2]!)
    return {
        indent: m[1]!.length,
        ordered,
        number: ordered ? parseInt(m[2]!, 10) : 1,
        content,
        contentStart: line.start + line.text.length - content.length,
        start: line.start,
    }
}

/** Parse a finished (or already-stable) markdown string into blocks. */
export function parseMarkdown(source: string): Block[] {
    const text = normalizeNewlines(source)
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
        // Setext headings are not in the grammar, so `---` under a text line
        // is a rule between two paragraphs, never a heading.
        if (THEMATIC_BREAK.test(line.text)) {
            flushPara()
            blocks.push({ type: 'hr', start: line.start })
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
            // Blank lines between items keep the list going (a loose list),
            // so `1. a\n\n2. b` is one list, not two that both start at 1.
            // Only the lines between two items decide that, so text that
            // arrives later can never split or re-key a list already shown.
            const entries: ListEntry[] = []
            while (i < lines.length) {
                let j = i
                while (j < lines.length && isBlank(lines[j]!.text)) j++
                const e = j < lines.length ? listEntry(lines[j]!) : null
                if (!e) break
                entries.push(e)
                i = j + 1
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
// fence, a heading, a list item, a thematic break or a table row. Releasing
// it as paragraph text could be taken back, so it is held (`-` and `--` could
// each become a list item or a rule; `_` and `__` a rule).
const BLOCK_PENDING = /^\s*(?:`{1,2}|~{1,2}|[-*+]|\d+[.)]?)$|^#{1,6}$/
// A partial line that could still complete as a table delimiter row.
const DELIMITER_PENDING = /^\s*(?:\|[\s:|-]*)?$/

const opensBlock = (s: string) =>
    FENCE.test(s) || HEADING.test(s) || LIST_ITEM.test(s)
const couldOpenBlock = (s: string) =>
    isBlank(s) ||
    isTableRow(s) ||
    BLOCK_PENDING.test(s) ||
    THEMATIC_PENDING.test(s)
/** Offset just past a complete line's newline. */
const endOf = (l: Line) => l.start + l.text.length + 1

/**
 * The longest prefix of a still-streaming answer that renders as whole units
 * only. Feed it everything received so far; once the stream has finished,
 * render the full text instead (unclosed openers then become literal text).
 * The result is a prefix of the newline-normalized text.
 *
 * It walks the same line grammar as `parseMarkdown`. Everything before `cut`
 * is whole blocks. Lines from `cut` on, while `inPara`, are a paragraph whose
 * end is not known yet; that is released through the streaming inline scan.
 */
export function stableMarkdownPrefix(source: string): string {
    const text = normalizeNewlines(source)
    const lines = splitLines(text)
    let cut = 0
    let inPara = false
    // Show whole blocks, plus the whole-unit part of the open paragraph up
    // to `end`.
    const hold = (end: number) => {
        let shown = inPara
            ? cut + scanInline(text.slice(cut, end), cut, true)
            : cut
        // The released text must not end in a line that reads as a rule on
        // its own: `___ x` or `___ **b` cut after the space is `___ `, which
        // would flash an <hr> that the finished line takes back as text.
        const lineStart = Math.max(cut, text.lastIndexOf('\n', shown - 1) + 1)
        if (THEMATIC_BREAK.test(text.slice(lineStart, shown))) shown = lineStart
        return text.slice(0, shown)
    }
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
        if (
            HEADING.test(line.text) ||
            THEMATIC_BREAK.test(line.text) ||
            listEntry(line)
        ) {
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
