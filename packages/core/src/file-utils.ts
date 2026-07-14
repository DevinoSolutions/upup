import type { MaxFileSizeObject } from './contracts'

/**
 * @param bytes assign keyword depend on size
 */
export const bytesToSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i] ?? ''}`
}

/**
 * @param size
 * @param unit
 */
export const sizeToBytes = (
    size: number,
    unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB' = 'B',
): number => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = sizes.indexOf(unit)
    return size * Math.pow(1024, i)
}

/**
 * @param file
 * @param sizeLimit
 * @param mode
 */
export function checkFileSize(
    file: File,
    sizeLimit: MaxFileSizeObject | undefined,
    mode: 'max' | 'min' = 'max',
): boolean {
    if (!sizeLimit) return true
    const limitBytes = sizeToBytes(sizeLimit.size, sizeLimit.unit)
    if (mode === 'min') return file.size >= limitBytes
    return file.size <= limitBytes
}

/**
 * Maximum file size (in bytes) for which text-based preview is allowed.
 * Files exceeding this threshold will show a static icon instead of rendering content,
 * preventing the browser from freezing on large text files (e.g. 3MB+ JSON).
 */
export const PREVIEW_MAX_TEXT_SIZE = 512 * 1024 // 512 KB

/**
 * Maximum number of characters to render in the preview portal for text files.
 * Content beyond this limit is truncated with an indicator.
 */
export const PREVIEW_TEXT_TRUNCATE_LENGTH = 100_000 // ~100 KB of text

/**
 * Determines whether a file is a text-based file that could be previewed as text.
 */
export function fileGetIsText(
    fileType: string | undefined,
    fileName?: string,
): boolean {
    if (!fileType) return false
    if (fileType.startsWith('text/')) return true
    const lower = (fileName ?? '').toLowerCase()
    return (
        lower.endsWith('.txt') ||
        lower.endsWith('.md') ||
        lower.endsWith('.json') ||
        lower.endsWith('.csv') ||
        lower.endsWith('.log') ||
        lower.endsWith('.js') ||
        lower.endsWith('.ts') ||
        lower.endsWith('.css') ||
        lower.endsWith('.html')
    )
}

/**
 * Returns true if a text file is small enough to safely preview inline.
 */
export function fileCanPreviewText(
    fileType: string | undefined,
    fileName: string | undefined,
    fileSize: number | undefined,
): boolean {
    if (!fileGetIsText(fileType, fileName)) return false
    if (fileSize === undefined) return true // unknown size, allow preview
    return fileSize <= PREVIEW_MAX_TEXT_SIZE
}

export function fileGetIsImage(fileType?: string): boolean {
    return typeof fileType === 'string' && fileType.startsWith('image/')
}

export function fileGetIsPdf(
    fileType: string | undefined,
    fileName?: string,
): boolean {
    if (fileType === 'application/pdf') return true
    return (fileName ?? '').toLowerCase().endsWith('.pdf')
}

export function fileGetExtension(
    fileType: string | undefined,
    fileName?: string,
): string {
    const safeName = fileName ?? ''
    if (!fileType) {
        return safeName.split('.').pop()?.toLowerCase() || ''
    }
    const typeSplit = fileType.split('/')
    const nameSplit = safeName.split('.')
    const lastNamePart = nameSplit[nameSplit.length - 1]?.toLowerCase() || ''
    if (!typeSplit[1]) {
        return lastNamePart
    }
    if (typeSplit[1].includes('.')) {
        return lastNamePart
    }
    return typeSplit[1].toLowerCase()
}

export function fileIs3D(ext: string): boolean {
    const threeDExtensions = [
        '3ds',
        '3dm',
        'blend',
        'dxf',
        'dwg',
        'c4d',
        'ma',
        'mb',
        'ply',
        'stl',
        'fbx',
        'obj',
        'dae',
        'gltf',
        'glb',
        'm3',
    ]
    return threeDExtensions.includes(ext.toLowerCase())
}

export type FileProgress = {
    id: string
    loaded: number
    total: number
}

export type FilesProgressMap = Record<string, FileProgress>

export function searchDriveFiles<
    T extends {
        name: string
    },
>(
    files: T[],
    searchTerm: string,
    options: {
        caseSensitive?: boolean
        exactMatch?: boolean
        maxResults?: number
    } = {},
): T[] {
    const {
        caseSensitive = false,
        exactMatch = false,
        maxResults = 100,
    } = options

    if (!searchTerm) return files.slice(0, maxResults)

    let searchString = searchTerm
    let fileNames: string[]

    if (!caseSensitive) {
        searchString = searchTerm.toLowerCase()
        fileNames = files.map(file => file.name.toLowerCase())
    } else {
        fileNames = files.map(file => file.name)
    }

    return files
        .filter((_file, index) => {
            const name = fileNames[index]
            if (name === undefined) return false
            return exactMatch
                ? name === searchString
                : name.includes(searchString)
        })
        .slice(0, maxResults)
}
