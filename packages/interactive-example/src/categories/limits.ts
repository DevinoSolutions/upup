import type { CategoryDefinition } from '../types'
import { Filter } from 'lucide-react'

export const limitsCategory: CategoryDefinition = {
    id: 'limits',
    label: 'Limits',
    description: 'File count and size validation',
    icon: Filter,
    intro: 'Only Accept and Max files are echoed in the dropzone copy plus the file picker filter. Min file size, Max total file size, and the upper bound on Max file size are enforced silently — they fire validation errors when a file is added, but you won\'t see them stated in the UI before that.',
    entries: [
        {
            id: 'accept',
            label: 'Accept (MIME pattern)',
            description: 'Allowlist for the OS file picker — only matching files are pickable. There is no separate denylist prop; "what isn\'t allowed" is just everything outside this pattern. Pick a preset or type your own (comma-separated).',
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
            description: 'Upper bound on number of queued files. Echoes in the dropzone copy.',
            primitive: 'number',
            defaultValue: 10,
            options: { min: 1, max: 100 },
        },
        {
            id: 'maxFileSize',
            label: 'Max file size',
            description: 'Per-file ceiling. Echoes in the dropzone copy and rejects oversized picks.',
            primitive: 'size-unit',
            defaultValue: undefined,
            options: { defaultSize: 100, defaultUnit: 'MB' },
        },
        {
            id: 'minFileSize',
            label: 'Min file size',
            description: 'Per-file floor. Validation-only — fires onRestrictionFailed on too-small picks but isn\'t shown in the dropzone copy.',
            primitive: 'size-unit',
            defaultValue: undefined,
            options: { defaultSize: 0, defaultUnit: 'KB' },
        },
        {
            id: 'maxTotalFileSize',
            label: 'Max total file size',
            description: 'Combined ceiling across the queue. Validation-only — fires onRestrictionFailed when the sum exceeds the limit; not stated upfront.',
            primitive: 'size-unit',
            defaultValue: undefined,
            options: { defaultSize: 500, defaultUnit: 'MB' },
        },
    ],
}
