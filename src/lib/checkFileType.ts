import { BaseConfigs } from '../types/BaseConfigs'

export function checkFileType(
    file: File,
    acceptedFiles: string,
    onFileTypeMismatch?: BaseConfigs['onFileTypeMismatch'],
) {
    if (file && acceptedFiles && acceptedFiles !== '*') {
        const acceptedFilesArray = acceptedFiles.split(',')
        const { name: fileName, type: mimeType } = file
        const baseMimeType = mimeType.replace(/\/.*$/, '')
        const extension = mimeType.split('/')[1]

        const isAccepted =
            acceptedFilesArray.includes(extension) ||
            acceptedFilesArray.includes(mimeType) ||
            acceptedFilesArray.includes(`${baseMimeType}/*`) ||
            acceptedFilesArray.some(
                type => type.startsWith('.') && fileName.endsWith(type),
            )

        if (!isAccepted && onFileTypeMismatch)
            onFileTypeMismatch(file, acceptedFiles)

        return isAccepted
    }
    return true
}
