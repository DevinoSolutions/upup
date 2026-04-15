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
            label: 'Output quality (0–1)',
            primitive: 'number',
            defaultValue: undefined,
            options: { min: 0, max: 1, step: 0.1 },
        },
    ],
}
