import Link from 'next/link'
import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

const CALLOUT_STYLES: Record<string, string> = {
    note: 'border-sky-500/40 bg-sky-500/5',
    tip: 'border-emerald-500/40 bg-emerald-500/5',
    info: 'border-sky-500/40 bg-sky-500/5',
    warning: 'border-amber-500/40 bg-amber-500/5',
    danger: 'border-red-500/40 bg-red-500/5',
}

export function Callout({
    type = 'note',
    title,
    children,
}: {
    type?: keyof typeof CALLOUT_STYLES
    title?: string
    children: ReactNode
}) {
    return (
        <div
            className={`my-4 rounded-md border px-4 py-3 text-sm ${CALLOUT_STYLES[type] ?? CALLOUT_STYLES.note}`}
        >
            {title ? <p className="mb-1 font-semibold">{title}</p> : null}
            {children}
        </div>
    )
}

export function getMDXComponents(): MDXComponents {
    return {
        Callout,
        a: ({ href = '', ...props }) =>
            href.startsWith('/') || href.startsWith('#') ? (
                <Link href={href} {...props} />
            ) : (
                <a href={href} target="_blank" rel="noreferrer" {...props} />
            ),
    }
}
