import type { CategoryDefinition } from '../types'
import { Crop } from 'lucide-react'

export const editorCategory: CategoryDefinition = {
    id: 'editor',
    label: 'Editor',
    description: 'Image editor configuration',
    icon: Crop,
    entries: [
        {
            id: 'imageEditor.enabled',
            label: 'Enable image editor',
            description: 'Lazy-loads react-filerobot-image-editor so users can crop, rotate, and annotate images before upload.',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'imageEditor.display',
            label: 'Display mode',
            description: 'Inline keeps the editor in the dropzone; Modal opens it as an overlay over your page.',
            primitive: 'enum',
            defaultValue: 'inline',
            options: { options: ['inline', 'modal'], layout: 'segmented' },
            visibleWhen: { propId: 'imageEditor.enabled', equals: true },
        },
        {
            id: 'imageEditor.autoOpen',
            label: 'Auto-open',
            description: 'When the editor pops up automatically after picking files.',
            primitive: 'enum',
            defaultValue: 'never',
            options: { options: ['never', 'single', 'always'], layout: 'segmented' },
            visibleWhen: { propId: 'imageEditor.enabled', equals: true },
        },
        {
            id: 'imageEditor.output.quality',
            label: 'Output quality',
            description: 'JPEG/WebP encode quality for the edited image.',
            primitive: 'number',
            defaultValue: 0.8,
            options: { min: 0, max: 1, step: 0.05, display: 'slider', format: 'percent' },
            visibleWhen: { propId: 'imageEditor.enabled', equals: true },
        },
    ],
}
