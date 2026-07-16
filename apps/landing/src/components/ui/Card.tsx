import type { ReactNode } from 'react'

interface CardProps {
    /** Styles the surface (padding, content layout, sizing, grid span). */
    className?: string
    children: ReactNode
}

/* Flat surface primitive: one hairline border recipe, flat page-base fill, no
   gradient wrapper, no shadow, no hover glow. Use ONLY where grouping is
   structural (FAQ accordion items, form surfaces, scene frames); feature rows,
   stats, and copy sit directly on the page background. */
export default function Card({ className = '', children }: CardProps) {
    return (
        <div
            className={`h-full overflow-hidden rounded-xl border border-black/5 bg-[var(--bg-base)] dark:border-white/10 ${className}`}
        >
            {children}
        </div>
    )
}
