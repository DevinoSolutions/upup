import type { ReactNode } from 'react'

/* Mid-tier h3 convention (the missing scale step the audit flagged): 28–32px.
   Apply to feature-row / sub-section titles. */
export const H3_HEADING =
    'text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white'

/* Electric blue→teal gradient for headline spans and CTAs. Wrap the accented
   words of `title` in a <span className={GRADIENT_TEXT}>. */
export const GRADIENT_TEXT =
    'bg-gradient-to-r from-blue-600 to-teal-600 dark:from-blue-500 dark:to-teal-400 bg-clip-text text-transparent'

interface SectionHeadingProps {
    badge?: ReactNode
    title: ReactNode
    subtitle?: ReactNode
    align?: 'center' | 'left'
    /** Extra classes for the heading block. Do NOT pass a bottom margin here —
     *  the baked `mb-12 sm:mb-16` owns the heading→content gap and a className
     *  `mb-*` collides with it (stylesheet-order-indeterminate). */
    className?: string
}

export default function SectionHeading({
    badge,
    title,
    subtitle,
    align = 'center',
    className = '',
}: SectionHeadingProps) {
    const alignment =
        align === 'center'
            ? 'items-center text-center mx-auto max-w-3xl'
            : 'items-start text-left'
    // The heading owns the heading→content gap so consumers don't each set it.
    return (
        <div
            className={`flex flex-col mb-12 sm:mb-16 ${alignment} ${className}`}
        >
            {badge && (
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/5 px-3 py-1 text-xs font-medium text-gray-600 dark:border-white/10 dark:text-gray-300">
                    {badge}
                </span>
            )}
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-[2.75rem] dark:text-white">
                {title}
            </h2>
            {subtitle && (
                <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg dark:text-gray-300">
                    {subtitle}
                </p>
            )}
        </div>
    )
}
