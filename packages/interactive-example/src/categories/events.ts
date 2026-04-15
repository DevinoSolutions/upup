import type { CategoryDefinition } from '../types'

const eventIds = [
    'onFilesSelected',
    'onFileUploadStart',
    'onFileUploadComplete',
    'onFilesUploadComplete',
    'onError',
    'onWarn',
    'onRetry',
    'onRestrictionFailed',
    'onFileTypeMismatch',
    'onFileAdded',
    'onFileRemoved',
    'onUploadProgress',
] as const

export const eventsCategory: CategoryDefinition = {
    id: 'events',
    label: 'Events',
    description: 'Log + toast handlers for every callback',
    entries: eventIds.map((id) => ({
        id: `events.${id}`,
        label: id,
        description: `Log to console and push toast when ${id} fires`,
        primitive: 'bool' as const,
        defaultValue: false,
    })),
}
