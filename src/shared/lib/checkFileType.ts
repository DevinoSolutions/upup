import { BaseConfigs } from '../types/BaseConfigs'

export default function checkFileType(
    accept: string,
    file: File,
    onFileTypeMismatch?: BaseConfigs['onFileTypeMismatch'],
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
