export default function checkFileType(accept: string, file: File) {
    const fileType = file.type
    // Return false for invalid inputs
    if (!accept || !fileType) return false
    // Validate fileType has proper MIME format (type/subtype)
    const [type, subtype] = fileType.split('/')
    if (!type || !subtype) return false
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
    if (!isValidType) return false
    return isValidType
}
