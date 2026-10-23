import type React from 'react'

export interface Integration {
    id: string
    name: string
    icon: React.ComponentType<{
        className?: string
        style?: React.CSSProperties
    }>
    status: 'supported' | 'in-development' | 'planned'
    description: string
    category: string
    /** Docs page for this provider. When set, the supported chip links to it. */
    href?: string
    /** Short caveat shown under the chip name (e.g. a mode restriction). */
    qualifier?: string
}

export interface EmailModalProps {
    isOpen: boolean
    onClose: () => void
    integrationName: string
    isCustom?: boolean
    /** Element that opened the dialog; focus returns here on close. */
    triggerRef?: React.RefObject<HTMLElement | null>
}
