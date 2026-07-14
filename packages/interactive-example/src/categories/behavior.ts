import type { CategoryDefinition } from '../types'
import { SlidersHorizontal } from 'lucide-react'

export const behaviorCategory: CategoryDefinition = {
    id: 'behavior',
    label: 'Behavior',
    description: 'UX and interaction modes',
    icon: SlidersHorizontal,
    entries: [
        {
            id: 'mini',
            label: 'Mini mode',
            description: 'Compact layout — fixed 1-file limit, smaller dropzone',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'enablePaste',
            label: 'Enable paste upload',
            description: 'Paste images from the clipboard with Ctrl/Cmd+V',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'disableDragDrop',
            label: 'Disable drag and drop',
            description: 'Keep browse/source buttons active but ignore dragged files.',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'allowPreview',
            label: 'Allow file preview',
            description: 'Show a thumbnail preview next to each queued file. Visible after you pick a file.',
            primitive: 'bool',
            defaultValue: true,
        },
        {
            id: 'showBranding',
            label: 'Show upup branding',
            description: 'Display the "Built by Devino" footer badge.',
            primitive: 'bool',
            defaultValue: true,
        },
        {
            id: 'isProcessing',
            label: 'Demo: show loading state',
            description: 'Dims the file list so you can preview the loading state. Pick a file first — the overlay only renders alongside the queue.',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
