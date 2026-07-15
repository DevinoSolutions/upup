import type { CSSProperties, ReactNode } from 'react'

export type AccentHue = 'blue' | 'teal' | 'violet' | 'amber' | 'green' | 'pink'

/* Per-feature hue accents — borrowed from the file-type-card DNA the audit
   called premium. `icon` tints an icon chip (both themes), `text` an inline
   accent, `glow` drives Card's hover glow via the --accent-glow property.
   Class strings are static literals so Tailwind's content scan generates them. */
export const ACCENT_HUES: Record<
    AccentHue,
    { icon: string; text: string; glow: string }
> = {
    blue: {
        icon: 'bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20',
        text: 'text-blue-600 dark:text-blue-300',
        glow: 'rgba(59, 130, 246, 0.35)',
    },
    teal: {
        icon: 'bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/20',
        text: 'text-teal-600 dark:text-teal-300',
        glow: 'rgba(45, 212, 191, 0.35)',
    },
    violet: {
        icon: 'bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20',
        text: 'text-violet-600 dark:text-violet-300',
        glow: 'rgba(139, 92, 246, 0.35)',
    },
    amber: {
        icon: 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
        text: 'text-amber-600 dark:text-amber-300',
        glow: 'rgba(245, 158, 11, 0.35)',
    },
    green: {
        icon: 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
        text: 'text-emerald-600 dark:text-emerald-300',
        glow: 'rgba(16, 185, 129, 0.35)',
    },
    pink: {
        icon: 'bg-pink-500/10 text-pink-600 ring-1 ring-pink-500/20 dark:bg-pink-400/10 dark:text-pink-300 dark:ring-pink-400/20',
        text: 'text-pink-600 dark:text-pink-300',
        glow: 'rgba(236, 72, 153, 0.35)',
    },
}

/* Custom properties aren't in CSSProperties; this widens it for --accent-glow. */
type CSSVars = CSSProperties & Record<`--${string}`, string>

interface CardProps {
    /** Enables the lift + accent glow on hover. */
    hover?: boolean
    /** Tints the hover glow with a per-feature hue. */
    accent?: AccentHue
    /** Styles the inner surface (padding, content layout). */
    className?: string
    /** Styles the outer frame (sizing, margins, grid span). */
    wrapperClassName?: string
    children: ReactNode
}

export default function Card({
    hover = false,
    accent,
    className = '',
    wrapperClassName = '',
    children,
}: CardProps) {
    // Padded-gradient wrapper (the ONE border mechanism used everywhere): a
    // gradient can't be a real CSS border-colour cross-browser, so the outer
    // element paints the 1px hairline via `p-px` over the gradient background
    // and the inner element paints the fill, clipped to the inner radius. The
    // top-brighter gradient gives the top-edge highlight for free.
    const style: CSSVars | undefined = accent
        ? { '--accent-glow': ACCENT_HUES[accent].glow }
        : undefined
    return (
        <div
            className={`surface-card-border surface-shadow group/card relative h-full rounded-2xl p-px ${
                hover ? 'surface-glow-hover' : ''
            } ${wrapperClassName}`}
            style={style}
        >
            <div
                className={`surface-card-fill h-full overflow-hidden rounded-[15px] ${className}`}
            >
                {children}
            </div>
        </div>
    )
}
