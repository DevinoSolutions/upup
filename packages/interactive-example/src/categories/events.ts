import type { CategoryDefinition } from '../types'

// Event prop names that exist on UpupUploaderProps. Each toggle, when on,
// wires a console logger as the callback (see preview/UploaderPreview.tsx).
// Grouped by phase so devs can find the one they want.
const eventIds = [
    // selection / interaction
    'onFilesSelected',
    'onFileClick',
    'onDoneClicked',
    'onIntegrationClick',
    // gating (ask for a promise/bool before accepting)
    'onBeforeFileAdded',
    'onPrepareFiles',
    // upload lifecycle
    'onUploadStart',
    'onFileUploadStart',
    'onFileUploadProgress',
    'onFilesUploadProgress',
    'onFileUploadComplete',
    'onFilesUploadComplete',
    'onUploadComplete',
    'onStatusChange',
    // file list management
    'onFileRemove',
    'onFileRemoved',
    // drag / drop
    'onFilesDragOver',
    'onFilesDragLeave',
    'onFilesDrop',
    // validation / errors
    'onFileTypeMismatch',
    'onRestrictionFailed',
    'onError',
    'onWarn',
    // async processing (server SSE)
    'onFileProcessed',
] as const

export const eventsCategory: CategoryDefinition = {
    id: 'events',
    label: 'Events',
    description: 'Toggle a console logger for any callback',
    entries: eventIds.map((id) => ({
        id: `events.${id}`,
        label: id,
        description: `Log to console with payload when ${id} fires`,
        primitive: 'bool' as const,
        defaultValue: false,
    })),
}
