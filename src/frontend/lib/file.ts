import pako from 'pako'
import { FileWithParams, UpupUploaderProps } from '../../shared/types'

/**
 * @param bytes assign keyword depend on size
 */
export const bytesToSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i]
}

/**
 * @param size
 * @param unit
 */
export const sizeToBytes = (
    size: number,
    unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB' = 'B',
) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = sizes.indexOf(unit)
    return size * Math.pow(1024, i)
}

/**
 * @param file
 * @param maxFileSize
 */
export function checkFileSize(
    file: File,
    maxFileSize: UpupUploaderProps['maxFileSize'],
) {
    const maxBytes = sizeToBytes(maxFileSize!.size, maxFileSize!.unit)
    if (file.size <= maxBytes) return true
    return false
}

export const fileAppendParams = (file: File) => {
    Object.assign(file, {
        id: (file as any).id || btoa(file.name),
        url: (file as any).url || URL.createObjectURL(file),
    })

    return file as FileWithParams
}

export async function compressFile(file: FileWithParams) {
    const buffer = await file.arrayBuffer()
    return fileAppendParams(
        new File([pako.gzip(buffer)], file.name + '.gz', {
            type: 'application/octet-stream',
        }),
    )
}

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

    if (!searchTerm) return files?.slice(0, maxResults)

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
            // Check if file name matches search term
            return exactMatch
                ? fileNames[index] === searchString
                : fileNames[index].includes(searchString)
        })
        .slice(0, maxResults)
}

export function fileGetIsImage(fileType: string) {
    return fileType.startsWith('image/')
}

export function fileGetExtension(fileType: string, fileName: string) {
    if (!fileType) {
        return fileName.split('.').pop()?.toLowerCase() || ''
    }
    const typeSplit = fileType.split('/')
    const nameSplit = fileName.split('.')
    const lastNamePart = nameSplit[nameSplit.length - 1]?.toLowerCase() || ''
    if (!typeSplit[1]) {
        return lastNamePart
    }
    if (typeSplit[1].includes('.')) {
        return lastNamePart
    }
    return typeSplit[1].toLowerCase()
}

export function fileIs3D(ext: string) {
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