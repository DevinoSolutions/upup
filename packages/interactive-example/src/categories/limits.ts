import type { CategoryDefinition } from '../types'
import { Filter } from 'lucide-react'
import { ACCEPT_PRESETS } from '@upup/react'

const MIME_TO_EXTS: Record<string, string[]> = {
    'image/*': ['.jpg', '.png', '.gif', '.webp', '.svg', '.bmp'],
    'video/*': ['.mp4', '.mov', '.webm', '.avi', '.mkv'],
    'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.oasis.opendocument.text': ['.odt'],
    'text/plain': ['.txt'],
    'text/rtf': ['.rtf'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
    'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/vnd.oasis.opendocument.presentation': ['.odp'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'application/x-7z-compressed': ['.7z'],
    'application/x-tar': ['.tar'],
    'application/gzip': ['.gz'],
    'text/javascript': ['.js'],
    'application/json': ['.json'],
    'text/html': ['.html'],
    'text/css': ['.css'],
    'text/xml': ['.xml'],
    'text/yaml': ['.yaml'],
    'image/svg+xml': ['.svg'],
    'application/epub+zip': ['.epub'],
    'text/markdown': ['.md'],
    'text/calendar': ['.ics'],
    'text/vcard': ['.vcf'],
    'application/geo+json': ['.geojson'],
    'application/dicom': ['.dcm'],
    'image/gif': ['.gif'],
    'image/apng': ['.apng'],
    'image/webp': ['.webp'],
    'font/ttf': ['.ttf'],
    'font/otf': ['.otf'],
    'font/woff': ['.woff'],
    'font/woff2': ['.woff2'],
}

function summarizeAccept(accept: string, max = 6): string {
    const exts: string[] = []
    for (const token of accept.split(',')) {
        const t = token.trim()
        if (t.startsWith('.')) {
            exts.push(t)
        } else if (MIME_TO_EXTS[t]) {
            exts.push(...MIME_TO_EXTS[t])
        }
    }
    const unique = [...new Set(exts)]
    if (unique.length === 0) return accept
    if (unique.length <= max) return unique.join(', ')
    return unique.slice(0, max).join(', ') + ', ...'
}

const acceptPresetOptions = [
    ...Object.entries(ACCEPT_PRESETS).map(([key, def]) => ({
        label: def.label,
        value: key,
        description: summarizeAccept(def.accept),
    })),
    { label: 'Anything', value: '*/*', description: 'All file types' },
]

export const limitsCategory: CategoryDefinition = {
    tier: 'simple',
    id: 'limits',
    label: 'Limits',
    description: 'File count and size validation',
    icon: Filter,
    intro: 'Only Accept and Max files are echoed in the dropzone copy plus the file picker filter. Min file size, Max total file size, and the upper bound on Max file size are enforced silently — they fire validation errors when a file is added, but you won\'t see them stated in the UI before that.',
    entries: [
        {
            id: 'allowedFileTypes',
            label: 'Allowed file types',
            description: 'Allowlist for the OS file picker — only matching files are pickable. Pick a preset name (e.g. "images", "documents") or type a raw MIME pattern (comma-separated). Presets expand to full MIME types internally.',
            primitive: 'combo',
            defaultValue: '',
            options: {
                placeholder: 'images',
                presets: acceptPresetOptions,
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
