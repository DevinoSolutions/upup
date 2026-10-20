import { Check, Copy } from 'lucide-react'

// The copy -> check confirmation as a cross-fade instead of a snap: both icons
// sit stacked in one fixed 14 px box (so nothing reflows) and only opacity
// moves. Opacity is already the reduced-motion-safe property, and the global
// reduced-motion net in globals.css collapses the duration to instant.
//
// Decorative: the caller owns the accessible name and the live announcement.
export function CopyIconSwap({
    copied,
    copyClassName = '',
    checkClassName = '',
}: {
    copied: boolean
    copyClassName?: string
    checkClassName?: string
}) {
    const fade = 'transition-opacity duration-fast ease-motion-out'
    return (
        <span
            aria-hidden="true"
            className="relative inline-block h-3.5 w-3.5 shrink-0"
        >
            <Copy
                className={`absolute inset-0 h-3.5 w-3.5 ${fade} ${copyClassName} ${
                    copied ? 'opacity-0' : 'opacity-100'
                }`}
            />
            <Check
                className={`absolute inset-0 h-3.5 w-3.5 ${fade} ${checkClassName} ${
                    copied ? 'opacity-100' : 'opacity-0'
                }`}
            />
        </span>
    )
}
