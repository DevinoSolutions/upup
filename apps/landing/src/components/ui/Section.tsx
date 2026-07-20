import type { ReactNode } from 'react'

interface SectionProps {
    id?: string
    /** Adds a hairline top border when visual separation is wanted. */
    bordered?: boolean
    className?: string
    children: ReactNode
}

/* The single layout gate. Every top-level section renders through it: full-bleed
   flat background, `px-6` gutter, `mx-auto max-w-6xl` inner column, one vertical
   rhythm. `bordered` adds the one hairline border recipe as a top divider. */
export default function Section({
    id,
    bordered = false,
    className = '',
    children,
}: SectionProps) {
    const border = bordered
        ? 'border-t border-black/5 dark:border-white/10'
        : ''
    return (
        <section
            id={id}
            className={`relative px-6 py-20 scroll-mt-24 bg-[var(--bg-base)] sm:py-24 ${border} ${className}`}
        >
            <div className="relative mx-auto w-full max-w-6xl">{children}</div>
        </section>
    )
}
