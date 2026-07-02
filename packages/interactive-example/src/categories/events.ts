import type { CategoryDefinition, ToggleEntry } from '../types'
import { Activity } from 'lucide-react'

// Event prop names on UploaderProps grouped by lifecycle. Each toggle
// wires both the EventLog panel and a console logger as the callback
// (see preview/UploaderPreview.tsx).
const GROUPS: Array<{ label: string; ids: readonly string[] }> = [
    {
        label: 'Selection & clicks',
        ids: [
            'onFilesSelected',
            'onFileClick',
            'onDoneClicked',
            'onIntegrationClick',
        ],
    },
    {
        label: 'Validation',
        ids: [
            'onBeforeFileAdded',
            'onPrepareFiles',
            'onFileTypeMismatch',
            'onRestrictionFailed',
        ],
    },
    {
        label: 'Upload lifecycle',
        ids: [
            'onUploadStart',
            'onFileUploadStart',
            'onFileUploadProgress',
            'onFilesUploadProgress',
            'onFileUploadComplete',
            'onFilesUploadComplete',
            'onUploadComplete',
            'onStatusChange',
        ],
    },
    {
        label: 'File management',
        ids: ['onFileRemoved'],
    },
    {
        label: 'Drag & drop',
        ids: ['onFilesDragOver', 'onFilesDragLeave', 'onFilesDrop'],
    },
    {
        label: 'Errors & processing',
        ids: ['onError', 'onWarn', 'onFileProcessed'],
    },
]

const entries: ToggleEntry[] = GROUPS.flatMap(({ label, ids }) =>
    ids.map((id) => ({
        id: `events.${id}`,
        label: id,
        description: `Fires when ${id} triggers — payload shows in the event log below the preview.`,
        primitive: 'bool' as const,
        defaultValue: false,
        group: label,
    })),
)

export const eventsCategory: CategoryDefinition = {
    id: 'events',
    label: 'Events',
    description: 'Log UpupUploader callbacks live as you interact with the preview',
    icon: Activity,
    intro: 'Toggle a callback then drag, paste, or pick a file in the preview — every fired event lands in the Event Log panel below with its arguments.',
    entries,
}
