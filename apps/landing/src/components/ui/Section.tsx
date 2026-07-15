import type { CSSProperties, ReactNode } from 'react'

export type SectionVariant = 'base' | 'raised' | 'glow'

const VARIANT_BG: Record<SectionVariant, string> = {
    base: 'bg-[var(--bg-base)]',
    raised: 'bg-[var(--bg-raised)]',
    glow: 'bg-[var(--bg-base)]',
}

interface SectionProps {
    id?: string
    variant?: SectionVariant
    className?: string
    children: ReactNode
}

/* Decorative aurora layer: radial blue→teal + violet blobs at low alpha,
   blurred and drifting, behind the content. aria-hidden + pointer-events-none.
   Reduced motion freezes the drift (see globals.css). */
function AuroraGlow() {
    const blob = 'absolute rounded-full blur-3xl aurora-drift'
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
            <div
                className={`${blob} -top-1/3 left-1/4 h-[38rem] w-[38rem] -translate-x-1/2`}
                style={
                    {
                        background:
                            'radial-gradient(circle, var(--aurora-blue), transparent 70%)',
                    } as CSSProperties
                }
            />
            <div
                className={`${blob} top-1/4 right-0 h-[32rem] w-[32rem] translate-x-1/3`}
                style={
                    {
                        background:
                            'radial-gradient(circle, var(--aurora-teal), transparent 70%)',
                    } as CSSProperties
                }
            />
            <div
                className={`${blob} -bottom-1/3 left-1/3 h-[28rem] w-[28rem]`}
                style={
                    {
                        background:
                            'radial-gradient(circle, var(--aurora-violet), transparent 70%)',
                    } as CSSProperties
                }
            />
        </div>
    )
}

export default function Section({
    id,
    variant = 'base',
    className = '',
    children,
}: SectionProps) {
    return (
        <section
            id={id}
            className={`relative isolate overflow-hidden px-6 py-16 scroll-mt-24 ${VARIANT_BG[variant]} ${className}`}
        >
            {variant === 'glow' && <AuroraGlow />}
            <div className="relative mx-auto w-full max-w-7xl">{children}</div>
        </section>
    )
}
