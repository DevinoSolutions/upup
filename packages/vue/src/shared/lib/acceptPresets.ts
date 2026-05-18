export interface AcceptPresetDefinition {
    label: string
    accept: string
}

export const ACCEPT_PRESETS: Record<string, AcceptPresetDefinition> = {
    images: {
        label: 'Images',
        accept: 'image/*',
    },
    video: {
        label: 'Video',
        accept: 'video/*',
    },
    audio: {
        label: 'Audio',
        accept: 'audio/*',
    },
    documents: {
        label: 'Documents',
        accept: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,text/plain,text/rtf',
    },
    spreadsheets: {
        label: 'Spreadsheets',
        accept: 'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.oasis.opendocument.spreadsheet,.tsv',
    },
    presentations: {
        label: 'Presentations',
        accept: 'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation,.key',
    },
    archives: {
        label: 'Archives',
        accept: 'application/zip,application/x-rar-compressed,application/x-7z-compressed,application/x-tar,application/gzip,.bz2',
    },
    code: {
        label: 'Code',
        accept: 'text/javascript,application/json,text/html,text/css,text/xml,text/yaml,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.cpp,.c,.h,.sh,.sql',
    },
    fonts: {
        label: 'Fonts',
        accept: 'font/ttf,font/otf,font/woff,font/woff2,.ttf,.otf,.woff,.woff2',
    },
    '3d': {
        label: '3D',
        accept: '.obj,.stl,.gltf,.glb,.fbx,.usdz',
    },
    design: {
        label: 'Design',
        accept: 'image/svg+xml,.psd,.ai,.sketch,.fig,.xd',
    },
    ebooks: {
        label: 'Ebooks',
        accept: 'application/epub+zip,application/pdf,.mobi,.azw',
    },
    photography: {
        label: 'Photography',
        accept: 'image/*,.cr2,.cr3,.nef,.arw,.dng,.orf,.rw2,.raf,.raw',
    },
    animation: {
        label: 'Animation',
        accept: 'image/gif,image/apng,image/webp,.lottie,.rive',
    },
    ar: {
        label: 'AR',
        accept: '.usdz,.reality,.glb,.gltf',
    },
    vector: {
        label: 'Vector',
        accept: 'image/svg+xml,.eps,.ai',
    },
    cad: {
        label: 'CAD',
        accept: '.dwg,.dxf,.step,.stp,.iges,.igs',
    },
    gis: {
        label: 'GIS',
        accept: 'application/geo+json,.kml,.kmz,.shp,.gpx,.geojson',
    },
    data: {
        label: 'Data',
        accept: 'application/json,text/xml,text/csv,text/yaml,.toml,.parquet,.jsonl,.ndjson',
    },
    markup: {
        label: 'Markup',
        accept: 'text/markdown,.md,.rst,.tex,.adoc,.latex',
    },
    subtitles: {
        label: 'Subtitles',
        accept: '.srt,.vtt,.ass,.sub,.ssa',
    },
    email: {
        label: 'Email',
        accept: '.eml,.msg,.mbox',
    },
    calendar: {
        label: 'Calendar',
        accept: 'text/calendar,.ics,.ical',
    },
    contacts: {
        label: 'Contacts',
        accept: 'text/vcard,.vcf',
    },
    disk: {
        label: 'Disk',
        accept: '.iso,.img,.dmg,.vhd,.vhdx',
    },
    ml: {
        label: 'ML',
        accept: '.onnx,.h5,.pb,.pt,.safetensors,.pkl',
    },
    database: {
        label: 'Database',
        accept: '.sql,.sqlite,.db,.mdb,.accdb',
    },
    certificates: {
        label: 'Certificates',
        accept: '.pem,.crt,.cer,.p12,.pfx,.key',
    },
    firmware: {
        label: 'Firmware',
        accept: '.bin,.hex,.elf,.srec',
    },
    executable: {
        label: 'Executable',
        accept: '.exe,.msi,.dmg,.apk,.deb,.rpm,.appimage',
    },
    config: {
        label: 'Config',
        accept: '.ini,.cfg,.conf,.env,.toml,.properties,.yaml,.yml',
    },
    financial: {
        label: 'Financial',
        accept: '.ofx,.qfx,.qbo,.qif',
    },
    scientific: {
        label: 'Scientific',
        accept: '.fits,.hdf5,.nc,.mat,.netcdf',
    },
    medical: {
        label: 'Medical',
        accept: 'application/dicom,.dcm,.nii,.nii.gz',
    },
} as const

export type AcceptPreset = keyof typeof ACCEPT_PRESETS

export function resolveAccept(input: string | string[]): string {
    const raw = Array.isArray(input) ? input.join(',') : input
    return raw
        .split(',')
        .map(token => {
            const trimmed = token.trim()
            const key = trimmed.toLowerCase()
            return ACCEPT_PRESETS[key]?.accept ?? trimmed
        })
        .join(',')
}
