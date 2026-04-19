import type { CategoryDefinition } from '../types'

export const behaviorCategory: CategoryDefinition = {
    id: 'behavior',
    label: 'Behavior',
    description: 'UX and interaction modes',
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
            id: 'allowFolderUpload',
            label: 'Allow folder upload',
            description: 'Show a Select folder option in the source picker',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'disableDragDrop',
            label: 'Disable drag & drop',
            description: 'Hide the drop zone; user must use the browse button',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'allowPreview',
            label: 'Allow file preview',
            description: 'Show a thumbnail preview next to each queued file',
            primitive: 'bool',
            defaultValue: true,
        },
        {
            id: 'showBranding',
            label: 'Show upup branding',
            description: 'Display the "Built by Devino" footer badge',
            primitive: 'bool',
            defaultValue: true,
        },
        {
            id: 'isProcessing',
            label: 'Demo: show loading state',
            description: 'Forces the uploader into its loading overlay so you can preview the state without triggering a real upload.',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
