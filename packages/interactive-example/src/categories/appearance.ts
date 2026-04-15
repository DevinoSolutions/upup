import type { CategoryDefinition } from '../types'

export const appearanceCategory: CategoryDefinition = {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme, tokens, and slot overrides',
    entries: [
        {
            id: 'theme.mode',
            label: 'Theme mode',
            primitive: 'enum',
            defaultValue: 'system',
            options: { options: ['light', 'dark', 'system'] },
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
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'fileList.uploadButton', label: 'fileList.uploadButton', primitive: 'string', defaultValue: '' },
                    { id: 'fileList.root', label: 'fileList.root', primitive: 'string', defaultValue: '' },
                    { id: 'filePreview.deleteButton', label: 'filePreview.deleteButton', primitive: 'string', defaultValue: '' },
                    { id: 'progressBar.fill', label: 'progressBar.fill', primitive: 'string', defaultValue: '' },
                    { id: 'adapterSelector.adapterButton', label: 'adapterSelector.adapterButton', primitive: 'string', defaultValue: '' },
                    { id: 'mainBox.root', label: 'mainBox.root', primitive: 'string', defaultValue: '' },
                    { id: 'adapterView.header', label: 'adapterView.header', primitive: 'string', defaultValue: '' },
                    { id: 'urlUploader.fetchButton', label: 'urlUploader.fetchButton', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        { id: 'className', label: 'Root className', primitive: 'string', defaultValue: '' },
    ],
}
