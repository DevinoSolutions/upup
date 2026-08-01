import { createContext } from 'react'

/**
 * DOM host inside the SourceView header row, just before the Back button.
 * A source view portals its right-side header extras into it (e.g. the drive
 * browser's avatar + log out + separator) so account controls share the top
 * row instead of occupying their own strip. Null when no header is mounted.
 */
export const SourceViewHeaderExtraContext = createContext<HTMLElement | null>(
    null,
)
