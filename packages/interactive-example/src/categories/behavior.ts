import type { CategoryDefinition } from '../types'

export const behaviorCategory: CategoryDefinition = {
    id: 'behavior',
    label: 'Behavior',
    description: 'UX and interaction modes',
    entries: [
        { id: 'mini', label: 'Mini mode', primitive: 'bool', defaultValue: false },
        { id: 'enablePaste', label: 'Enable paste upload', primitive: 'bool', defaultValue: false },
        { id: 'allowFolderUpload', label: 'Allow folder upload', primitive: 'bool', defaultValue: false },
        { id: 'disableDragDrop', label: 'Disable drag & drop', primitive: 'bool', defaultValue: false },
        { id: 'allowPreview', label: 'Allow file preview', primitive: 'bool', defaultValue: true },
        { id: 'showBranding', label: 'Show upup branding', primitive: 'bool', defaultValue: true },
        {
            id: 'isProcessing',
            label: 'Demo: show loading state',
            description: 'Forces the uploader into its loading overlay so you can preview the state without triggering a real upload.',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
