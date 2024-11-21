export function checkFileType(accept: string, fileType: string) {
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

    return isValidType
}
