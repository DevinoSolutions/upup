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

import { BaseConfigs } from 'types'

/**
 * @param file
 * @param maxFileSize
 */
export function checkFileSize(
    file: File,
    maxFileSize: BaseConfigs['maxFileSize'],
) {
    const maxBytes = sizeToBytes(maxFileSize!.size, maxFileSize!.unit)
    if (file.size <= maxBytes) return true
    return false
}
