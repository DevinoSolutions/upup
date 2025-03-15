export default function checkFileType(accept: string, file: File) {
    const fileType = file.type
    // Return false for invalid inputs
    if (!accept) return false
    // Validate fileType has proper MIME format (type/subtype)
    if (fileType) {
        const [type, subtype] = fileType.split('/')
        if (type && subtype) {
            const acceptedTypes = accept.split(',').map(t => t.trim())
            const isValidType =
                acceptedTypes.includes('*') ||
                acceptedTypes.some(item => {
                    if (item.includes('/*')) {
                        const [mainType] = item.split('/')
                        return fileType.startsWith(mainType)
                    }
                    return item.toLowerCase() === fileType.toLowerCase()
                })
            if (isValidType) return true
        }
    }

    const fileName = file.name ?? ''
    if (!fileName) {
        return false
    }

    const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
    if (fileExt) {
        const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase())
        const isValidExtension = acceptedTypes.some(ext => {
            if (ext.startsWith('.')) {
                return ext.slice(1) === fileExt
            }
            return false
        })
        if (isValidExtension) return true
    }
    return false
}
