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
}

export type CategoryDefinition = {
    id: CategoryId
    label: string
    description?: string
    entries: ToggleEntry[]
    /** Optional lucide-style icon shown in the category header. */
    icon?: React.FC
}

export type UpupConfig = Partial<UpupUploaderProps>

export type InteractiveExampleProps = {
    defaultExpanded?: CategoryId[]
    showCodeTab?: boolean
    focus?: PropId[]
    initialConfig?: UpupConfig
    previewWidth?: number | 'auto'
    disableUrlSync?: boolean
}
