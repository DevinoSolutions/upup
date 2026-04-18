import type { CategoryDefinition } from '../types'

export const appearanceCategory: CategoryDefinition = {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme mode, tokens, and per-slot overrides',
    entries: [
        {
            id: 'theme.mode',
            label: 'Theme mode',
            primitive: 'enum',
            defaultValue: 'system',
            options: { options: ['light', 'dark', 'system'], layout: 'segmented' },
        },
        {
            id: 'theme.tokens.color.primary',
            label: 'Primary color (hex)',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: '#30C5F7' },
        },
        {
            id: 'theme.slots',
            label: 'Slot overrides (className strings)',
            description: 'Apply custom className strings to internal slots. See docs for the full slot map.',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'uploader.container', label: 'uploader.container', primitive: 'string', defaultValue: '' },
                    { id: 'fileList.root', label: 'fileList.root', primitive: 'string', defaultValue: '' },
                    { id: 'fileList.uploadButton', label: 'fileList.uploadButton', primitive: 'string', defaultValue: '' },
                    { id: 'filePreview.deleteButton', label: 'filePreview.deleteButton', primitive: 'string', defaultValue: '' },
                    { id: 'progressBar.fill', label: 'progressBar.fill', primitive: 'string', defaultValue: '' },
                    { id: 'sourceSelector.adapterButton', label: 'sourceSelector.adapterButton', primitive: 'string', defaultValue: '' },
                    { id: 'sourceView.header', label: 'sourceView.header', primitive: 'string', defaultValue: '' },
                    { id: 'urlUploader.fetchButton', label: 'urlUploader.fetchButton', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        { id: 'className', label: 'Root className', primitive: 'string', defaultValue: '' },
    ],
}
