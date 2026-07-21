'use client'

import { useEffect, useState } from 'react'

export interface TocItem {
    title: string
    url: string
    depth: number
}

export function DocsToc({ items }: { items: TocItem[] }) {
    const [activeId, setActiveId] = useState('')
    // Only depth ≤3 headings are rendered — observe exactly those so a deeper
    // heading can never become the active id with no row to show it.
    const visible = items.filter(item => item.depth <= 3)

    useEffect(() => {
        if (visible.length < 2) return

        const headings = visible
            .map(item => document.getElementById(item.url.replace(/^#/, '')))
            .filter((el): el is HTMLElement => el !== null)
        if (headings.length === 0) return

        const observer = new IntersectionObserver(
            entries => {
                // Pick the topmost intersecting heading (smallest top) so the
                // marker doesn't flick to a lower one during fast scroll.
                const topmost = entries
                    .filter(entry => entry.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    )[0]
                if (topmost) setActiveId(topmost.target.id)
            },
            // Activate a heading once it clears the fixed header and sits in the
            // upper third of the viewport.
            { rootMargin: '-96px 0px -66% 0px', threshold: 0 },
        )
        headings.forEach(h => observer.observe(h))
        return () => observer.disconnect()
    }, [items])

    if (visible.length < 2) return null

    return (
        <nav aria-label="On this page" className="text-sm">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                On this page
            </p>
            <ul className="space-y-1">
                {visible.map(item => {
                    const active = item.url.replace(/^#/, '') === activeId
                    return (
                        <li
                            key={item.url}
                            style={{
                                paddingLeft: `${Math.max(item.depth - 2, 0) * 12}px`,
                            }}
                        >
                            <a
                                href={item.url}
                                aria-current={active ? 'location' : undefined}
                                className={`block border-l py-0.5 pl-3 transition-colors ${
                                    active
                                        ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                }`}
                            >
                                {item.title}
                            </a>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
