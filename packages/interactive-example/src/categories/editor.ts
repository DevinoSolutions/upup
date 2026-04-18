import type { CategoryDefinition } from '../types'

export const editorCategory: CategoryDefinition = {
    id: 'editor',
    label: 'Editor',
    description: 'Image editor configuration',
    entries: [
        { id: 'imageEditor.enabled', label: 'Enable image editor', primitive: 'bool', defaultValue: false },
        {
            id: 'imageEditor.display',
            label: 'Display mode',
            primitive: 'enum',
            defaultValue: 'inline',
            options: { options: ['inline', 'modal'] },
        },
        {
            id: 'imageEditor.autoOpen',
            label: 'Auto-open',
            primitive: 'enum',
            defaultValue: 'never',
            options: { options: ['never', 'single', 'always'] },
        },
        {
            id: 'imageEditor.output.quality',
            label: 'Output quality',
            primitive: 'number',
            defaultValue: 0.8,
            options: { min: 0, max: 1, step: 0.05, display: 'slider' },
        },
    ],
}
