import pako from 'pako'
import { v4 as uuid } from 'uuid'
import { UpupUploaderProps } from '../../shared/types'

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

export const fileAppendId = (file: File) =>
    Object.assign(file, {
        id: uuid(),
    })

export function getUniqueFilesByName(files: File[]) {
    const uniqueFiles = new Map()

    files.forEach(file => {
        if (!uniqueFiles.has(file.name)) {
            uniqueFiles.set(file.name, file)
        }
    })

    return Array.from(uniqueFiles.values())
}

export async function compressFile(file: File) {
    const buffer: ArrayBuffer = await file.arrayBuffer()
    return new File([pako.gzip(buffer)], file.name + '.gz', {
        type: 'application/octet-stream',
    })
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
