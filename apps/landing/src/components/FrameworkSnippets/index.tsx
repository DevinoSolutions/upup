'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, Terminal } from 'lucide-react'
import {
    FRAMEWORK_LIST,
    type FrameworkId,
    type FrameworkMeta,
} from '@/lib/frameworks'

// The per-framework list (id/name/pkg/file/code) is the single source of truth
// in src/lib/frameworks — imported here so the home snippets, the framework
// strip, and the /{framework} pages never drift.
const FRAMEWORKS: FrameworkMeta[] = FRAMEWORK_LIST

// Small, dependency-free, deterministic (SSR-safe) tokenizer. It only colors
// what is lexically unambiguous across TS/JSX/Vue/Svelte — strings, line
// comments, a fixed keyword set, and Capitalized identifiers (components/types)
// — so it never mis-highlights. Everything else renders as plain text.
const KEYWORDS = new Set([
    'import',
    'from',
    'export',
    'default',
    'function',
    'const',
    'let',
    'var',
    'return',
    'class',
    'new',
    'extends',
    'implements',
    'async',
    'await',
    'type',
    'interface',
    'public',
    'private',
])

type Token = {
    kind: 'comment' | 'string' | 'keyword' | 'type' | 'text'
    value: string
}

function tokenizeLine(line: string): Token[] {
    const tokens: Token[] = []
    let i = 0
    const n = line.length

    while (i < n) {
        const c = line[i]

        // Line comment
        if (c === '/' && line[i + 1] === '/') {
            tokens.push({ kind: 'comment', value: line.slice(i) })
            break
        }

        // String (single, double, or backtick) — consume to the closing quote
        if (c === '"' || c === "'" || c === '`') {
            let j = i + 1
            while (j < n && line[j] !== c) {
                if (line[j] === '\\') j++
                j++
            }
            tokens.push({
                kind: 'string',
                value: line.slice(i, Math.min(j + 1, n)),
            })
            i = Math.min(j + 1, n)
            continue
        }

        // Identifier / keyword / component
        if (/[A-Za-z_$]/.test(c)) {
            let j = i
            while (j < n && /[A-Za-z0-9_$]/.test(line[j])) j++
            const word = line.slice(i, j)
            if (KEYWORDS.has(word))
                tokens.push({ kind: 'keyword', value: word })
            else if (/^[A-Z]/.test(word))
                tokens.push({ kind: 'type', value: word })
            else tokens.push({ kind: 'text', value: word })
            i = j
            continue
        }

        // Run of other characters (punctuation, whitespace) up to the next
        // token boundary
        let j = i
        while (
            j < n &&
            !/[A-Za-z_$'"`]/.test(line[j]) &&
            !(line[j] === '/' && line[j + 1] === '/')
        )
            j++
        tokens.push({ kind: 'text', value: line.slice(i, j) })
        i = j
    }

    return tokens
}

const TOKEN_CLASS: Record<Token['kind'], string> = {
    comment: 'text-gray-400 dark:text-gray-500 italic',
    string: 'text-emerald-600 dark:text-emerald-400',
    keyword: 'text-purple-600 dark:text-purple-400',
    type: 'text-blue-600 dark:text-sky-400',
    text: 'text-gray-700 dark:text-gray-300',
}

function HighlightedCode({ code }: { code: string }) {
    const lines = code.split('\n')
    return (
        <code className="block font-mono text-[13px] leading-relaxed">
            {lines.map((line, li) => (
                <span key={li} className="block whitespace-pre">
                    {line.length === 0
                        ? ' '
                        : tokenizeLine(line).map((tok, ti) => (
                              <span key={ti} className={TOKEN_CLASS[tok.kind]}>
                                  {tok.value}
                              </span>
                          ))}
                </span>
            ))}
        </code>
    )
}

export default function FrameworkSnippets({
    initialId = 'react',
}: Readonly<{ initialId?: FrameworkId }> = {}) {
    const [activeId, setActiveId] = useState(initialId)
    const [copiedCode, setCopiedCode] = useState(false)
    const [copiedInstall, setCopiedInstall] = useState(false)
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    const active = useMemo(
        () => FRAMEWORKS.find(f => f.id === activeId) ?? FRAMEWORKS[0],
        [activeId],
    )

    const installCommand = `npm i ${active.pkg}`

    const copy = useCallback((text: string, mark: (v: boolean) => void) => {
        if (typeof window !== 'undefined' && navigator.clipboard) {
            navigator.clipboard
                .writeText(text)
                .then(() => {
                    mark(true)
                    setTimeout(() => mark(false), 2000)
                })
                .catch(() => console.warn('Please copy text manually!'))
        }
    }, [])

    return (
        <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.7,
                delay: 1,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
        >
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                One uploader, the same API in every framework
            </p>

            {/* Framework tabs */}
            <div
                role="tablist"
                aria-label="Framework"
                className="flex flex-wrap justify-center gap-1.5 mb-4"
            >
                {FRAMEWORKS.map((fw, i) => {
                    const isActive = fw.id === activeId
                    return (
                        <button
                            key={fw.id}
                            ref={el => {
                                tabRefs.current[fw.id] = el
                            }}
                            role="tab"
                            id={`framework-tab-${fw.id}`}
                            aria-selected={isActive}
                            aria-controls="framework-tabpanel"
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => setActiveId(fw.id)}
                            onKeyDown={e => {
                                if (
                                    e.key !== 'ArrowRight' &&
                                    e.key !== 'ArrowLeft'
                                )
                                    return
                                e.preventDefault()
                                const dir = e.key === 'ArrowRight' ? 1 : -1
                                const next =
                                    FRAMEWORKS[
                                        (i + dir + FRAMEWORKS.length) %
                                            FRAMEWORKS.length
                                    ]
                                setActiveId(next.id)
                                tabRefs.current[next.id]?.focus()
                            }}
                            className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? 'text-primary dark:text-primary-dark'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                            }`}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="framework-tab-active"
                                    className="absolute inset-0 rounded-lg bg-primary/10 dark:bg-primary-dark/10 border border-primary/20 dark:border-primary-dark/20"
                                    transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 30,
                                    }}
                                />
                            )}
                            <span className="relative z-10">{fw.name}</span>
                        </button>
                    )
                })}
            </div>

            {/* Code window */}
            <div
                role="tabpanel"
                id="framework-tabpanel"
                aria-labelledby={`framework-tab-${activeId}`}
                className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden text-left"
            >
                {/* Window bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200/70 dark:border-gray-700/70">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                        </div>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                            {active.file}
                        </span>
                    </div>
                    <button
                        onClick={() => copy(active.code, setCopiedCode)}
                        aria-label="Copy code"
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/70 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0"
                    >
                        <AnimatePresence mode="wait">
                            {copiedCode ? (
                                <motion.span
                                    key="check"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 180 }}
                                    transition={{ duration: 0.3 }}
                                    className="block"
                                >
                                    <Check className="w-4 h-4 text-green-600" />
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="copy"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 180 }}
                                    transition={{ duration: 0.3 }}
                                    className="block"
                                >
                                    <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>

                {/* Code body */}
                <div className="overflow-x-auto p-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <HighlightedCode code={active.code} />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Install line */}
            <div className="mt-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gray-900/90 dark:bg-black/50 border border-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Terminal className="w-4 h-4 text-gray-500 shrink-0" />
                    <code className="text-sm font-mono text-gray-200 truncate select-all">
                        {installCommand}
                    </code>
                </div>
                <button
                    onClick={() => copy(installCommand, setCopiedInstall)}
                    aria-label="Copy install command"
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                >
                    {copiedInstall ? (
                        <Check className="w-4 h-4 text-green-500" />
                    ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                    )}
                </button>
            </div>
        </motion.div>
    )
}
