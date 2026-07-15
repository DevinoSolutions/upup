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
    return (
        <div className={`flex flex-col ${alignment} ${className}`}>
            {badge && (
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-medium text-gray-600 backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.06] dark:text-gray-300">
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
