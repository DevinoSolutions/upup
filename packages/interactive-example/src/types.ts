import type React from 'react'
import type { UpupUploaderProps } from 'upup-react-file-uploader'

export type CategoryId =
    | 'upload'
    | 'sources'
    | 'limits'
    | 'processing'
    | 'editor'
    | 'behavior'
    | 'appearance'
    | 'language'
    | 'events'
    | 'advanced'

/** Dotted path into UpupUploaderProps, e.g. "provider" or "cloudDrives.googleDrive.clientId". */
export type PropId = string

export type PrimitiveKind =
    | 'bool'
    | 'number'
    | 'enum'
    | 'multi'
    | 'string'
    | 'nested'
    | 'size-unit'
    | 'color'
    | 'combo'

/**
 * Hide a field unless a sibling prop holds a matching value. The propId is
 * absolute (full dotted path into the live config) so an entry can depend
 * on a value rendered anywhere in the sidebar.
 */
export type VisibleWhen = {
    propId: PropId
    /** Visible when the live value matches one of these. */
    equals?: unknown | unknown[]
    /** Visible when the live value does *not* match this. */
    notEquals?: unknown
}

export type ToggleEntry = {
    id: PropId
    label: string
    description?: string
    primitive: PrimitiveKind
    defaultValue: unknown
    options?: Record<string, unknown>
    docsLink?: string
    /** Optional subgroup heading within a category — used to split long lists like Events. */
    group?: string
    /** Hide the field unless its dependency matches the declared value. */
    visibleWhen?: VisibleWhen
}

export type CategoryDefinition = {
    id: CategoryId
    label: string
    description?: string
    entries: ToggleEntry[]
    /** Optional lucide-style icon shown in the category header. */
    icon?: React.FC
    /**
     * Short banner copy rendered above the entries. Use it to set context
     * for sections whose toggles are config-only (Processing, Events) so a
     * reader doesn't expect a visible reaction in the preview.
     */
    intro?: string
}

export type UpupConfig = Partial<UpupUploaderProps>

export type InteractiveExampleProps = {
    defaultExpanded?: CategoryId[]
    showCodeTab?: boolean
    focus?: PropId[]
    initialConfig?: UpupConfig
    previewWidth?: number | 'auto'
}
