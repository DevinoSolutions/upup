import { BaseConfigs } from '../types/BaseConfigs'

export default function checkFileType(
    accept: string,
    file: File,
    onFileTypeMismatch?: BaseConfigs['onFileTypeMismatch'],
) {
    try {
        const fileType = file.type

        // Return false for invalid inputs
        if (!accept || !fileType) throw new Error('Invalid inputs')

        // Validate fileType has proper MIME format (type/subtype)
        const [type, subtype] = fileType.split('/')
        if (!type || !subtype)
            throw new Error('Invalid MIME format (type/subtype)')

        const acceptedTypes = accept.split(',').map(t => t.trim())
        const isValidType =
            acceptedTypes.includes('*') ||
            acceptedTypes.some(type => {
                if (type.includes('/*')) {
                    const [mainType] = type.split('/')
                    return fileType.startsWith(mainType)
                }
                return type.toLowerCase() === fileType.toLowerCase()
            })

        if (!isValidType) throw new Error('Invalid type')

        return isValidType
    } catch (error) {
        onFileTypeMismatch?.(file, accept)
        return false
    }
}
