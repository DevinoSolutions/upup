'use client'

import Link from 'next/link'
import { FRAMEWORK_LIST, type FrameworkId } from '@/lib/frameworks'

interface Props {
    /** Highlight (and mark aria-current) the framework whose page we're on. */
    activeId?: FrameworkId
    /** Optional heading rendered above the strip. */
    heading?: string
    className?: string
}

// Official framework icons that link to each per-framework page (/react, /vue,
// …). Driven entirely by FRAMEWORK_LIST so a new framework appears everywhere at
// once. Used in the home hero and, with `activeId`, as the cross-link strip on
// each framework page.
export default function FrameworkStrip({
    activeId,
    heading,
    className,
}: Readonly<Props>) {
    return (
        <div className={className}>
            {heading ? (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 text-center">
                    {heading}
                </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {FRAMEWORK_LIST.map(fw => {
                    const isActive = fw.id === activeId
                    return (
                        <Link
                            key={fw.id}
                            href={`/${fw.id}`}
                            aria-current={isActive ? 'page' : undefined}
                            title={`upup for ${fw.name}`}
                            className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
                                isActive
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300'
                                    : 'border-black/5 bg-[var(--bg-base)] text-gray-700 hover:border-black/10 hover:text-gray-900 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white'
                            }`}
                        >
                            <fw.Icon size={18} aria-hidden />
                            <span>{fw.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
