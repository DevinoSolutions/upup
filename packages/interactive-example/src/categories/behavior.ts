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
        { id: 'isProcessing', label: 'isProcessing (demo loading state)', primitive: 'bool', defaultValue: false },
        {
            id: 'enableAutoCorsConfig',
            label: 'Auto-configure S3 CORS',
            description: 'Auto-patch the bucket CORS on first use. Requires IAM permission on the backend.',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
