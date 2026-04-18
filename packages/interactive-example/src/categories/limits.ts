import type { CategoryDefinition } from '../types'

export const limitsCategory: CategoryDefinition = {
    id: 'limits',
    label: 'Limits',
    description: 'File count and size validation',
    entries: [
        {
            id: 'accept',
            label: 'Accept (MIME pattern)',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: 'image/*' },
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
