import type { CategoryDefinition } from '../types'

const sizeFields = [
    { id: 'size', label: 'Size', primitive: 'number' as const, defaultValue: 100 },
    {
        id: 'unit',
        label: 'Unit',
        primitive: 'enum' as const,
        defaultValue: 'MB',
        options: { options: ['B', 'KB', 'MB', 'GB'] },
    },
]

export const limitsCategory: CategoryDefinition = {
    id: 'limits',
    label: 'Limits',
    description: 'File count and size validation',
    entries: [
        { id: 'accept', label: 'Accept (MIME pattern)', primitive: 'string', defaultValue: '', options: { placeholder: 'image/*' } },
        { id: 'maxFiles', label: 'Max files (v2)', description: 'Preferred v2 alias for the legacy `limit` prop', primitive: 'number', defaultValue: 10, options: { min: 1, max: 100 } },
        { id: 'limit', label: 'File count limit (legacy)', description: 'Deprecated — kept for v1 compat. Prefer `maxFiles`.', primitive: 'number', defaultValue: 10, options: { min: 1, max: 100 } },
        {
            id: 'maxFileSize',
            label: 'Max file size',
            primitive: 'nested',
            defaultValue: undefined,
            options: { fields: sizeFields },
        },
        {
            id: 'minFileSize',
            label: 'Min file size',
            primitive: 'nested',
            defaultValue: undefined,
            options: { fields: sizeFields },
        },
        {
            id: 'maxTotalFileSize',
            label: 'Max total file size',
            primitive: 'nested',
            defaultValue: undefined,
            options: { fields: sizeFields },
        },
    ],
}
