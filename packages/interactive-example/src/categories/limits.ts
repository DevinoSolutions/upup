import type { CategoryDefinition } from '../types'
import { Filter } from 'lucide-react'

export const limitsCategory: CategoryDefinition = {
    id: 'limits',
    label: 'Limits',
    description: 'File count and size validation',
    icon: Filter,
    entries: [
        {
            id: 'accept',
            label: 'Accept (MIME pattern)',
            description: 'Restrict the file picker. Pick a preset or type your own MIME pattern (comma-separated).',
            primitive: 'combo',
            defaultValue: '',
            options: {
                placeholder: 'image/*',
                presets: [
                    { label: 'Images', value: 'image/*' },
                    { label: 'Videos', value: 'video/*' },
                    { label: 'Audio', value: 'audio/*' },
                    { label: 'PDFs', value: 'application/pdf' },
                    { label: 'Documents', value: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain' },
                    { label: 'Anything', value: '*/*' },
                ],
            },
        },
        {
            id: 'maxFiles',
            label: 'Max files',
            primitive: 'number',
            defaultValue: 10,
            options: { min: 1, max: 100 },
        },
        {
            id: 'maxFileSize',
            label: 'Max file size',
            primitive: 'size-unit',
            defaultValue: undefined,
            options: { defaultSize: 100, defaultUnit: 'MB' },
        },
        {
            id: 'minFileSize',
            label: 'Min file size',
            primitive: 'size-unit',
            defaultValue: undefined,
            options: { defaultSize: 0, defaultUnit: 'KB' },
        },
        {
            id: 'maxTotalFileSize',
            label: 'Max total file size',
            primitive: 'size-unit',
            defaultValue: undefined,
            options: { defaultSize: 500, defaultUnit: 'MB' },
        },
    ],
}
