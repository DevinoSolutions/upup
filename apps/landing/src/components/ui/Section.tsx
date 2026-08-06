import type { ReactNode } from 'react'

interface SectionProps {
    id?: string
    /** Adds a hairline top border when visual separation is wanted. */
    bordered?: boolean
    /**
     * First section under the fixed 97px nav: below `sm` the default pt-20
     * (80px) leaves the opening row occluded — this lifts only the top padding
     * below sm; desktop rhythm unchanged.
     */
    clearNav?: boolean
    className?: string
    children: ReactNode
}

/* The single layout gate. Every top-level section renders through it: full-bleed
   flat background, `px-6` gutter, `mx-auto max-w-6xl` inner column, one vertical
   rhythm. `bordered` adds the one hairline border recipe as a top divider. */
export default function Section({
    id,
    bordered = false,
    clearNav = false,
    className = '',
    children,
}: SectionProps) {
    const border = bordered
        ? 'border-t border-black/5 dark:border-white/10'
        : ''
    const padding = clearNav ? 'pb-20 pt-28 sm:py-24' : 'py-20 sm:py-24'
    return (
        <section
            id={id}
            className={`relative px-6 ${padding} scroll-mt-24 bg-[var(--bg-base)] ${border} ${className}`}
        >
            <div className="relative mx-auto w-full max-w-6xl">{children}</div>
        </section>
    )
}
