export function checkFileType(file: File, acceptedFiles: string) {
    if (file && acceptedFiles && acceptedFiles !== '*') {
        const acceptedFilesArray = Array.isArray(acceptedFiles)
            ? acceptedFiles
            : acceptedFiles.split(',')
        const { name: fileName, type: mimeType } = file
        const baseMimeType = mimeType.replace(/\/.*$/, '')
        const extension = mimeType.split('/')[1]

        return (
            acceptedFilesArray.includes(extension) ||
            acceptedFilesArray.includes(mimeType) ||
            acceptedFilesArray.includes(`${baseMimeType}/*`) ||
            acceptedFilesArray.some(
                type => type.startsWith('.') && fileName.endsWith(type),
            )
        )
    }
    return true
}
