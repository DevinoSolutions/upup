'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useDocsSearch } from 'fumadocs-core/search/client'

// fumadocs-core's search/server route (src/app/api/docs-search/route.ts)
// returns a flat, page-grouped list: a "page" row followed by its "heading"/
// "text" child rows, in document order — so rendering the array as-is already
// groups results under their owning page.
type ResultType = 'page' | 'heading' | 'text'
interface SearchResult {
    id: string
    type: ResultType
    content: string
    url: string
}

// fumadocs' highlighter performs NO escaping — its own docs say the content
// is "assumed already sanitized", but a real run proves otherwise: raw HTML
// written in docs inline-code (e.g. an <img onerror=...> example) reaches
// this field as a live tag. So `content` must never hit innerHTML. Instead,
// split on fumadocs' own <mark>...</mark> wrapper and render every other
// segment as escaped React text — anything that isn't a `<mark>` match
// becomes inert visible text rather than executable markup.
// highlightMarkdown entity-escapes some tokens (backticks in nested inline
// markdown arrive as &#x60;), which the escaped-text rendering below would
// otherwise show literally. Decoding is safe here BECAUSE the result is only
// ever rendered as React text (never innerHTML) — a decoded `<` stays inert.
// `&amp;` decodes last so double-escaped sequences don't decode twice.
function decodeEntities(text: string): string {
    return text
        .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
            String.fromCodePoint(parseInt(hex, 16)),
        )
        .replace(/&#(\d+);/g, (_, dec: string) =>
            String.fromCodePoint(parseInt(dec, 10)),
        )
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
}

// Excerpts come straight from the MDX source, so their markdown syntax is still
// in the string — a result row rendered raw reads "**Response `200`** — the
// `PresignedUrlResponse` shape". These rows are plain text (never innerHTML, see
// above), so the tokens can't be rendered as formatting; strip them instead.
// Measured against the live index: backticks appear in 160 of 356 sampled rows
// and `**` in 52, so both are the real cases. `__` was in ZERO rows — it is
// handled defensively, and only as a matched pair, so an unpaired identifier
// like `__dirname` survives intact.
function stripMarkdown(text: string): string {
    return text
        .replace(/`+/g, '')
        .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
        .replace(/__([\s\S]+?)__/g, '$1')
}

function plainText(raw: string): string {
    return stripMarkdown(decodeEntities(raw))
}

function HighlightedContent({ content }: { content: string }) {
    const parts = content.split(/(<mark>[\s\S]*?<\/mark>)/g)
    return (
        <>
            {parts.map((part, i) => {
                const match = /^<mark>([\s\S]*?)<\/mark>$/.exec(part)
                return match ? (
                    <mark key={i}>{plainText(match[1])}</mark>
                ) : (
                    <span key={i}>{plainText(part)}</span>
                )
            })}
        </>
    )
}

// The trigger is a plain button so it can be rendered at BOTH breakpoints (the
// mobile disclosure and the desktop sidebar) while the dialog below stays a
// SINGLE instance owned by DocsChrome — the same split DocsChrome already uses
// for AskAiTrigger + DocsAskAi.
//
// This is not cosmetic. When the whole widget was rendered twice, each copy kept
// its own `open` state, its own ⌘K window listener and its own body-scroll lock,
// so one ⌘K opened TWO dialogs: the real one plus an invisible 0x0 copy inside
// the `lg:hidden` disclosure. Choosing a result closed only the copy you clicked;
// the hidden one stayed mounted with `document.body.style.overflow = 'hidden'`
// still applied, leaving the docs permanently unscrollable.
export function DocsSearchTrigger({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            aria-label="Search docs"
            onClick={onClick}
            className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:border-white/10 dark:bg-transparent dark:text-gray-400 dark:hover:border-white/25 dark:hover:text-gray-200"
        >
            <Search className="h-4 w-4" />
            <span>Search…</span>
            <kbd className="ml-auto inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
                ⌘K
            </kbd>
        </button>
    )
}

export function DocsSearchDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const router = useRouter()
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    // ARIA 1.2 combobox wiring: the input owns the listbox by id and points at
    // the active row, so a screen reader announces the highlighted result as
    // ArrowUp/Down move through it (the visual highlight alone is silent).
    const listId = useId()
    const optionId = (index: number) => `${listId}-option-${index}`

    // useDocsSearch debounces `search` internally (100ms default) before
    // querying, so no extra debounce timer is needed here.
    const { search, setSearch, query } = useDocsSearch({
        type: 'fetch',
        api: '/api/docs-search',
    })
    const results: SearchResult[] =
        !query.data || query.data === 'empty' ? [] : query.data

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                onOpenChange(!open)
            } else if (e.key === 'Escape') {
                onOpenChange(false)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [open, onOpenChange])

    // Scroll lock. The teardown clears the property OUTRIGHT rather than
    // restoring a captured previous value: save/restore is what made the old
    // double-mount unrecoverable. Two instances captured each other's state
    // ('' then 'hidden') and tore down in tree order, so the last teardown
    // reinstated 'hidden' and the page could never scroll again. Clearing
    // unconditionally cannot wedge, whatever the mount count. The layout owns
    // body overflow via a class (`overflow-x-hidden`), so there is no inline
    // value this legitimately needs to preserve.
    useEffect(() => {
        if (!open) return undefined
        document.body.style.overflow = 'hidden'
        inputRef.current?.focus()
        return () => {
            document.body.style.removeProperty('overflow')
        }
    }, [open])

    useEffect(() => {
        setActiveIndex(0)
    }, [search])

    useEffect(() => {
        const active = listRef.current?.querySelector<HTMLElement>(
            `[data-index="${activeIndex}"]`,
        )
        active?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    function close() {
        onOpenChange(false)
        setSearch('')
    }

    function navigate(url: string) {
        close()
        router.push(url)
    }

    function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (results.length === 0) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const result = results[activeIndex]
            if (result) navigate(result.url)
        }
    }

    return (
        <>
            {open ? (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh]"
                    onClick={close}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Search documentation"
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg overflow-hidden rounded-lg border border-black/5 bg-white shadow-xl dark:border-white/10 dark:bg-gray-950"
                    >
                        <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
                            <Search className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                                role="combobox"
                                aria-expanded={results.length > 0}
                                aria-controls={listId}
                                aria-autocomplete="list"
                                aria-activedescendant={
                                    results.length > 0
                                        ? optionId(activeIndex)
                                        : undefined
                                }
                                aria-label="Search documentation"
                                placeholder="Search documentation…"
                                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-gray-500"
                            />
                        </div>

                        {/* Result count / empty state as a live region: the
                            visible copy below is inside the listbox, which a
                            screen reader reads only on navigation, so the
                            outcome of a query would otherwise pass silently. */}
                        <div
                            role="status"
                            aria-live="polite"
                            className="sr-only"
                        >
                            {search.length === 0
                                ? ''
                                : results.length === 0
                                  ? `No results for ${search}.`
                                  : `${results.length} ${results.length === 1 ? 'result' : 'results'}.`}
                        </div>

                        {/* Only a listbox once it actually holds options — an
                            empty-state paragraph is not a valid listbox child. */}
                        <div
                            ref={listRef}
                            id={listId}
                            role={results.length > 0 ? 'listbox' : undefined}
                            aria-label={
                                results.length > 0
                                    ? 'Search results'
                                    : undefined
                            }
                            className="max-h-96 overflow-y-auto p-2"
                        >
                            {search.length === 0 ? (
                                <p className="px-2 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                                    Type to search documentation.
                                </p>
                            ) : results.length === 0 ? (
                                <p className="px-2 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                                    No results for “{search}”.
                                </p>
                            ) : (
                                results.map((result, index) => (
                                    <button
                                        key={result.id}
                                        type="button"
                                        role="option"
                                        id={optionId(index)}
                                        aria-selected={index === activeIndex}
                                        data-index={index}
                                        onClick={() => navigate(result.url)}
                                        onMouseEnter={() =>
                                            setActiveIndex(index)
                                        }
                                        className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                                            result.type !== 'page'
                                                ? 'ml-3 border-l border-black/5 pl-3 dark:border-white/10'
                                                : ''
                                        } ${
                                            index === activeIndex
                                                ? 'bg-black/[0.04] dark:bg-white/[0.06]'
                                                : ''
                                        }`}
                                    >
                                        <span
                                            className={
                                                result.type === 'page'
                                                    ? 'font-medium text-gray-900 [&_mark]:bg-amber-200/70 [&_mark]:text-inherit dark:text-white dark:[&_mark]:bg-amber-500/30'
                                                    : 'text-gray-600 [&_mark]:bg-amber-200/70 [&_mark]:text-inherit dark:text-gray-400 dark:[&_mark]:bg-amber-500/30'
                                            }
                                        >
                                            <HighlightedContent
                                                content={result.content}
                                            />
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}
