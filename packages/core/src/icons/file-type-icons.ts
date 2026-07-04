import type { IconDef } from './registry'

// Tabler outline preset — identical values to STROKE_ATTRS in registry.ts
// (kept local to avoid a value import cycle with registry.ts).
const FT_STROKE = {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
} as const

export const FILE_TYPE_EXTENSIONS = [
    'bmp',
    'css',
    'csv',
    'docx',
    'html',
    'jpg',
    'js',
    'jsx',
    'pdf',
    'png',
    'php',
    'ppt',
    'rs',
    'sql',
    'svg',
    'ts',
    'tsx',
    'txt',
    'vue',
    'xls',
    'xml',
    'zip',
] as const

export type FileTypeIconName = `file-${(typeof FILE_TYPE_EXTENSIONS)[number]}`

export const FILE_TYPE_ICONS: Record<FileTypeIconName, IconDef> = {
    'file-bmp': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M18 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M4 21h1.5a1.5 1.5 0 0 0 0 -3h-1.5h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6z"></path><path d="M10 21v-6l2.5 3l2.5 -3v6"></path>`,
    },
    'file-css': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M8 16.5a1.5 1.5 0 0 0 -3 0v3a1.5 1.5 0 0 0 3 0"></path><path d="M11 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M17 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path>`,
    },
    'file-csv': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M7 16.5a1.5 1.5 0 0 0 -3 0v3a1.5 1.5 0 0 0 3 0"></path><path d="M10 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M16 15l2 6l2 -6"></path>`,
    },
    'file-docx': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M2 15v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2h-1z"></path><path d="M17 16.5a1.5 1.5 0 0 0 -3 0v3a1.5 1.5 0 0 0 3 0"></path><path d="M9.5 15a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1 -3 0v-3a1.5 1.5 0 0 1 1.5 -1.5z"></path><path d="M19.5 15l3 6"></path><path d="M19.5 21l3 -6"></path>`,
    },
    'file-html': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M2 21v-6"></path><path d="M5 15v6"></path><path d="M2 18h3"></path><path d="M20 15v6h2"></path><path d="M13 21v-6l2 3l2 -3v6"></path><path d="M7.5 15h3"></path><path d="M9 15v6"></path>`,
    },
    'file-jpg': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M11 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M20 15h-1a2 2 0 0 0 -2 2v2a2 2 0 0 0 2 2h1v-3"></path><path d="M5 15h3v4.5a1.5 1.5 0 0 1 -3 0"></path>`,
    },
    'file-js': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M3 15h3v4.5a1.5 1.5 0 0 1 -3 0"></path><path d="M9 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1"></path>`,
    },
    'file-jsx': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M4 15h3v4.5a1.5 1.5 0 0 1 -3 0"></path><path d="M10 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M16 15l4 6"></path><path d="M16 21l4 -6"></path>`,
    },
    'file-pdf': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M17 18h2"></path><path d="M20 15h-3v6"></path><path d="M11 15v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2h-1z"></path>`,
    },
    'file-png': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M20 15h-1a2 2 0 0 0 -2 2v2a2 2 0 0 0 2 2h1v-3"></path><path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M11 21v-6l3 6v-6"></path>`,
    },
    'file-php': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M17 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M11 21v-6"></path><path d="M14 15v6"></path><path d="M11 18h3"></path>`,
    },
    'file-ppt': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M11 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M16.5 15h3"></path><path d="M18 15v6"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path>`,
    },
    'file-rs': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M9 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1"></path><path d="M3 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6m3 0l-2 -3"></path>`,
    },
    'file-sql': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M18 15v6h2"></path><path d="M13 15a2 2 0 0 1 2 2v2a2 2 0 1 1 -4 0v-2a2 2 0 0 1 2 -2z"></path><path d="M14 20l1.5 1.5"></path>`,
    },
    'file-svg': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M4 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M10 15l2 6l2 -6"></path><path d="M20 15h-1a2 2 0 0 0 -2 2v2a2 2 0 0 0 2 2h1v-3"></path>`,
    },
    'file-ts': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M9 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M3.5 15h3"></path><path d="M5 15v6"></path>`,
    },
    'file-tsx': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M16 15l4 6"></path><path d="M16 21l4 -6"></path><path d="M10 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M4.5 15h3"></path><path d="M6 15v6"></path>`,
    },
    'file-txt': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M16.5 15h3"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M4.5 15h3"></path><path d="M6 15v6"></path><path d="M18 15v6"></path><path d="M10 15l4 6"></path><path d="M10 21l4 -6"></path>`,
    },
    'file-vue': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M4 15l2 6l2 -6"></path><path d="M11 15v4.5a1.5 1.5 0 0 0 3 0v-4.5"></path><path d="M20 15h-3v6h3"></path><path d="M17 18h2"></path>`,
    },
    'file-xls': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M4 15l4 6"></path><path d="M4 21l4 -6"></path><path d="M17 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"></path><path d="M11 15v6h3"></path>`,
    },
    'file-xml': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M4 15l4 6"></path><path d="M4 21l4 -6"></path><path d="M19 15v6h3"></path><path d="M11 21v-6l2.5 3l2.5 -3v6"></path>`,
    },
    'file-zip': {
        viewBox: '0 0 24 24',
        defaultSize: 48,
        attrs: { ...FT_STROKE },
        inner: `<path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"></path><path d="M16 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"></path><path d="M12 15v6"></path><path d="M5 15h3l-3 6h3"></path>`,
    },
}
