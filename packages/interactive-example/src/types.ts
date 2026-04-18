import type { UpupUploaderProps } from '@upup/react'

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

export type ToggleEntry = {
    id: PropId
    label: string
    description?: string
    primitive: PrimitiveKind
    defaultValue: unknown
    options?: Record<string, unknown>
    docsLink?: string
}

export type CategoryDefinition = {
    id: CategoryId
    label: string
    description?: string
    entries: ToggleEntry[]
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
