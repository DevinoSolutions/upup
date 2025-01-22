import { UpupUploaderProps } from '../types'

const MIN_CHUNK_SIZE = 5 * 1024 * 1024 // 5MMB chunks

export function fileCheckType(
    accept: string,
    file: File,
    onFileTypeMismatch?: UpupUploaderProps['onFileTypeMismatch'],
) {
    const fileType = file.type
    const acceptedTypes = accept.split(',').map(t => t.trim())
    const isValidType =
        acceptedTypes.includes('*') ||
        acceptedTypes.some(type => {
            if (type.includes('/*')) {
                const [mainType] = type.split('/')
                return fileType.startsWith(mainType)
            }
            return type === fileType
        })

    if (!isValidType && onFileTypeMismatch) onFileTypeMismatch(file, accept)

    return isValidType
}

export function fileGetChunksCount(
    fileSize: number,
    chunkSize = MIN_CHUNK_SIZE,
) {
    return Math.ceil(fileSize / Math.max(chunkSize, MIN_CHUNK_SIZE))
}
