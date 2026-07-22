'use client'

import { useEffect, useRef, useState } from 'react'
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
function HighlightedContent({ content }: { content: string }) {
    const parts = content.split(/(<mark>[\s\S]*?<\/mark>)/g)
    return (
        <>
            {parts.map((part, i) => {
                const match = /^<mark>([\s\S]*?)<\/mark>$/.exec(part)
                return match ? (
                    <mark key={i}>{match[1]}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            })}
        </>
    )
}

export function DocsSearch() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

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
                setOpen(prev => !prev)
            } else if (e.key === 'Escape') {
                setOpen(false)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    useEffect(() => {
        if (!open) return undefined
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        inputRef.current?.focus()
        return () => {
            document.body.style.overflow = previousOverflow
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
        setOpen(false)
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
            <button
                type="button"
                aria-label="Search docs"
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-2 rounded-md border border-black/5 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-black/10 hover:text-gray-700 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-200"
            >
                <Search className="h-4 w-4" />
                <span>Search…</span>
                <kbd className="ml-auto rounded border border-black/5 px-1.5 py-0.5 font-mono text-[10px] dark:border-white/10">
                    ⌘K
                </kbd>
            </button>

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
                                aria-label="Search documentation"
                                placeholder="Search documentation…"
                                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-gray-500"
                            />
                        </div>

                        <div
                            ref={listRef}
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
